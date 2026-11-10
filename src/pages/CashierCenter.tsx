import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { InpatientDepositCard } from '@/components/inpatient/InpatientDemoPanels';
import {
  confirmCardPayment,
  isPatientsApiEnabled,
  listCardPayments,
  type CardRecord,
} from '@/lib/api/patients';
import {
  confirmBookingPayment,
  listBookingPayments,
} from '@/lib/api/cashier-bookings';
import type { StaffBooking } from '@/lib/api/records-bookings';
import {
  confirmWalkInSalePayment,
  listCashierPharmacySales,
  walkInCustomerName,
  isWalkInSalesApiEnabled,
  type ApiWalkInSale,
} from '@/lib/api/walk-in-sales';
import {
  confirmPrescriptionPayment,
  listCashierPrescriptions,
  isPrescriptionsApiEnabled,
  type ApiPrescription,
} from '@/lib/api/prescriptions';
import {
  confirmLabRequestPayment,
  listCashierLabRequests,
  isLaboratoryApiEnabled,
  type ApiLabRequest,
} from '@/lib/api/laboratory';
import {
  confirmImagingRequestPayment,
  imagingPatientName,
  isImagingApiEnabled,
  listCashierImagingRequests,
  type ApiImagingRequest,
} from '@/lib/api/imaging';
import {
  admissionBillPatientName,
  confirmAdmissionBillPayment,
  isAdmissionBillsApiEnabled,
  listCashierAdmissionBills,
  type ApiAdmissionBill,
} from '@/lib/api/admission-bills';
import {
  clearDischargePayment,
  dischargePatientName,
  getDischargeDraft,
  isDischargeApiEnabled,
  listDischargeDrafts,
  type ApiDischargeDraft,
} from '@/lib/api/discharge';
import {
  collectPathForBill,
  collectPathForSourceType,
  isCashierBillsApiEnabled,
  listCashierBills,
  type CashierBillRow,
  type CashierBillsMode,
} from '@/lib/api/cashier-bills';
import {
  approveCashierDiscount,
  approveCashierRefund,
  approveCashierShift,
  closeCashierShift,
  createCashierDiscount,
  createCashierRefund,
  getCashierReports,
  getCashierSettings,
  getCurrentCashierShift,
  getPatientPaymentHistory,
  isCashierOpsApiEnabled,
  listRecentCashierPatients,
  searchCashierPatients,
  type CashierPatientCompact,
  listCashierAudit,
  listCashierDiscounts,
  listCashierReceipts,
  listCashierRefunds,
  listCashierShifts,
  listEligibleDiscountBills,
  openCashierShift,
  rejectCashierDiscount,
  rejectCashierRefund,
  reprintCashierReceipt,
  updateCashierSettings,
  verifyCashierReceipt,
  type CashierAuditRow,
  type CashierAuditStats,
  type CashierCurrentShift,
  type CashierDiscountRow,
  type CashierReceipt,
  type CashierRefundRow,
  type CashierReportsResult,
  type CashierSettings as CashierSettingsData,
  type CashierShiftRow,
  type EligibleDiscountBill,
  type PatientPaymentHistory,
} from '@/lib/api/cashier-ops';
import { ApiError } from '@/lib/api/client';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { DesktopOnlyTable, MobileWorklist, MobileWorklistCard } from '@/components/MobileWorklist';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/database';
import { formatCurrency } from '@/data/dummyData';
import * as cashier from '@/lib/cashier-actions';
import type { PaymentChannel } from '@/data-access/types';
import {
  LayoutDashboard, Receipt, Search, Wallet, RotateCcw, ShieldCheck, Banknote,
  CreditCard, FileText, ClipboardList, BarChart3, History, Settings2, Percent,
  CheckCircle2, Clock, AlertTriangle, Plus, Send, Printer, Landmark, HandCoins,
  Lock, Unlock, X, Loader2, RefreshCw, UserCog, MessageSquare, Calendar,
} from 'lucide-react';

/* ===================================================================== */
const base = '/dashboard/cashier';
export const cashierNav = [
  { label: 'Cashier Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'New Patient Cards', path: `${base}/cards`, icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Online Booking Fees', path: `${base}/bookings`, icon: <Calendar className="h-4 w-4" /> },
  { label: 'Clinical Payments', path: `${base}/pharmacy`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Bills & Payments', path: `${base}/bills`, icon: <Receipt className="h-4 w-4" /> },
  { label: 'Patient Search', path: `${base}/search`, icon: <Search className="h-4 w-4" /> },
  { label: 'Communication', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Patient Wallet', path: `${base}/wallet`, icon: <Wallet className="h-4 w-4" /> },
  { label: 'Refunds & Reversals', path: `${base}/refunds`, icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Discounts & Waivers', path: `${base}/discounts`, icon: <Percent className="h-4 w-4" /> },
  { label: 'NHIS / HMO Co-payment', path: `${base}/copay`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'POS / Transfer Confirm', path: `${base}/confirm`, icon: <Landmark className="h-4 w-4" /> },
  { label: 'Daily Closing', path: `${base}/closing`, icon: <Banknote className="h-4 w-4" /> },
  { label: 'Revenue Reports', path: `${base}/reports`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Receipt Verification', path: `${base}/verify`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Audit Trail', path: `${base}/audit`, icon: <History className="h-4 w-4" /> },
  { label: 'Settings', path: `${base}/settings`, icon: <Settings2 className="h-4 w-4" /> },
  { label: 'My Profile', path: `${base}/profile`, icon: <UserCog className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={cashierNav} title={`Cashier · ${title}`}>
    <DbBootGate>{children}</DbBootGate>
  </DashboardLayout>
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
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);
const toneCls = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200', red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200', blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200', purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] ?? 'bg-muted text-foreground border-border');
const Pill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${toneCls(tone)}`}>{children}</span>
);
const statusTone = (s: string) => {
  const u = (s || '').toUpperCase();
  if (u === 'PAID' || u === 'CAPTURED') return 'green';
  if (u === 'PARTIAL' || u === 'PARTIALLYREFUNDED') return 'amber';
  if (u === 'FAILED' || u === 'REFUNDED') return 'red';
  if (u === 'PENDING') return 'sky';
  return 'blue';
};

const useCashierName = () => { const { user } = useAuth(); return user?.name ?? 'Hafsat Bello'; };

const CHANNELS: PaymentChannel[] = ['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'];

/** Local YYYY-MM-DD for report/audit date filters. */
function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStartYmd(d = new Date()): string {
  return localYmd(new Date(d.getFullYear(), d.getMonth(), 1));
}

function channelAmount(reports: CashierReportsResult | null, channel: string): number {
  return reports?.byChannel.find((c) => c.channel === channel)?.amount ?? 0;
}

/* =====================================================================
   1. DASHBOARD
   ===================================================================== */
export const CashierDashboard = () => {
  const navigate = useNavigate();
  const apiOn = isCashierOpsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<CashierReportsResult | null>(null);
  const [shift, setShift] = useState<CashierCurrentShift | null>(null);
  const [recent, setRecent] = useState<CashierReceipt[]>([]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const today = localYmd();
    try {
      const [rep, shiftRes, receipts] = await Promise.all([
        getCashierReports({ from: today, to: today }),
        getCurrentCashierShift(),
        listCashierReceipts({ limit: 8 }),
      ]);
      setReports(rep);
      setShift(shiftRes.shift);
      setRecent(receipts.items);
    } catch (err) {
      setReports(null);
      setShift(null);
      setRecent([]);
      setError(err instanceof ApiError ? err.message : 'Could not load cashier dashboard');
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = [
    { t: 'Total Revenue Today', v: loading || !reports ? '…' : formatCurrency(reports.kpis.collected), i: Banknote },
    { t: 'Cash Payments', v: loading || !reports ? '…' : formatCurrency(channelAmount(reports, 'Cash')), i: Banknote },
    { t: 'POS Payments', v: loading || !reports ? '…' : formatCurrency(channelAmount(reports, 'POS')), i: CreditCard },
    { t: 'Bank Transfer', v: loading || !reports ? '…' : formatCurrency(channelAmount(reports, 'Transfer')), i: Landmark },
    { t: 'Online Payments', v: loading || !reports ? '…' : formatCurrency(channelAmount(reports, 'Online')), i: CreditCard },
    { t: 'Pending Payments', v: loading || !reports ? '…' : formatCurrency(reports.kpis.outstanding), i: Clock },
    { t: 'Refunds Today', v: loading || !reports ? '…' : formatCurrency(reports.kpis.refunds), i: RotateCcw },
    { t: 'Wallet Payments', v: loading || !reports ? '…' : formatCurrency(channelAmount(reports, 'Wallet')), i: Wallet },
    { t: 'Receipts Today', v: loading || !reports ? '…' : String(reports.kpis.receiptCount), i: Receipt },
  ];

  return (
    <Shell title="Dashboard">
      <Section
        icon={<LayoutDashboard className="h-5 w-5" />}
        title="Cashier Desk"
        desc="Live daily financial activity across all departments."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />
      <InpatientDepositCard />
      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-rose-600">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button>
        </div>
      )}
      <div className="hms-section p-3 mb-5 flex flex-wrap items-center gap-3 justify-between border rounded-xl bg-card">
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${shift ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {shift ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />} Shift {shift ? 'OPEN' : 'CLOSED'}
          </span>
          {shift && <>
            <span className="text-muted-foreground">Cashier: <b className="text-foreground">{shift.cashierLabel}</b></span>
            <span className="text-muted-foreground">Float: <b className="text-foreground">{formatCurrency(shift.openingFloat)}</b></span>
            <span className="text-muted-foreground">Cash expected: <b className="text-emerald-700">{formatCurrency(shift.expectedCash)}</b></span>
          </>}
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate(`${base}/closing`)}>Daily Closing</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={c.v} icon={c.i} />)}
      </div>
      <Card>
        <Section icon={<Receipt className="h-5 w-5" />} title="Recent Transactions" desc="Latest captured payments." />
        {loading ? (
          <div className="flex justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading transactions…
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Patient</TableHead><TableHead>Channel</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {recent.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No transactions yet.</TableCell></TableRow> : recent.map(t => (
                <TableRow key={t.receiptId}>
                  <TableCell className="font-mono text-xs">{t.receiptNo}</TableCell>
                  <TableCell className="font-medium">{t.patientName ?? '—'}</TableCell>
                  <TableCell>{t.channel}</TableCell>
                  <TableCell>{formatCurrency(t.amount)}</TableCell>
                  <TableCell><Pill tone={statusTone(t.status)}>{t.status}</Pill></TableCell>
                  <TableCell className="text-xs">{t.paidAt ? new Date(t.paidAt).toLocaleString() : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </Shell>
  );
};

/* =====================================================================
   2. INVOICE PAYMENT (embedded panel — used by Bills & Payments hub)
   ===================================================================== */
const InvoicePaymentPanel = () => {
  const navigate = useNavigate();
  const apiOn = isCashierOpsApiEnabled();
  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<CashierPatientCompact | null>(null);
  const [sidebarPatients, setSidebarPatients] = useState<CashierPatientCompact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [apiHistory, setApiHistory] = useState<PatientPaymentHistory | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setSidebarPatients([]);
      setSearchError(null);
      return;
    }
    const term = search.trim();
    const loadPatients = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        setSidebarPatients(
          term
            ? await searchCashierPatients(term)
            : await listRecentCashierPatients(10),
        );
      } catch (err) {
        setSidebarPatients([]);
        setSearchError(err instanceof ApiError ? err.message : 'Could not load patients');
      } finally {
        setSearchLoading(false);
      }
    };
    if (!term) {
      void loadPatients();
      return;
    }
    const handle = window.setTimeout(() => void loadPatients(), 350);
    return () => window.clearTimeout(handle);
  }, [apiOn, search]);

  useEffect(() => {
    if (!apiOn || !patientId) {
      setApiHistory(null);
      setHistoryError(null);
      return;
    }
    void (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        setApiHistory(await getPatientPaymentHistory(Number(patientId)));
      } catch (err) {
        setApiHistory(null);
        setHistoryError(err instanceof ApiError ? err.message : 'Could not load outstanding bills');
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [apiOn, patientId]);

  const patientResults = sidebarPatients.map((p) => ({
    id: String(p.personId),
    name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unknown',
    hospitalId: p.hospitalNo ?? '—',
    phone: p.patientPhoneNo ?? '',
    raw: p,
  }));

  const displayName = selectedPatient
    ? [selectedPatient.firstName, selectedPatient.middleName, selectedPatient.lastName].filter(Boolean).join(' ') || 'Unknown'
    : apiHistory?.person
      ? [apiHistory.person.firstName, apiHistory.person.middleName, apiHistory.person.lastName].filter(Boolean).join(' ') || 'Unknown'
      : null;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <Card>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (apiOn) {
                setPatientId(null);
                setSelectedPatient(null);
              }
            }}
            placeholder="Name, hospital #, phone…"
            className="pl-9"
            disabled={!apiOn}
          />
        </div>
        {!apiOn && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).
          </p>
        )}
        {apiOn && !search.trim() && !searchLoading && (
          <p className="text-xs text-muted-foreground mb-2">Recent patients</p>
        )}
        {searchError && <p className="text-sm text-rose-600 mb-2">{searchError}</p>}
        {apiOn && (
          <div className="max-h-[460px] overflow-auto space-y-2">
            {searchLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> {search.trim() ? 'Searching…' : 'Loading patients…'}
              </div>
            )}
            {!searchLoading && patientResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPatientId(p.id);
                  setSelectedPatient(p.raw);
                }}
                className={`w-full text-left p-3 border rounded-lg hover:border-primary/50 transition ${patientId === p.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.phone}</div>
              </button>
            ))}
            {!searchLoading && patientResults.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                {search.trim() ? 'No patients found.' : 'No patients registered yet.'}
              </div>
            )}
          </div>
        )}
      </Card>
      <Card>
        {!apiOn ? (
          <div className="text-sm text-muted-foreground text-center py-16">Connect to the backend to collect payments.</div>
        ) : !patientId ? (
          <div className="text-sm text-muted-foreground text-center py-16">Select a patient to view outstanding bills.</div>
        ) : historyLoading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading outstanding bills…
          </div>
        ) : historyError ? (
          <p className="text-sm text-rose-600 text-center py-16">{historyError}</p>
        ) : apiHistory ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <div className="font-semibold">{displayName}</div>
                <div className="text-xs text-muted-foreground">{apiHistory.person.hospitalNo ?? '—'}</div>
              </div>
              <Pill tone={apiHistory.outstanding > 0 ? 'red' : 'green'}>
                Outstanding {formatCurrency(apiHistory.outstanding)}
              </Pill>
            </div>
            {apiHistory.partialErrors && apiHistory.partialErrors.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-md px-3 py-2 text-sm">
                <p className="font-medium">Some bill sources could not be loaded</p>
                <ul className="list-disc pl-5 mt-1 text-xs">
                  {apiHistory.partialErrors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiHistory.outstandingBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No outstanding bills for this patient.
                    </TableCell>
                  </TableRow>
                ) : (
                  apiHistory.outstandingBills.map((b) => (
                    <TableRow key={`${b.sourceType}-${b.sourceRef}`}>
                      <TableCell className="font-mono text-xs">{b.sourceRef}</TableCell>
                      <TableCell>{b.department}</TableCell>
                      <TableCell>{formatCurrency(b.amount)}</TableCell>
                      <TableCell><Pill tone={statusTone(b.paymentStatus)}>{b.paymentStatus}</Pill></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(collectPathForSourceType(b.sourceType))}
                        >
                          Collect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-16">Select a patient.</div>
        )}
      </Card>
    </div>
  );
};

/** @deprecated Use BillsPaymentsHub — kept for redirects */
export const InvoicePayment = () => (
  <Shell title="Invoice Payment">
    <Section icon={<Receipt className="h-5 w-5" />} title="Invoice Payment & Collection" desc="Search any invoice, then receive full, part, or mixed payment." />
    <InvoicePaymentPanel />
  </Shell>
);

/* =====================================================================
   3. PATIENT PAYMENT SEARCH → HISTORY
   ===================================================================== */
export const PatientPaymentSearch = () => {
  useDbTick();
  const apiOn = isCashierOpsApiEnabled();
  const [q, setQ] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<CashierPatientCompact | null>(null);
  const [sidebarPatients, setSidebarPatients] = useState<CashierPatientCompact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [apiHistory, setApiHistory] = useState<PatientPaymentHistory | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setSidebarPatients([]);
      setSearchError(null);
      return;
    }
    const term = q.trim();
    if (!term) {
      void (async () => {
        setSearchLoading(true);
        setSearchError(null);
        try {
          setSidebarPatients(await listRecentCashierPatients(10));
        } catch (err) {
          setSidebarPatients([]);
          setSearchError(err instanceof ApiError ? err.message : 'Could not load recent patients');
        } finally {
          setSearchLoading(false);
        }
      })();
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        setSearchError(null);
        try {
          setSidebarPatients(await searchCashierPatients(term));
        } catch (err) {
          setSidebarPatients([]);
          setSearchError(err instanceof ApiError ? err.message : 'Could not search patients');
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 350);
    return () => window.clearTimeout(handle);
  }, [apiOn, q]);

  useEffect(() => {
    if (!apiOn || !patientId) {
      setApiHistory(null);
      setHistoryError(null);
      return;
    }
    void (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        setApiHistory(await getPatientPaymentHistory(Number(patientId)));
      } catch (err) {
        setApiHistory(null);
        setHistoryError(err instanceof ApiError ? err.message : 'Could not load payment history');
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [apiOn, patientId]);

  const results = apiOn
    ? sidebarPatients.map(p => ({
        id: String(p.personId),
        name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unknown',
        hospitalId: p.hospitalNo ?? '—',
        phone: p.patientPhoneNo ?? '',
        raw: p,
      }))
    : [];

  const selectedApiPerson = apiOn && patientId
    ? selectedPatient ?? sidebarPatients.find(p => String(p.personId) === patientId) ?? apiHistory?.person ?? null
    : null;

  const displayName = apiOn
    ? selectedApiPerson
      ? [selectedApiPerson.firstName, selectedApiPerson.middleName, selectedApiPerson.lastName].filter(Boolean).join(' ') || 'Unknown'
      : null
    : null;

  const displayHospitalNo = apiOn
    ? (selectedApiPerson?.hospitalNo ?? apiHistory?.person.hospitalNo ?? '—')
    : '—';

  const outstanding = apiOn ? (apiHistory?.outstanding ?? 0) : 0;
  const walletBalance = apiOn ? (apiHistory?.wallet.balance ?? 0) : 0;

  return (
    <Shell title="Patient Search">
      <Section icon={<Search className="h-5 w-5" />} title="Patient Payment Search" desc="Full financial history — invoices, receipts, wallet, refunds, outstanding." />
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => {
                setQ(e.target.value);
                if (apiOn) {
                  setPatientId(null);
                  setSelectedPatient(null);
                }
              }}
              placeholder="Name, hospital #, phone…"
              className="pl-9"
              disabled={!apiOn}
            /></div>
          {!apiOn && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).
            </p>
          )}
          {apiOn && !q.trim() && !searchLoading && (
            <p className="text-xs text-muted-foreground mb-2">Recent patients</p>
          )}
          {searchError && <p className="text-sm text-rose-600 mb-2">{searchError}</p>}
          {apiOn && (
          <div className="max-h-[440px] overflow-auto space-y-2">
            {searchLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> {q.trim() ? 'Searching…' : 'Loading patients…'}
              </div>
            )}
            {!searchLoading && results.slice(0, 30).map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPatientId(p.id);
                  setSelectedPatient(p.raw);
                }}
                className={`w-full text-left p-2 border rounded-lg hover:border-primary/50 ${patientId === p.id ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="font-medium text-sm">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId} · {p.phone}</div>
              </button>
            ))}
            {!searchLoading && q.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No patients found.</p>
            )}
            {!searchLoading && !q.trim() && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No patients registered yet.</p>
            )}
          </div>
          )}
        </Card>
        <Card className="lg:col-span-2">
          {!apiOn ? (
            <div className="text-sm text-muted-foreground text-center py-16">Connect to the backend to view payment history.</div>
          ) : !patientId ? (
            <div className="text-sm text-muted-foreground text-center py-16">Select a patient.</div>
          ) : historyLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading payment history…
            </div>
          ) : historyError ? (
            <p className="text-sm text-rose-600 text-center py-16">{historyError}</p>
          ) : apiOn && apiHistory ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div><div className="font-semibold">{displayName}</div><div className="text-xs text-muted-foreground">{displayHospitalNo}</div></div>
                <div className="flex gap-2">
                  <Pill tone={outstanding > 0 ? 'red' : 'green'}>Outstanding {formatCurrency(outstanding)}</Pill>
                  <Pill tone="sky">Wallet {formatCurrency(walletBalance)}</Pill>
                </div>
              </div>
              {apiHistory.partialErrors && apiHistory.partialErrors.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  Some bill sources could not be loaded: {apiHistory.partialErrors.join('; ')}
                </p>
              )}
              <Tabs defaultValue="invoices">
                <TabsList><TabsTrigger value="invoices">Outstanding</TabsTrigger><TabsTrigger value="receipts">Receipts</TabsTrigger><TabsTrigger value="wallet">Wallet</TabsTrigger><TabsTrigger value="refunds">Refunds</TabsTrigger></TabsList>
                <TabsContent value="invoices">
                  <Table><TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Dept</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>{apiHistory.outstandingBills.map(b => <TableRow key={`${b.sourceType}-${b.sourceRef}`}><TableCell className="font-mono text-xs">{b.sourceRef}</TableCell><TableCell>{b.department}</TableCell><TableCell>{formatCurrency(b.amount)}</TableCell><TableCell><Pill tone={statusTone(b.paymentStatus)}>{b.paymentStatus}</Pill></TableCell></TableRow>)}
                      {apiHistory.outstandingBills.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No outstanding bills.</TableCell></TableRow>}</TableBody></Table>
                </TabsContent>
                <TabsContent value="receipts">
                  <Table><TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Channel</TableHead><TableHead>Amount</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                    <TableBody>{apiHistory.receipts.map(r => <TableRow key={r.receiptNo}><TableCell className="font-mono text-xs">{r.receiptNo}</TableCell><TableCell>{r.channel}</TableCell><TableCell>{formatCurrency(r.amount)}</TableCell><TableCell className="text-xs">{new Date(r.paidAt).toLocaleString()}</TableCell></TableRow>)}
                      {apiHistory.receipts.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No receipts.</TableCell></TableRow>}</TableBody></Table>
                </TabsContent>
                <TabsContent value="wallet">
                  <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Balance</TableHead><TableHead>By</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                    <TableBody>{apiHistory.walletTxns.map((t, i) => <TableRow key={i}><TableCell>{t.kind}</TableCell><TableCell>{formatCurrency(t.amount)}</TableCell><TableCell>{formatCurrency(t.balanceAfter)}</TableCell><TableCell className="text-xs">{t.by}</TableCell><TableCell className="text-xs">{t.at}</TableCell></TableRow>)}
                      {apiHistory.walletTxns.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No wallet activity.</TableCell></TableRow>}</TableBody></Table>
                </TabsContent>
                <TabsContent value="refunds">
                  <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>{apiHistory.refunds.map(r => <TableRow key={r.refundNo}><TableCell className="font-mono text-xs">{r.refundNo}</TableCell><TableCell>{formatCurrency(r.amount)}</TableCell><TableCell>{r.method}</TableCell><TableCell><Pill tone={r.status === 'Paid' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'}>{r.status}</Pill></TableCell></TableRow>)}
                      {apiHistory.refunds.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No refunds.</TableCell></TableRow>}</TableBody></Table>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-16">Select a patient.</div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   NEW PATIENT CARD PAYMENTS — registration cards awaiting confirmation.
   Records opens the card (payment Pending); cashier confirms here, which
   unblocks the Records workflow (triage / consultation).
   ===================================================================== */
export const NewPatientCardPayments = () => {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<CardRecord | null>(null);
  const [channel, setChannel] = useState<PaymentChannel>('Cash');
  const [payRef, setPayRef] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [patientAmount, setPatientAmount] = useState('');
  const [payerLiability, setPayerLiability] = useState('');
  const [authCode, setAuthCode] = useState('');

  const apiOn = isPatientsApiEnabled();

  const load = async (query?: string) => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listCardPayments({ paymentStatus: 'Pending', q: query?.trim() || undefined });
      setCards(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load pending card payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const resetSplitFields = () => {
    setPatientAmount('');
    setPayerLiability('');
    setAuthCode('');
  };

  const doConfirm = async () => {
    if (!picked) return;
    setConfirming(true);
    try {
      const coPay = patientAmount.trim() === '' ? undefined : Number(patientAmount);
      const liability = payerLiability.trim() === '' ? undefined : Number(payerLiability);
      if (coPay != null && (!Number.isFinite(coPay) || coPay < 0)) {
        toast.error('Patient co-pay must be a valid amount');
        return;
      }
      if (liability != null && (!Number.isFinite(liability) || liability < 0)) {
        toast.error('Payer liability must be a valid amount');
        return;
      }
      await confirmCardPayment(picked.cardId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
        patientAmount: coPay,
        payerLiability: liability,
        authCode: authCode.trim() || undefined,
      });
      const collected = coPay ?? picked.totalAmount;
      toast.success(
        `Card ${picked.cardNo} marked as Paid (${formatCurrency(collected)}${
          liability != null ? ` · HMO liability ${formatCurrency(liability)}` : ''
        }) — Records can continue`,
      );
      setPicked(null);
      setPayRef('');
      resetSplitFields();
      await load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const total = cards.reduce((s, c) => s + c.totalAmount, 0);

  return (
    <Shell title="New Patient Cards">
      <Section icon={<CreditCard className="h-5 w-5" />} title="New Patient Card Payments"
        desc="Registration cards opened by Records with payment pending. Confirming payment unblocks the patient's registration workflow."
        action={<Button variant="outline" size="sm" onClick={() => void load(q)}><RotateCcw className="h-4 w-4 mr-1" />Refresh</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending Cards" value={String(cards.length)} icon={Clock} />
        <SummaryCard title="Amount Due" value={formatCurrency(total)} icon={Banknote} />
        <SummaryCard title="Source" value="Records · Patient Entry" icon={ClipboardList} />
      </div>
      <Card>
        <div className="flex gap-2 mb-4">
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search card no / hospital no / name / phone"
            onKeyDown={e => { if (e.key === 'Enter') void load(q); }} />
          <Button variant="outline" onClick={() => void load(q)}><Search className="h-4 w-4 mr-1" />Search</Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Loading pending card payments…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            {error}
            <Button size="sm" variant="outline" onClick={() => void load(q)}>Retry</Button>
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Card No</TableHead><TableHead>Patient</TableHead><TableHead>Hospital No</TableHead><TableHead>Phone</TableHead><TableHead>Reg</TableHead><TableHead>Consult</TableHead><TableHead>Card</TableHead><TableHead>Total</TableHead><TableHead>Opened By</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-10">No pending card payments. New patient registrations will appear here.</TableCell></TableRow>
              ) : cards.map(c => (
                <TableRow key={c.cardId}>
                  <TableCell className="font-mono text-xs">{c.cardNo}</TableCell>
                  <TableCell className="font-medium">{[c.person?.firstName, c.person?.lastName].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{c.person?.hospitalNo || '—'}</TableCell>
                  <TableCell>{c.person?.patientPhoneNo || '—'}</TableCell>
                  <TableCell>{formatCurrency(c.regFee)}</TableCell>
                  <TableCell>{formatCurrency(c.consultFee)}</TableCell>
                  <TableCell>{formatCurrency(c.cardFee)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(c.totalAmount)}</TableCell>
                  <TableCell className="text-xs">{c.createdBy || '—'}</TableCell>
                  <TableCell><Pill tone="sky">PENDING</Pill></TableCell>
                  <TableCell><Button size="sm" onClick={() => { setPicked(c); setChannel('Cash'); setPayRef(''); setPatientAmount(''); setPayerLiability(''); setAuthCode(''); }}>Collect</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!picked} onOpenChange={o => !o && setPicked(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Card Payment</DialogTitle>
            <DialogDescription>
              {picked && <>Card <b className="font-mono">{picked.cardNo}</b> · {[picked.person?.firstName, picked.person?.lastName].filter(Boolean).join(' ')} · <b>{formatCurrency(picked.totalAmount)}</b></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={v => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference (receipt / POS / transfer)</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional reference" />
            </div>
            <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/30">
              <div className="text-xs font-medium text-muted-foreground">HMO / NHIA split (optional)</div>
              <p className="text-[11px] text-muted-foreground">
                Collect only the patient co-pay. Leave blank to collect the full card total as cash/POS.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Patient co-pay (₦)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={patientAmount}
                    onChange={e => setPatientAmount(e.target.value)}
                    placeholder={picked ? String(picked.totalAmount) : 'Full amount'}
                  />
                </div>
                <div>
                  <Label className="text-xs">Payer liability (₦)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={payerLiability}
                    onChange={e => setPayerLiability(e.target.value)}
                    placeholder="HMO share"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Pre-auth code (optional)</Label>
                <Input value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="e.g. AUTH-…" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirm()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   ONLINE BOOKING FEES — service fee for public /appointment bookings
   ===================================================================== */
export const OnlineBookingPayments = () => {
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('bookingId');
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [picked, setPicked] = useState<StaffBooking | null>(null);
  const [channel, setChannel] = useState<PaymentChannel>('Cash');
  const [payRef, setPayRef] = useState('');
  const [confirming, setConfirming] = useState(false);

  const apiOn = isPatientsApiEnabled();

  const load = async (query?: string) => {
    if (!apiOn) {
      setLoading(false);
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listBookingPayments({
        paymentStatus: 'Pending',
        date,
        q: query?.trim() || undefined,
      });
      setBookings(res.items);
      if (deepLinkId) {
        const id = Number(deepLinkId);
        const match = res.items.find((b) => b.bookingId === id);
        if (match) setPicked(match);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load pending booking payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const doConfirm = async () => {
    if (!picked) return;
    setConfirming(true);
    try {
      const paid = await confirmBookingPayment(picked.bookingId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(
        `Booking ${paid.bookingNo} marked Paid (${formatCurrency(paid.collectedAmount)}) — Records can check in`,
      );
      setPicked(null);
      setPayRef('');
      await load(q);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm booking payment');
    } finally {
      setConfirming(false);
    }
  };

  const total = bookings.reduce((s, b) => s + (b.amountDue || 0), 0);

  return (
    <Shell title="Online Booking Fees">
      <Section
        icon={<Calendar className="h-5 w-5" />}
        title="Online Appointment Service Fees"
        desc="Service fees from public online bookings. NEW patients also pay registration/card on New Patient Cards. Confirming unlocks Records check-in for returning patients."
        action={
          <Button variant="outline" size="sm" onClick={() => void load(q)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending Bookings" value={String(bookings.length)} icon={Clock} />
        <SummaryCard title="Amount Due" value={formatCurrency(total)} icon={Banknote} />
        <SummaryCard title="Source" value="Public /appointment" icon={ClipboardList} />
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search booking no / name / phone / hospital no"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(q);
            }}
            className="flex-1 min-w-[200px]"
          />
          <Button variant="outline" onClick={() => void load(q)}>
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Loading pending booking payments…
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            {error}
            <Button size="sm" variant="outline" onClick={() => void load(q)}>
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Card pay</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No pending online booking fees for this date.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow
                    key={b.bookingId}
                    className={
                      deepLinkId && String(b.bookingId) === deepLinkId
                        ? 'bg-primary/5'
                        : undefined
                    }
                  >
                    <TableCell className="font-mono text-xs">{b.bookingNo}</TableCell>
                    <TableCell className="font-medium">
                      {b.patientName}
                      <div className="text-xs text-muted-foreground font-normal">
                        {b.phone}
                        {b.hospitalNo ? ` · ${b.hospitalNo}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>{b.patientType}</TableCell>
                    <TableCell>
                      {b.serviceName}
                      {b.patientType === 'NEW' ? (
                        <div className="text-[10px] text-muted-foreground">Service fee only</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.appointmentDate} {b.startTime}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(b.amountDue)}</TableCell>
                    <TableCell className="text-xs">{b.cardPaymentStatus || '—'}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setPicked(b)}>
                        Collect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm booking payment</DialogTitle>
            <DialogDescription>
              {picked
                ? `${picked.bookingNo} · ${picked.patientName} · ${formatCurrency(picked.amountDue)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {picked && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {picked.patientType === 'NEW'
                  ? 'Collects the appointment service fee only. Registration/card fees are on New Patient Cards.'
                  : 'Collects the appointment service fee for this returning patient.'}
              </div>
              <div>
                <Label>Payment channel</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(
                      (c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="POS / transfer ref" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>
              Cancel
            </Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirm()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   CLINICAL PAYMENTS — walk-in OTC + Rx + lab + admission package
   ===================================================================== */
type ClinicalPayTab = 'walkin' | 'rx' | 'lab' | 'admission' | 'imaging' | 'discharge';

export const PharmacyWalkInPayments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: ClinicalPayTab =
    tabParam === 'rx' || tabParam === 'lab' || tabParam === 'walkin' || tabParam === 'admission' || tabParam === 'imaging' || tabParam === 'discharge'
      ? tabParam
      : 'walkin';
  const [tab, setTab] = useState<ClinicalPayTab>(initialTab);
  const [sales, setSales] = useState<ApiWalkInSale[]>([]);
  const [rxList, setRxList] = useState<ApiPrescription[]>([]);
  const [labList, setLabList] = useState<ApiLabRequest[]>([]);
  const [admList, setAdmList] = useState<ApiAdmissionBill[]>([]);
  const [imgList, setImgList] = useState<ApiImagingRequest[]>([]);
  const [dischargeList, setDischargeList] = useState<ApiDischargeDraft[]>([]);
  const [aggCount, setAggCount] = useState(0);
  const [aggAmount, setAggAmount] = useState(0);
  const [aggLoading, setAggLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [pickedSale, setPickedSale] = useState<ApiWalkInSale | null>(null);
  const [pickedRx, setPickedRx] = useState<ApiPrescription | null>(null);
  const [pickedLab, setPickedLab] = useState<ApiLabRequest | null>(null);
  const [pickedAdm, setPickedAdm] = useState<ApiAdmissionBill | null>(null);
  const [pickedImg, setPickedImg] = useState<ApiImagingRequest | null>(null);
  const [pickedDischarge, setPickedDischarge] = useState<ApiDischargeDraft | null>(null);
  const [channel, setChannel] = useState<PaymentChannel>('Cash');
  const [payRef, setPayRef] = useState('');
  const [confirming, setConfirming] = useState(false);
  const walkInOn = isWalkInSalesApiEnabled();
  const rxOn = isPrescriptionsApiEnabled();
  const labOn = isLaboratoryApiEnabled();
  const admOn = isAdmissionBillsApiEnabled();
  const imgOn = isImagingApiEnabled();
  const dischargeOn = isDischargeApiEnabled();

  useEffect(() => {
    const next = searchParams.get('tab');
    if (next === 'rx' || next === 'lab' || next === 'walkin' || next === 'admission' || next === 'imaging' || next === 'discharge') setTab(next);
  }, [searchParams]);

  const selectTab = (next: ClinicalPayTab) => {
    setTab(next);
    setSearchParams(next === 'walkin' ? {} : { tab: next }, { replace: true });
  };

  const loadWalkIn = async (query?: string) => {
    if (!walkInOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierPharmacySales({
        paymentStatus: 'Unpaid',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setSales(data.items ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load pharmacy walk-in sales');
    } finally {
      setLoading(false);
    }
  };

  const loadRx = async (query?: string) => {
    if (!rxOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierPrescriptions({
        paymentStatus: 'Unpaid,Emergency',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setRxList(data.items ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load prescription bills');
    } finally {
      setLoading(false);
    }
  };

  const loadLab = async (query?: string) => {
    if (!labOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierLabRequests({
        paymentStatus: 'Unpaid',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setLabList(data.items ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load lab request bills';
      const hint =
        /SOURCE|column|P2022|does not exist/i.test(msg)
          ? ' — apply migration 20260720140000_lab_request_source (prisma migrate deploy) then redeploy.'
          : '';
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmission = async (query?: string) => {
    if (!admOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierAdmissionBills({
        paymentStatus: 'Unpaid',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setAdmList(data.items ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load admission bills';
      const hint =
        /ADMISSION_BILLS|P2022|does not exist/i.test(msg)
          ? ' — apply migration 20260721120000_admission_billing (prisma migrate deploy) then redeploy.'
          : '';
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  };

  const loadImaging = async (query?: string) => {
    if (!imgOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierImagingRequests({
        paymentStatus: 'Unpaid',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setImgList(data.items ?? []);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not load imaging request bills';
      const hint =
        /IMAGING_REQUESTS|P2022|does not exist/i.test(msg)
          ? ' — apply migration 20260721170000_imaging_requests (prisma migrate deploy) then redeploy.'
          : '';
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  };

  const loadDischarge = async (query?: string) => {
    if (!dischargeOn) {
      setError('Backend API is not configured (VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listDischargeDrafts({
        status: 'AwaitingPayment,Submitted',
        q: query?.trim() || undefined,
        limit: 100,
      });
      setDischargeList(data.items ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load discharge clearance queue');
    } finally {
      setLoading(false);
    }
  };

  const loadAggregate = useCallback(async () => {
    setAggLoading(true);
    try {
      const settled = await Promise.allSettled([
        walkInOn ? listCashierPharmacySales({ paymentStatus: 'Unpaid', limit: 100 }) : Promise.resolve({ items: [] as ApiWalkInSale[] }),
        rxOn ? listCashierPrescriptions({ paymentStatus: 'Unpaid,Emergency', limit: 100 }) : Promise.resolve({ items: [] as ApiPrescription[] }),
        labOn ? listCashierLabRequests({ paymentStatus: 'Unpaid', limit: 100 }) : Promise.resolve({ items: [] as ApiLabRequest[] }),
        imgOn ? listCashierImagingRequests({ paymentStatus: 'Unpaid', limit: 100 }) : Promise.resolve({ items: [] as ApiImagingRequest[] }),
        admOn ? listCashierAdmissionBills({ paymentStatus: 'Unpaid', limit: 100 }) : Promise.resolve({ items: [] as ApiAdmissionBill[] }),
        dischargeOn
          ? listDischargeDrafts({ status: 'AwaitingPayment,Submitted', limit: 100 })
          : Promise.resolve({ items: [] as ApiDischargeDraft[] }),
      ]);
      let count = 0;
      let amount = 0;
      const salesRes = settled[0].status === 'fulfilled' ? settled[0].value.items ?? [] : [];
      const rxRes = settled[1].status === 'fulfilled' ? settled[1].value.items ?? [] : [];
      const labRes = settled[2].status === 'fulfilled' ? settled[2].value.items ?? [] : [];
      const imgRes = settled[3].status === 'fulfilled' ? settled[3].value.items ?? [] : [];
      const admRes = settled[4].status === 'fulfilled' ? settled[4].value.items ?? [] : [];
      const disRes = settled[5].status === 'fulfilled' ? settled[5].value.items ?? [] : [];
      count += salesRes.length + rxRes.length + labRes.length + imgRes.length + admRes.length + disRes.length;
      amount += salesRes.reduce((s, c) => s + c.total, 0);
      amount += rxRes.reduce((s, c) => s + c.total, 0);
      amount += labRes.reduce((s, c) => s + c.totalAmount, 0);
      amount += imgRes.reduce((s, c) => s + c.totalAmount, 0);
      amount += admRes.reduce((s, c) => s + c.totalAmount, 0);
      amount += disRes.reduce(
        (s, d) =>
          s +
          (d.payment?.items ?? [])
            .filter((i) => !['Paid', 'Waived'].includes(i.paymentStatus))
            .reduce((a, i) => a + (i.amount ?? 0), 0),
        0,
      );
      setAggCount(count);
      setAggAmount(amount);
    } catch {
      /* keep previous aggregate */
    } finally {
      setAggLoading(false);
    }
  }, [walkInOn, rxOn, labOn, imgOn, admOn, dischargeOn]);

  const refresh = (query?: string) => {
    if (tab === 'walkin') void loadWalkIn(query);
    else if (tab === 'rx') void loadRx(query);
    else if (tab === 'lab') void loadLab(query);
    else if (tab === 'imaging') void loadImaging(query);
    else if (tab === 'discharge') void loadDischarge(query);
    else void loadAdmission(query);
    void loadAggregate();
  };

  useEffect(() => { refresh(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tab]);
  useEffect(() => { void loadAggregate(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const doConfirmSale = async () => {
    if (!pickedSale) return;
    setConfirming(true);
    try {
      await confirmWalkInSalePayment(pickedSale.saleId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(`${pickedSale.saleNo} marked Paid (${formatCurrency(pickedSale.total)}) — pharmacy can dispense`);
      setPickedSale(null);
      setPayRef('');
      await loadWalkIn(q);
      void loadAggregate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const doConfirmRx = async () => {
    if (!pickedRx) return;
    setConfirming(true);
    try {
      await confirmPrescriptionPayment(pickedRx.prescriptionId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(`${pickedRx.rxNo} marked Paid (${formatCurrency(pickedRx.total)})`);
      setPickedRx(null);
      setPayRef('');
      await loadRx(q);
      void loadAggregate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const doConfirmLab = async () => {
    if (!pickedLab) return;
    setConfirming(true);
    try {
      await confirmLabRequestPayment(pickedLab.labRequestId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(`${pickedLab.requestNo} marked Paid (${formatCurrency(pickedLab.totalAmount)})`);
      setPickedLab(null);
      setPayRef('');
      await loadLab(q);
      void loadAggregate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const doConfirmAdm = async () => {
    if (!pickedAdm) return;
    setConfirming(true);
    try {
      await confirmAdmissionBillPayment(pickedAdm.admissionBillId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(`${pickedAdm.billNo} marked Paid (${formatCurrency(pickedAdm.totalAmount)})`);
      setPickedAdm(null);
      setPayRef('');
      await loadAdmission(q);
      void loadAggregate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const doConfirmImg = async () => {
    if (!pickedImg) return;
    setConfirming(true);
    try {
      await confirmImagingRequestPayment(pickedImg.imagingRequestId, {
        paymentChannel: channel,
        paymentRef: payRef.trim() || undefined,
      });
      toast.success(`${pickedImg.requestNo} marked Paid (${formatCurrency(pickedImg.totalAmount)}) — radiology unlocked`);
      setPickedImg(null);
      setPayRef('');
      await loadImaging(q);
      void loadAggregate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm payment');
    } finally {
      setConfirming(false);
    }
  };

  const rxName = (rx: ApiPrescription) =>
    [rx.person?.firstName, rx.person?.lastName].filter(Boolean).join(' ') || 'Unknown';

  const labName = (r: ApiLabRequest) =>
    [r.person?.firstName, r.person?.lastName].filter(Boolean).join(' ') || 'Unknown';

  const dischargeDue = (d: ApiDischargeDraft) =>
    (d.payment?.items ?? [])
      .filter((i) => !['Paid', 'Waived'].includes(i.paymentStatus))
      .reduce((a, i) => a + (i.amount ?? 0), 0);

  const sourceLabel =
    tab === 'walkin' ? 'Walk-In'
      : tab === 'rx' ? 'Prescriptions'
        : tab === 'lab' ? 'Lab'
          : tab === 'imaging' ? 'Imaging'
            : tab === 'discharge' ? 'Discharge'
              : 'Admission';

  const total =
    tab === 'walkin'
      ? sales.reduce((s, c) => s + c.total, 0)
      : tab === 'rx'
        ? rxList.reduce((s, c) => s + c.total, 0)
        : tab === 'lab'
          ? labList.reduce((s, c) => s + c.totalAmount, 0)
          : tab === 'imaging'
            ? imgList.reduce((s, c) => s + c.totalAmount, 0)
            : tab === 'discharge'
              ? dischargeList.reduce((s, d) => s + dischargeDue(d), 0)
              : admList.reduce((s, c) => s + c.totalAmount, 0);
  const count =
    tab === 'walkin' ? sales.length
      : tab === 'rx' ? rxList.length
        : tab === 'lab' ? labList.length
          : tab === 'imaging' ? imgList.length
            : tab === 'discharge' ? dischargeList.length
              : admList.length;

  return (
    <Shell title="Clinical Payments">
      <Section
        icon={<ClipboardList className="h-5 w-5" />}
        title="Clinical Payments"
        desc="Collect payment for walk-in OTC, prescriptions, lab, imaging, and admission packages (totals only — no price editing)."
        action={<Button variant="outline" size="sm" onClick={() => refresh(q)} disabled={loading || aggLoading}><RotateCcw className={`h-4 w-4 mr-1 ${(loading || aggLoading) ? 'animate-spin' : ''}`} />Refresh</Button>}
      />
      <Tabs value={tab} onValueChange={(v) => selectTab(v as ClinicalPayTab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="walkin">Walk-In OTC</TabsTrigger>
          <TabsTrigger value="rx">Doctor Prescriptions</TabsTrigger>
          <TabsTrigger value="lab">Lab Requests</TabsTrigger>
          <TabsTrigger value="imaging">Imaging</TabsTrigger>
          <TabsTrigger value="admission">Admission</TabsTrigger>
          <TabsTrigger value="discharge">Discharge Clearance</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="All Queues Awaiting" value={aggLoading ? '…' : String(aggCount)} icon={Clock} />
        <SummaryCard title="All Queues Due" value={aggLoading ? '…' : formatCurrency(aggAmount)} icon={Banknote} />
        <SummaryCard title={`${sourceLabel} Awaiting`} value={loading ? '…' : String(count)} icon={Clock} />
        <SummaryCard title={`${sourceLabel} Amount`} value={loading ? '…' : formatCurrency(total)} icon={Banknote} />
        <SummaryCard title="Active Tab" value={sourceLabel} icon={ClipboardList} />
      </div>
      <Card>
        <div className="flex gap-2 mb-4">
          <Input
            className="h-10 w-full flex-1"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={
              tab === 'walkin'
                ? 'Search sale no / name / phone'
                : tab === 'rx'
                  ? 'Search Rx no / hospital no / name'
                  : tab === 'lab'
                    ? 'Search request no / hospital no / name'
                    : 'Search bill no / hospital no / name'
            }
            onKeyDown={e => { if (e.key === 'Enter') refresh(q); }}
          />
          <Button className="h-10 min-w-10" variant="outline" onClick={() => refresh(q)}><Search className="h-4 w-4 mr-1" />Search</Button>
        </div>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-rose-600 flex flex-col items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            {error}
            <Button size="sm" variant="outline" onClick={() => refresh(q)}>Retry</Button>
          </div>
        ) : tab === 'walkin' ? (
          <>
          <MobileWorklist>
            {sales.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">No unpaid pharmacy walk-in sales.</div> : sales.map(s => (
              <MobileWorklistCard
                key={s.saleId}
                title={`${walkInCustomerName(s.person)} · ${s.saleNo}`}
                subtitle={`${s.person?.hospitalNo ?? '—'} · ${s.person?.phone ?? '—'}`}
                meta={<div className="text-xs">{s.items.map(i => `${i.drugName}×${i.quantity}`).join(', ')}</div>}
                status={<Pill tone="blue">{formatCurrency(s.total)}</Pill>}
                actions={<Button size="sm" className="h-10" onClick={() => { setPickedSale(s); setChannel((s.paymentChannel as PaymentChannel) || 'Cash'); setPayRef(''); }}>Collect</Button>}
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No unpaid pharmacy walk-in sales.
                  </TableCell>
                </TableRow>
              ) : sales.map(s => (
                <TableRow key={s.saleId}>
                  <TableCell className="font-mono text-xs">{s.saleNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{walkInCustomerName(s.person)}</div>
                    <div className="text-xs text-muted-foreground">{s.person?.hospitalNo ?? '—'} · {s.person?.phone ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{s.items.map(i => `${i.drugName}×${i.quantity}`).join(', ')}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(s.total)}</TableCell>
                  <TableCell className="text-xs">{s.paymentChannel ?? '—'}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => {
                      setPickedSale(s);
                      setChannel((s.paymentChannel as PaymentChannel) || 'Cash');
                      setPayRef('');
                    }}>Collect</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        ) : tab === 'rx' ? (
          <>
          <MobileWorklist>
            {rxList.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">No unpaid or emergency prescription bills.</div> : rxList.map(rx => (
              <MobileWorklistCard
                key={rx.prescriptionId}
                title={`${rxName(rx)} · ${rx.rxNo}`}
                subtitle={rx.person?.hospitalNo ?? '—'}
                meta={`${rx.status}${rx.emergencyReceivedBy ? ` · recv: ${rx.emergencyReceivedBy}` : ''}`}
                status={<Pill tone="blue">{formatCurrency(rx.total)}</Pill>}
                actions={<Button size="sm" className="h-10" onClick={() => { setPickedRx(rx); setChannel('Cash'); setPayRef(''); }}>Collect</Button>}
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rx #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rxList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No unpaid or emergency prescription bills.
                  </TableCell>
                </TableRow>
              ) : rxList.map(rx => (
                <TableRow key={rx.prescriptionId}>
                  <TableCell className="font-mono text-xs">{rx.rxNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{rxName(rx)}</div>
                    <div className="text-xs text-muted-foreground">{rx.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs">{rx.status}{rx.emergencyReceivedBy ? ` · recv: ${rx.emergencyReceivedBy}` : ''}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(rx.total)}</TableCell>
                  <TableCell className="text-xs">{rx.paymentStatus}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => {
                      setPickedRx(rx);
                      setChannel('Cash');
                      setPayRef('');
                    }}>Collect</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        ) : tab === 'lab' ? (
          <>
          <MobileWorklist>
            {labList.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">No unpaid lab requests.</div> : labList.map(r => (
              <MobileWorklistCard
                key={r.labRequestId}
                title={`${labName(r)} · ${r.requestNo}`}
                subtitle={r.person?.hospitalNo ?? '—'}
                meta={r.items.map(i => i.testCode).join(', ')}
                status={<Pill tone="blue">{formatCurrency(r.totalAmount)}</Pill>}
                actions={<Button size="sm" className="h-10" onClick={() => { setPickedLab(r); setChannel('Cash'); setPayRef(''); }}>Collect</Button>}
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {labList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No unpaid lab requests.
                  </TableCell>
                </TableRow>
              ) : labList.map(r => (
                <TableRow key={r.labRequestId}>
                  <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{labName(r)}</div>
                    <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{r.items.map(i => i.testCode).join(', ')}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.totalAmount)}</TableCell>
                  <TableCell className="text-xs">{r.paymentStatus}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => {
                      setPickedLab(r);
                      setChannel('Cash');
                      setPayRef('');
                    }}>Collect</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        ) : tab === 'imaging' ? (
          <>
          <MobileWorklist>
            {imgList.length === 0 ? <div className="text-center py-10 text-muted-foreground text-sm">No unpaid imaging requests.</div> : imgList.map((r) => (
              <MobileWorklistCard
                key={r.imagingRequestId}
                title={`${imagingPatientName(r.person)} · ${r.requestNo}`}
                subtitle={r.person?.hospitalNo ?? '—'}
                meta={r.items.map((i) => i.studyCode).join(', ')}
                status={<Pill tone="blue">{formatCurrency(r.totalAmount)}</Pill>}
                actions={<Button size="sm" className="h-10" onClick={() => { setPickedImg(r); setChannel('Cash'); setPayRef(''); }}>Collect</Button>}
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Studies</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {imgList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No unpaid imaging requests.
                  </TableCell>
                </TableRow>
              ) : imgList.map((r) => (
                <TableRow key={r.imagingRequestId}>
                  <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{imagingPatientName(r.person)}</div>
                    <div className="text-xs text-muted-foreground">{r.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">
                    {r.items.map((i) => i.studyCode).join(', ')}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.totalAmount)}</TableCell>
                  <TableCell className="text-xs">{r.paymentStatus}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => {
                      setPickedImg(r);
                      setChannel('Cash');
                      setPayRef('');
                    }}>Collect</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        ) : tab === 'admission' ? (
          <>
          <MobileWorklist>
            {admList.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No unpaid admission bills.</div>
            ) : admList.map((a) => (
              <MobileWorklistCard
                key={a.admissionBillId}
                title={`${admissionBillPatientName(a.person)} · ${a.billNo}`}
                subtitle={a.person?.hospitalNo ?? '—'}
                meta={a.lines.map((l) => l.description).join(', ') || 'Package'}
                status={<Pill tone="blue">{formatCurrency(a.totalAmount)}</Pill>}
                actions={
                  <Button
                    size="sm"
                    className="h-10"
                    onClick={() => {
                      setPickedAdm(a);
                      setChannel('Cash');
                      setPayRef('');
                    }}
                  >
                    Collect
                  </Button>
                }
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {admList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No unpaid admission bills.
                  </TableCell>
                </TableRow>
              ) : admList.map(a => (
                <TableRow key={a.admissionBillId}>
                  <TableCell className="font-mono text-xs">{a.billNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{admissionBillPatientName(a.person)}</div>
                    <div className="text-xs text-muted-foreground">{a.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">
                    {a.lines.map(l => l.description).join(', ') || 'Package'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(a.totalAmount)}</TableCell>
                  <TableCell className="text-xs">{a.paymentStatus}</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => {
                      setPickedAdm(a);
                      setChannel('Cash');
                      setPayRef('');
                    }}>Collect</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        ) : (
          <>
          <MobileWorklist>
            {dischargeList.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No discharge drafts awaiting payment clearance.</div>
            ) : dischargeList.map((d) => (
              <MobileWorklistCard
                key={d.draftId}
                title={`${dischargePatientName(d)} · ${d.draftNo}`}
                subtitle={`${d.person?.hospitalNo ?? '—'} · ${d.admission?.ward?.name ?? '—'}`}
                meta={`Unpaid: ${d.payment?.unpaidCount ?? '—'} · ${formatCurrency(dischargeDue(d))}`}
                status={<Pill tone="amber">{d.status}</Pill>}
                actions={
                  <Button
                    size="sm"
                    className="h-10"
                    onClick={() => {
                      void (async () => {
                        try {
                          const full = await getDischargeDraft(d.draftId);
                          setPickedDischarge(full);
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : 'Could not load draft');
                        }
                      })();
                    }}
                  >
                    Review
                  </Button>
                }
              />
            ))}
          </MobileWorklist>
          <DesktopOnlyTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Draft #</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Unpaid</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dischargeList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No discharge drafts awaiting payment clearance.
                  </TableCell>
                </TableRow>
              ) : dischargeList.map((d) => (
                <TableRow key={d.draftId}>
                  <TableCell className="font-mono text-xs">{d.draftNo}</TableCell>
                  <TableCell>
                    <div className="font-medium">{dischargePatientName(d)}</div>
                    <div className="text-xs text-muted-foreground">{d.person?.hospitalNo ?? '—'}</div>
                  </TableCell>
                  <TableCell className="text-xs">{d.admission?.ward?.name ?? '—'}</TableCell>
                  <TableCell className="text-xs">{d.payment?.unpaidCount ?? '—'}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(dischargeDue(d))}</TableCell>
                  <TableCell className="text-xs">{d.status}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        void (async () => {
                          try {
                            const full = await getDischargeDraft(d.draftId);
                            setPickedDischarge(full);
                          } catch (err) {
                            toast.error(err instanceof ApiError ? err.message : 'Could not load draft');
                          }
                        })();
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </DesktopOnlyTable>
          </>
        )}
      </Card>

      <Dialog open={!!pickedDischarge} onOpenChange={(o) => !o && setPickedDischarge(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Discharge payment clearance</DialogTitle>
            <DialogDescription>
              {pickedDischarge?.draftNo} · {pickedDischarge ? dischargePatientName(pickedDischarge) : ''}
            </DialogDescription>
          </DialogHeader>
          {pickedDischarge && (
            <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
              {(pickedDischarge.payment?.items ?? []).length === 0 ? (
                <p className="text-emerald-700">All bills paid — ready to clear.</p>
              ) : (
                (pickedDischarge.payment?.items ?? []).map((i) => (
                  <p key={`${i.source}-${i.id}`} className="text-xs border rounded px-2 py-1">
                    {i.source} · {i.reference} · {i.paymentStatus}
                    {i.amount != null ? ` · ${formatCurrency(i.amount)}` : ''}
                  </p>
                ))
              )}
              <p className="text-xs text-muted-foreground">
                Collect any unpaid items in the other tabs first, then Clear.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedDischarge(null)}>Close</Button>
            <LoadingButton
              loading={confirming}
              disabled={!pickedDischarge?.payment?.cleared}
              onClick={() => {
                if (!pickedDischarge) return;
                setConfirming(true);
                clearDischargePayment(pickedDischarge.draftId)
                  .then(() => {
                    toast.success(`${pickedDischarge.draftNo} payment cleared — Records can finalize`);
                    setPickedDischarge(null);
                    void loadDischarge(q);
                    void loadAggregate();
                  })
                  .catch((err) => {
                    toast.error(err instanceof ApiError ? err.message : 'Clearance failed');
                  })
                  .finally(() => setConfirming(false));
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Clear for Records
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pickedSale} onOpenChange={(o) => !o && setPickedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Walk-In Payment</DialogTitle>
            <DialogDescription>
              {pickedSale?.saleNo} · {walkInCustomerName(pickedSale?.person)} · {formatCurrency(pickedSale?.total ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional POS / transfer ref" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedSale(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirmSale()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pickedRx} onOpenChange={(o) => !o && setPickedRx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Prescription Payment</DialogTitle>
            <DialogDescription>
              {pickedRx?.rxNo} · {pickedRx ? rxName(pickedRx) : ''} · {formatCurrency(pickedRx?.total ?? 0)}
              {pickedRx?.paymentStatus === 'Emergency' ? ' (emergency dispense — collect unpaid bill)' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional POS / transfer ref" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedRx(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirmRx()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pickedLab} onOpenChange={(o) => !o && setPickedLab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Lab Request Payment</DialogTitle>
            <DialogDescription>
              {pickedLab?.requestNo} · {pickedLab ? labName(pickedLab) : ''} · {formatCurrency(pickedLab?.totalAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional POS / transfer ref" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedLab(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirmLab()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pickedImg} onOpenChange={(o) => !o && setPickedImg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Imaging Request Payment</DialogTitle>
            <DialogDescription>
              {pickedImg?.requestNo} · {pickedImg ? imagingPatientName(pickedImg.person) : ''} · {formatCurrency(pickedImg?.totalAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pickedImg && pickedImg.items.length > 0 && (
              <ul className="text-xs space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                {pickedImg.items.map((i) => (
                  <li key={i.itemId} className="flex justify-between gap-2">
                    <span>{i.studyName}</span>
                    <span>{formatCurrency(i.unitPrice)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional POS / transfer ref" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedImg(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirmImg()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pickedAdm} onOpenChange={(o) => !o && setPickedAdm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Admission Payment</DialogTitle>
            <DialogDescription>
              {pickedAdm?.billNo} · {pickedAdm ? admissionBillPatientName(pickedAdm.person) : ''} · {formatCurrency(pickedAdm?.totalAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pickedAdm && pickedAdm.lines.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-auto border rounded p-2">
                {pickedAdm.lines.map((l) => (
                  <li key={l.lineId} className="flex justify-between gap-2">
                    <span>{l.description}</span>
                    <span className="font-medium text-foreground">{formatCurrency(l.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Label>Payment Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as PaymentChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Cash', 'POS Card', 'Bank Transfer', 'Online Card', 'Wallet'] as PaymentChannel[]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Reference</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Optional POS / transfer ref" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickedAdm(null)}>Cancel</Button>
            <LoadingButton loading={confirming} onClick={() => void doConfirmAdm()}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Payment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* ---- live aggregated bill lists (cards + pharmacy + Rx + lab) ---- */
const billStatusTone = (s: string) => {
  const u = s.toUpperCase();
  if (u === 'PAID' || u === 'WAIVED') return 'green';
  if (u === 'EMERGENCY' || u === 'PARTIAL') return 'amber';
  if (u === 'PENDING' || u === 'UNPAID') return 'sky';
  return 'blue';
};

const LiveBillsPage = ({
  title,
  icon,
  desc,
  mode,
  emptyMsg,
  embedded = false,
}: {
  title: string;
  icon: React.ReactNode;
  desc: string;
  mode: CashierBillsMode;
  emptyMsg: string;
  embedded?: boolean;
}) => {
  const navigate = useNavigate();
  const apiOn = isCashierBillsApiEnabled();
  const [items, setItems] = useState<CashierBillRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async () => {
    if (!apiOn) {
      setErrors(['Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).']);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await listCashierBills(mode);
      setItems(result.items);
      setErrors(result.errors);
    } catch (err) {
      setItems([]);
      setErrors([err instanceof ApiError ? err.message : 'Could not load bills']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, apiOn]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((r) =>
      `${r.refNo} ${r.patientName} ${r.hospitalNo ?? ''} ${r.department} ${r.paymentStatus}`
        .toLowerCase()
        .includes(s),
    );
  }, [items, q]);

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);

  const body = (
    <>
      {!embedded && (
        <>
          <Section
            icon={icon}
            title={title}
            desc={desc}
            action={
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <SummaryCard title="Bills" value={String(filtered.length)} icon={FileText} />
            <SummaryCard title="Total Amount" value={formatCurrency(total)} icon={Banknote} />
            <SummaryCard
              title="Patients"
              value={String(new Set(filtered.map((r) => r.patientName)).size)}
              icon={ClipboardList}
            />
          </div>
        </>
      )}
      {embedded && (
        <div className="flex justify-end mb-3">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      )}
      {errors.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
          <p className="text-sm font-medium">Some queues failed to load</p>
          <ul className="text-sm list-disc pl-5 mt-1">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <Button className="mt-2" size="sm" variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </Card>
      )}
      <Card className="mb-4">
        <Input
          className="max-w-md"
          placeholder="Search ref / patient / hospital no…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Card>
      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading bills…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    {emptyMsg}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.refNo}</TableCell>
                    <TableCell className="font-medium">
                      {i.patientName}
                      {i.hospitalNo ? (
                        <span className="block text-xs text-muted-foreground font-normal">{i.hospitalNo}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{i.department}</TableCell>
                    <TableCell>{formatCurrency(i.amount)}</TableCell>
                    <TableCell>
                      <Pill tone={billStatusTone(i.paymentStatus)}>{i.paymentStatus}</Pill>
                    </TableCell>
                    <TableCell>
                      {mode === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => navigate(collectPathForBill(i.kind))}>
                          Collect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );

  if (embedded) return body;
  return <Shell title={title}>{body}</Shell>;
};

const PartPaymentsPanel = ({ onGoPending }: { onGoPending: () => void }) => {
  const navigate = useNavigate();
  return (
    <Card>
      <p className="text-sm text-muted-foreground py-10 text-center">
        No part-paid invoices. Collect outstanding amounts from Pending Bills or Pharmacy &amp; Lab Payments.
        Clinical domain bills (cards, pharmacy, Rx, lab) settle in full at the cashier.
      </p>
      <div className="flex justify-center gap-2 pb-4">
        <Button variant="outline" onClick={onGoPending}>
          Pending Bills
        </Button>
        <Button variant="outline" onClick={() => navigate(`${base}/pharmacy`)}>
          Pharmacy &amp; Lab
        </Button>
      </div>
    </Card>
  );
};

type BillsTab = 'invoice' | 'pending' | 'paid' | 'part';

const BILLS_TABS: BillsTab[] = ['invoice', 'pending', 'paid', 'part'];

export const BillsPaymentsHub = () => {
  useDbTick();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab') || 'invoice';
  const tab: BillsTab = BILLS_TABS.includes(raw as BillsTab) ? (raw as BillsTab) : 'invoice';

  const setTab = (t: BillsTab) => {
    setParams({ tab: t }, { replace: true });
  };

  const apiOn = isCashierBillsApiEnabled();
  const [countsLoading, setCountsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [countErrors, setCountErrors] = useState<string[]>([]);

  const loadCounts = useCallback(async () => {
    if (!apiOn) {
      setPendingCount(0);
      setPaidCount(0);
      setCountErrors([]);
      setCountsLoading(false);
      return;
    }
    setCountsLoading(true);
    try {
      const [pending, paid] = await Promise.all([
        listCashierBills('pending'),
        listCashierBills('paid'),
      ]);
      setPendingCount(pending.items.length);
      setPaidCount(paid.items.length);
      setCountErrors([...new Set([...pending.errors, ...paid.errors])]);
    } catch {
      setPendingCount(0);
      setPaidCount(0);
      setCountErrors(['Could not load bill queue counts']);
    } finally {
      setCountsLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

  const cardVal = (n: number) => (countsLoading ? '…' : String(n));

  return (
    <Shell title="Bills & Payments">
      <Section
        icon={<Receipt className="h-5 w-5" />}
        title="Bills & Payments"
        desc="Invoice collection, pending and paid clinical bills, and part-payment guidance in one place."
        action={
          <Button variant="outline" size="sm" onClick={() => void loadCounts()} disabled={countsLoading}>
            {countsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending" value={cardVal(pendingCount)} icon={Clock} />
        <SummaryCard title="Paid" value={cardVal(paidCount)} icon={CheckCircle2} />
        <SummaryCard title="Part / Balances" value={apiOn ? '0' : '—'} icon={HandCoins} />
        <SummaryCard title="Open Bills" value={cardVal(pendingCount)} icon={FileText} />
      </div>
      {countErrors.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
          <p className="text-sm font-medium">Some queues failed to load</p>
          <ul className="text-sm list-disc pl-5 mt-1">
            {countErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <Button className="mt-2" size="sm" variant="outline" onClick={() => void loadCounts()}>
            Retry
          </Button>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as BillsTab)}>
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="part">Part</TabsTrigger>
        </TabsList>
        <TabsContent value="invoice">
          <InvoicePaymentPanel />
        </TabsContent>
        <TabsContent value="pending">
          <LiveBillsPage
            embedded
            title="Pending Bills"
            icon={<Clock className="h-5 w-5" />}
            desc="Unpaid registration cards, pharmacy walk-ins, prescriptions, lab requests, and admission packages."
            mode="pending"
            emptyMsg="No pending bills."
          />
        </TabsContent>
        <TabsContent value="paid">
          <LiveBillsPage
            embedded
            title="Paid Bills"
            icon={<CheckCircle2 className="h-5 w-5" />}
            desc="Paid or waived bills from registration, pharmacy, prescriptions, laboratory, and admissions."
            mode="paid"
            emptyMsg="No paid bills yet."
          />
        </TabsContent>
        <TabsContent value="part">
          <PartPaymentsPanel onGoPending={() => setTab('pending')} />
        </TabsContent>
      </Tabs>
    </Shell>
  );
};

export const PendingBills = () => (
  <LiveBillsPage
    title="Pending Bills"
    icon={<Clock className="h-5 w-5" />}
    desc="Unpaid registration cards, pharmacy walk-ins, prescriptions, lab requests, and admission packages from the database."
    mode="pending"
    emptyMsg="No pending bills."
  />
);

export const PaidBills = () => (
  <LiveBillsPage
    title="Paid Bills"
    icon={<CheckCircle2 className="h-5 w-5" />}
    desc="Paid or waived bills from registration, pharmacy, prescriptions, laboratory, and admissions."
    mode="paid"
    emptyMsg="No paid bills yet."
  />
);

export const PartPayments = () => {
  const navigate = useNavigate();
  return (
    <Shell title="Part Payments">
      <Section
        icon={<HandCoins className="h-5 w-5" />}
        title="Part Payments"
        desc="Part payments are not used for card, pharmacy, prescription, or lab bills — those settle in full at the cashier."
      />
      <PartPaymentsPanel onGoPending={() => navigate(`${base}/bills?tab=pending`)} />
    </Shell>
  );
};

/* =====================================================================
   7. PATIENT WALLET
   ===================================================================== */
export const PatientWallet = () => {
  useDbTick();
  const cashierName = useCashierName();
  const { run, isBusy } = useAsyncAction();
  const [q, setQ] = useState('');
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentChannel>('Cash');
  const patients = db.patients.list();
  const wallets = db.wallets.list();
  const depositsToday = db.walletTxns
    .list()
    .filter((t) => t.kind === 'DEPOSIT' && (t.at ?? '').slice(0, 10) === localYmd())
    .reduce((s, t) => s + t.amount, 0);
  const results = patients.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.hospitalId.toLowerCase().includes(q.toLowerCase()));
  const selected = patientId ? db.patients.get(patientId) : null;
  const wallet = patientId ? db.wallets.getByPatient(patientId) : null;
  const history = patientId ? cashier.walletHistory(patientId) : [];

  const fund = () => {
    const amt = Number(amount);
    if (!patientId) { notify.error('fund', 'Select a patient'); return; }
    if (!amt || amt <= 0) { notify.error('fund', 'Enter a valid amount'); return; }
    run('fund', `Funding wallet…`, () => cashier.fundWallet(patientId, amt, method, cashierName), r => r.message, r => r.message)
      .then(r => { if (r && r.ok) setAmount(''); });
  };

  return (
    <Shell title="Patient Wallet">
      <Section icon={<Wallet className="h-5 w-5" />} title="Patient Wallet / Deposits" desc="Fund wallets, view balances and transaction history. Wallets pay bills at the desk." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Active Wallets" value={String(wallets.length)} icon={Wallet} />
        <SummaryCard title="Total Wallet Balance" value={formatCurrency(wallets.reduce((s, w) => s + w.balance, 0))} icon={Banknote} />
        <SummaryCard title="Deposits Today" value={formatCurrency(depositsToday)} icon={Plus} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Find patient…" className="pl-9" /></div>
          <div className="max-h-[380px] overflow-auto space-y-2">
            {results.slice(0, 30).map(p => {
              const w = db.wallets.getByPatient(p.id);
              return <button key={p.id} onClick={() => setPatientId(p.id)} className={`w-full text-left p-2 border rounded-lg hover:border-primary/50 ${patientId === p.id ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex justify-between"><span className="font-medium text-sm">{p.name}</span>{w && <Pill tone="sky">{formatCurrency(w.balance)}</Pill>}</div>
                <div className="text-xs text-muted-foreground">{p.hospitalId}</div>
              </button>;
            })}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          {!selected ? <div className="text-sm text-muted-foreground text-center py-16">Select a patient to manage wallet.</div> : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div><div className="font-semibold">{selected.name}</div><div className="text-xs text-muted-foreground">{selected.hospitalId}</div></div>
                <Pill tone="sky">Balance {formatCurrency(wallet?.balance ?? 0)}</Pill>
              </div>
              <div className="grid grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs">Deposit Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div><Label className="text-xs">Method</Label>
                  <Select value={method} onValueChange={v => setMethod(v as PaymentChannel)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['Cash', 'POS Card', 'Bank Transfer', 'Online Card'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <LoadingButton loading={isBusy('fund')} loadingText="Funding…" onClick={fund}><Plus className="h-4 w-4 mr-1" />Fund Wallet</LoadingButton>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Balance</TableHead><TableHead>Method</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
                <TableBody>{history.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No transactions.</TableCell></TableRow> : history.map(t => (
                  <TableRow key={t.id}><TableCell><Pill tone={t.kind === 'DEPOSIT' || t.kind === 'REFUND' ? 'green' : 'amber'}>{t.kind}</Pill></TableCell><TableCell>{formatCurrency(t.amount)}</TableCell><TableCell>{formatCurrency(t.balanceAfter)}</TableCell><TableCell>{t.method ?? '—'}</TableCell><TableCell className="text-xs">{t.at}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   8. REFUNDS & REVERSALS (approval workflow)
   ===================================================================== */
export const RefundsReversals = () => {
  const { user } = useAuth();
  const canApprove = ['superadmin', 'admin', 'finance', 'cmd'].includes(user?.role ?? '');
  const { run, isBusy } = useAsyncAction();
  const apiOn = isCashierOpsApiEnabled();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<CashierReceipt[]>([]);
  const [requests, setRequests] = useState<CashierRefundRow[]>([]);
  const [kpis, setKpis] = useState({ pending: 0, paid: 0, rejected: 0, totalRefunded: 0 });
  const [f, setF] = useState({
    receiptId: '',
    amount: '',
    kind: 'REFUND' as 'REFUND' | 'REVERSAL',
    method: 'Cash' as 'Cash' | 'POS Card' | 'Bank Transfer' | 'Wallet',
    reason: '',
  });

  const selectedReceipt = receipts.find((r) => String(r.receiptId) === f.receiptId);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [refundData, receiptData] = await Promise.all([
        listCashierRefunds({ limit: 100 }),
        listCashierReceipts({ limit: 100 }),
      ]);
      setRequests(refundData.items);
      setKpis(refundData.kpis);
      setReceipts(receiptData.items.filter((r) => r.refundableAmount > 0));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load refunds');
      setRequests([]);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSelectReceipt = (receiptId: string) => {
    const r = receipts.find((x) => String(x.receiptId) === receiptId);
    setF((prev) => ({
      ...prev,
      receiptId,
      amount: r ? String(r.refundableAmount) : '',
    }));
  };

  const submit = () => {
    if (!selectedReceipt) {
      notify.error('refund-req', 'Select a receipt to refund/reverse');
      return;
    }
    const amount = Number(f.amount);
    if (!(amount > 0) || amount > selectedReceipt.refundableAmount + 1e-9) {
      notify.error(
        'refund-req',
        `Amount must be between 0.01 and ${selectedReceipt.refundableAmount.toFixed(2)}`,
      );
      return;
    }
    if (f.reason.trim().length < 3) {
      notify.error('refund-req', 'Reason is required (min 3 characters)');
      return;
    }
    void run(
      'refund-req',
      'Submitting request…',
      async () => {
        await createCashierRefund({
          receiptId: selectedReceipt.receiptId,
          amount,
          kind: f.kind,
          method: f.method,
          reason: f.reason.trim(),
        });
        return { ok: true as const, message: 'Refund request submitted.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) {
        setOpen(false);
        setF({ receiptId: '', amount: '', kind: 'REFUND', method: 'Cash', reason: '' });
        void load();
      }
    });
  };

  const approve = (id: number) =>
    void run(
      `ap-${id}`,
      'Approving…',
      async () => {
        await approveCashierRefund(id);
        return { ok: true as const, message: 'Refund approved and applied.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) void load();
    });

  const reject = (id: number) =>
    void run(
      `rj-${id}`,
      'Rejecting…',
      async () => {
        await rejectCashierRefund(id);
        return { ok: true as const, message: 'Refund rejected.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) void load();
    });

  return (
    <Shell title="Refunds & Reversals">
      <Section
        icon={<RotateCcw className="h-5 w-5" />}
        title="Refunds & Reversals"
        desc="Partial or full refunds against captured payment receipts — finance/admin approval required. Full audit trail."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setOpen(true)} disabled={!apiOn}>
              <Plus className="h-3 w-3 mr-1" />
              New Request
            </Button>
          </div>
        }
      />
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending Approval" value={loading ? '…' : String(kpis.pending)} icon={Clock} />
        <SummaryCard title="Approved / Paid" value={loading ? '…' : String(kpis.paid)} icon={CheckCircle2} />
        <SummaryCard title="Rejected" value={loading ? '…' : String(kpis.rejected)} icon={X} />
        <SummaryCard
          title="Total Refunded"
          value={loading ? '…' : formatCurrency(kpis.totalRefunded)}
          icon={Banknote}
        />
      </div>
      <Card>
        {loading ? (
          <div className="flex justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading refunds…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    No refund requests.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.refundId}>
                    <TableCell className="font-mono text-xs">{r.refundNo}</TableCell>
                    <TableCell className="font-mono text-xs">{r.receiptNo}</TableCell>
                    <TableCell className="font-medium">{r.patientName ?? '—'}</TableCell>
                    <TableCell>{r.kind}</TableCell>
                    <TableCell>{formatCurrency(r.amount)}</TableCell>
                    <TableCell>{r.method}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.reason}</TableCell>
                    <TableCell>
                      <Pill
                        tone={
                          r.status === 'Paid' ? 'green' : r.status === 'Rejected' ? 'red' : 'amber'
                        }
                      >
                        {r.status}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      {r.status === 'Pending' && canApprove && (
                        <div className="flex gap-1">
                          <LoadingButton
                            size="sm"
                            loading={isBusy(`ap-${r.refundId}`)}
                            onClick={() => approve(r.refundId)}
                          >
                            Approve
                          </LoadingButton>
                          <LoadingButton
                            size="sm"
                            variant="ghost"
                            loading={isBusy(`rj-${r.refundId}`)}
                            onClick={() => reject(r.refundId)}
                          >
                            Reject
                          </LoadingButton>
                        </div>
                      )}
                      {r.status === 'Pending' && !canApprove && (
                        <span className="text-xs text-muted-foreground">Awaiting finance</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund / Reversal Request</DialogTitle>
            <DialogDescription>
              Enter a partial or full amount (≤ refundable). Requires finance/admin approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Receipt</Label>
              <Select value={f.receiptId} onValueChange={onSelectReceipt}>
                <SelectTrigger>
                  <SelectValue placeholder="Select receipt" />
                </SelectTrigger>
                <SelectContent>
                  {receipts.map((p) => (
                    <SelectItem key={p.receiptId} value={String(p.receiptId)}>
                      {p.receiptNo} · {p.patientName ?? '—'} · refundable{' '}
                      {formatCurrency(p.refundableAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount (₦)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={f.amount}
                  onChange={(e) => setF({ ...f, amount: e.target.value })}
                  placeholder="Refund amount"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedReceipt}
                  onClick={() =>
                    selectedReceipt &&
                    setF({ ...f, amount: String(selectedReceipt.refundableAmount) })
                  }
                >
                  Full
                </Button>
              </div>
              {selectedReceipt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Max refundable: {formatCurrency(selectedReceipt.refundableAmount)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={f.kind}
                  onValueChange={(v) => setF({ ...f, kind: v as 'REFUND' | 'REVERSAL' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REFUND">Refund</SelectItem>
                    <SelectItem value="REVERSAL">Reversal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Refund To</Label>
                <Select
                  value={f.method}
                  onValueChange={(v) =>
                    setF({
                      ...f,
                      method: v as 'Cash' | 'POS Card' | 'Bank Transfer' | 'Wallet',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Cash', 'POS Card', 'Bank Transfer', 'Wallet'].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Reason *</Label>
              <Textarea
                rows={3}
                value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value })}
                placeholder="Wrong service, duplicate payment, overpayment…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isBusy('refund-req')}
              loadingText="Submitting…"
              onClick={submit}
            >
              Submit Request
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   9. DISCOUNTS & WAIVERS (approval workflow)
   ===================================================================== */
export const DiscountsWaivers = () => {
  const { user } = useAuth();
  const canApprove = ['superadmin', 'admin', 'finance', 'cmd'].includes(user?.role ?? '');
  const { run, isBusy } = useAsyncAction();
  const apiOn = isCashierOpsApiEnabled();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<CashierDiscountRow[]>([]);
  const [eligible, setEligible] = useState<EligibleDiscountBill[]>([]);
  const [kpis, setKpis] = useState({ pending: 0, approved: 0, totalDiscounted: 0 });
  const [f, setF] = useState({
    billKey: '',
    kind: 'PERCENT' as 'PERCENT' | 'FIXED' | 'WAIVER',
    value: '',
    category: 'Percentage',
    reason: '',
  });

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [discData, bills] = await Promise.all([
        listCashierDiscounts({ limit: 100 }),
        listEligibleDiscountBills(),
      ]);
      setRequests(discData.items);
      setKpis(discData.kpis);
      setEligible(bills.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load discounts');
      setRequests([]);
      setEligible([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = () => {
    const bill = eligible.find((b) => `${b.sourceType}:${b.sourceId}` === f.billKey);
    if (!bill) {
      notify.error('disc-req', 'Select an unpaid bill');
      return;
    }
    if (f.reason.trim().length < 3) {
      notify.error('disc-req', 'Reason is required (min 3 characters)');
      return;
    }
    const value = f.kind === 'WAIVER' ? undefined : Number(f.value) || 0;
    if (f.kind !== 'WAIVER' && !(value && value > 0)) {
      notify.error('disc-req', f.kind === 'PERCENT' ? 'Enter a percent' : 'Enter an amount');
      return;
    }
    void run(
      'disc-req',
      'Submitting…',
      async () => {
        await createCashierDiscount({
          sourceType: bill.sourceType,
          sourceId: bill.sourceId,
          discKind: f.kind,
          value,
          category: f.category,
          reason: f.reason.trim(),
        });
        return { ok: true as const, message: 'Discount request submitted.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) {
        setOpen(false);
        setF({ billKey: '', kind: 'PERCENT', value: '', category: 'Percentage', reason: '' });
        void load();
      }
    });
  };

  const approve = (id: number) =>
    void run(
      `da-${id}`,
      'Approving…',
      async () => {
        await approveCashierDiscount(id);
        return { ok: true as const, message: 'Discount approved and applied.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) void load();
    });

  const reject = (id: number) =>
    void run(
      `dr-${id}`,
      'Rejecting…',
      async () => {
        await rejectCashierDiscount(id);
        return { ok: true as const, message: 'Discount rejected.' };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) void load();
    });

  return (
    <Shell title="Discounts & Waivers">
      <Section
        icon={<Percent className="h-5 w-5" />}
        title="Discount, Waiver & Exemption Control"
        desc="Cashiers request against unpaid clinical bills; finance/admin approve. Percentage, fixed, full waiver, staff, welfare, emergency exemption."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button onClick={() => setOpen(true)} disabled={!apiOn}>
              <Plus className="h-3 w-3 mr-1" />
              New Request
            </Button>
          </div>
        }
      />
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Pending" value={loading ? '…' : String(kpis.pending)} icon={Clock} />
        <SummaryCard title="Approved" value={loading ? '…' : String(kpis.approved)} icon={CheckCircle2} />
        <SummaryCard
          title="Total Discounted"
          value={loading ? '…' : formatCurrency(kpis.totalDiscounted)}
          icon={Banknote}
        />
      </div>
      <Card>
        {loading ? (
          <div className="flex justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading discounts…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No discount requests.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => (
                  <TableRow key={r.discountId}>
                    <TableCell className="font-mono text-xs">{r.discountNo}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.sourceRef ?? `${r.sourceType}:${r.sourceId}`}
                    </TableCell>
                    <TableCell className="font-medium">{r.patientName ?? '—'}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{formatCurrency(r.computedAmount)}</TableCell>
                    <TableCell>
                      <Pill
                        tone={
                          r.status === 'Approved'
                            ? 'green'
                            : r.status === 'Rejected'
                              ? 'red'
                              : 'amber'
                        }
                      >
                        {r.status}
                      </Pill>
                    </TableCell>
                    <TableCell>
                      {r.status === 'Pending' && canApprove && (
                        <div className="flex gap-1">
                          <LoadingButton
                            size="sm"
                            loading={isBusy(`da-${r.discountId}`)}
                            onClick={() => approve(r.discountId)}
                          >
                            Approve
                          </LoadingButton>
                          <LoadingButton
                            size="sm"
                            variant="ghost"
                            loading={isBusy(`dr-${r.discountId}`)}
                            onClick={() => reject(r.discountId)}
                          >
                            Reject
                          </LoadingButton>
                        </div>
                      )}
                      {r.status === 'Pending' && !canApprove && (
                        <span className="text-xs text-muted-foreground">Awaiting finance</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discount / Waiver Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Unpaid bill</Label>
              <Select value={f.billKey} onValueChange={(v) => setF({ ...f, billKey: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unpaid bill" />
                </SelectTrigger>
                <SelectContent>
                  {eligible.slice(0, 80).map((i) => (
                    <SelectItem
                      key={`${i.sourceType}:${i.sourceId}`}
                      value={`${i.sourceType}:${i.sourceId}`}
                    >
                      {i.sourceRef} · {i.patientName} · {i.department} ·{' '}
                      {formatCurrency(i.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={f.kind}
                  onValueChange={(v) =>
                    setF({ ...f, kind: v as 'PERCENT' | 'FIXED' | 'WAIVER' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed amount</SelectItem>
                    <SelectItem value="WAIVER">Full waiver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Percentage',
                      'Fixed',
                      'Full Waiver',
                      'Staff',
                      'Welfare',
                      'Emergency Exemption',
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {f.kind !== 'WAIVER' && (
              <div>
                <Label className="text-xs">{f.kind === 'PERCENT' ? 'Percent (%)' : 'Amount (₦)'}</Label>
                <Input
                  type="number"
                  value={f.value}
                  onChange={(e) => setF({ ...f, value: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Reason *</Label>
              <Textarea
                rows={2}
                value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              loading={isBusy('disc-req')}
              loadingText="Submitting…"
              onClick={submit}
            >
              Submit Request
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/* =====================================================================
   10. NHIS / HMO CO-PAYMENT
   ===================================================================== */
export const NhisHmoCopay = () => {
  useDbTick();
  const cashierName = useCashierName();
  const { run, isBusy } = useAsyncAction();
  const [invoiceId, setInvoiceId] = useState('');
  const [scheme, setScheme] = useState<'NHIA' | 'HMO'>('NHIA');
  const [coveragePct, setCoveragePct] = useState('90');
  const [authCode, setAuthCode] = useState('');
  const [copayMethod, setCopayMethod] = useState<PaymentChannel>('Cash');
  const invoices = db.invoices.list().filter(i => i.balance > 0);
  const inv = invoices.find(i => i.invoiceId === invoiceId);
  const covered = inv ? Math.round((inv.balance * Math.max(0, Math.min(100, Number(coveragePct) || 0))) / 100) : 0;
  const copay = inv ? inv.balance - covered : 0;

  const process = () => {
    if (!inv) { notify.error('copay', 'Select an invoice'); return; }
    if (!authCode.trim()) { notify.error('copay', `${scheme} authorization code is required`); return; }
    run('copay', `Processing ${scheme} co-payment…`,
      () => {
        if (covered > 0) {
          const r1 = cashier.collectPayment({ invoiceId: inv.invoiceId, amount: covered, channel: scheme as PaymentChannel, cashier: cashierName, bankRef: authCode });
          if (!r1.ok) return r1;
        }
        if (copay > 0) {
          const r2 = cashier.collectPayment({ invoiceId: inv.invoiceId, amount: copay, channel: copayMethod, cashier: cashierName });
          if (!r2.ok) return r2;
        }
        return { ok: true as const, message: `${scheme} covered ${formatCurrency(covered)}; patient co-pay ${formatCurrency(copay)} via ${copayMethod}. Auth ${authCode}.` };
      },
      r => r.message, r => r.message,
    ).then(r => { if (r && r.ok) { setInvoiceId(''); setAuthCode(''); } });
  };

  return (
    <Shell title="NHIS / HMO Co-payment">
      <Section icon={<ShieldCheck className="h-5 w-5" />} title="NHIS / HMO / Corporate Payment" desc="Split a bill between insurer coverage and patient co-payment, capturing the authorization code." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <div className="space-y-3">
            <div><Label className="text-xs">Invoice</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}><SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>{invoices.slice(0, 40).map(i => <SelectItem key={i.invoiceId} value={i.invoiceId}>{i.invoiceId} · {i.patientName} · Bal {formatCurrency(i.balance)}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Scheme</Label>
                <Select value={scheme} onValueChange={v => setScheme(v as any)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="NHIA">NHIA</SelectItem><SelectItem value="HMO">HMO</SelectItem></SelectContent></Select></div>
              <div><Label className="text-xs">Coverage %</Label><Input type="number" value={coveragePct} onChange={e => setCoveragePct(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Authorization Code *</Label><Input value={authCode} onChange={e => setAuthCode(e.target.value)} placeholder="Approval / auth code" /></div>
            <div><Label className="text-xs">Patient Co-pay Method</Label>
              <Select value={copayMethod} onValueChange={v => setCopayMethod(v as PaymentChannel)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Cash', 'POS Card', 'Bank Transfer', 'Wallet'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <LoadingButton className="w-full" loading={isBusy('copay')} loadingText="Processing…" onClick={process}><ShieldCheck className="h-4 w-4 mr-1.5" />Process Co-payment</LoadingButton>
          </div>
        </Card>
        <Card>
          {!inv ? <div className="text-sm text-muted-foreground text-center py-16">Select an invoice to preview the split.</div> : (
            <div className="space-y-3">
              <div className="font-semibold">{inv.patientName} · {inv.invoiceId}</div>
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Total balance</span><b>{formatCurrency(inv.balance)}</b></div>
                <div className="flex justify-between text-emerald-700"><span>{scheme} covers ({coveragePct}%)</span><b>{formatCurrency(covered)}</b></div>
                <div className="flex justify-between text-rose-600"><span>Patient co-pay</span><b>{formatCurrency(copay)}</b></div>
              </div>
              <p className="text-xs text-muted-foreground">Two receipts are generated — one for the insurer coverage, one for the patient co-payment.</p>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   11. POS / TRANSFER CONFIRMATION
   ===================================================================== */
export const PosTransferConfirm = () => {
  useDbTick();
  const cashierName = useCashierName();
  const unmatched = db.payments.list().filter(p => !p.matched && p.status !== 'FAILED');
  const confirm = (id: string) => {
    const t = db.payments.list().find(p => p.id === id);
    if (!t) return;
    db.payments.update(id, { matched: true });
    db.audit.add({ actor: cashierName, role: 'Cashier', action: `Confirmed ${t.channel} ${t.ref} (₦${t.amount.toLocaleString()})`, entity: 'payment', entityId: id, invoiceRef: t.invoiceId, channel: t.channel });
    toast.success(`${t.channel} payment ${t.ref} confirmed and reconciled.`);
  };
  return (
    <Shell title="POS / Transfer Confirmation">
      <Section icon={<Landmark className="h-5 w-5" />} title="POS / Transfer Confirmation" desc="Match unconfirmed bank transfers and POS settlements against the bank/terminal statement." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Awaiting Confirmation" value={String(unmatched.length)} icon={Clock} />
        <SummaryCard title="Amount Unconfirmed" value={formatCurrency(unmatched.reduce((s, t) => s + t.amount, 0))} icon={AlertTriangle} />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Patient</TableHead><TableHead>Channel</TableHead><TableHead>Ref</TableHead><TableHead>Amount</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {unmatched.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">All transactions reconciled.</TableCell></TableRow> : unmatched.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                <TableCell className="font-medium">{t.patientName}</TableCell>
                <TableCell>{t.channel}</TableCell>
                <TableCell className="text-xs">{t.bankRef ?? t.posTerminal ?? '—'}</TableCell>
                <TableCell>{formatCurrency(t.amount)}</TableCell>
                <TableCell><Button size="sm" onClick={() => confirm(t.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirm</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   12. DAILY CLOSING
   ===================================================================== */
export const DailyClosing = () => {
  const { user } = useAuth();
  const canApprove = ['superadmin', 'admin', 'finance', 'cmd'].includes(user?.role ?? '');
  const { run, isBusy } = useAsyncAction();
  const apiOn = isCashierOpsApiEnabled();
  const [floatAmt, setFloatAmt] = useState('20000');
  const [actualCash, setActualCash] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shift, setShift] = useState<CashierCurrentShift | null>(null);
  const [shifts, setShifts] = useState<CashierShiftRow[]>([]);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [cur, hist] = await Promise.all([
        getCurrentCashierShift(),
        listCashierShifts({ limit: 50 }),
      ]);
      setShift(cur.shift);
      setShifts(hist.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load shifts');
      setShift(null);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = () =>
    void run(
      'open',
      'Opening shift…',
      async () => {
        await openCashierShift(Number(floatAmt) || 0);
        return {
          ok: true as const,
          message: `Shift opened with float ${formatCurrency(Number(floatAmt) || 0)}.`,
        };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) void load();
    });

  const close = () => {
    if (!shift) return;
    const amt = Number(actualCash);
    if (Number.isNaN(amt)) {
      notify.error('close', 'Enter the actual cash counted');
      return;
    }
    void run(
      'close',
      'Closing shift…',
      async () => {
        const res = await closeCashierShift(shift.shiftId, {
          actualCash: amt,
          note: note.trim() || undefined,
        });
        return {
          ok: true as const,
          message: `Shift closed. Variance ${formatCurrency(res.variance)}.`,
        };
      },
      (r) => r.message,
      (r) => r.message,
    ).then((r) => {
      if (r && r.ok) {
        setActualCash('');
        setNote('');
        void load();
      }
    });
  };

  return (
    <Shell title="Daily Closing">
      <Section
        icon={<Banknote className="h-5 w-5" />}
        title="Daily Cashier Closing / End-of-Day"
        desc="Reconcile expected vs actual cash from live receipts, record variance, and submit for supervisor approval."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {loading && !shift ? (
        <div className="flex justify-center gap-2 py-10 text-muted-foreground mb-5">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading shift…
        </div>
      ) : !shift ? (
        <Card className="mb-5">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-xs">Opening Float</Label>
              <Input
                type="number"
                value={floatAmt}
                onChange={(e) => setFloatAmt(e.target.value)}
                className="w-40"
              />
            </div>
            <LoadingButton
              loading={isBusy('open')}
              loadingText="Opening…"
              onClick={open}
              disabled={!apiOn}
            >
              <Unlock className="h-4 w-4 mr-1" />
              Open Shift
            </LoadingButton>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Card>
            <div className="font-semibold mb-3">
              Current Shift — {shift.cashierLabel} ({shift.shiftNo})
            </div>
            <div className="space-y-1.5 text-sm">
              {(
                [
                  ['Opening float', shift.openingFloat],
                  ['Cash', shift.totals.cash],
                  ['POS', shift.totals.pos],
                  ['Transfer', shift.totals.transfer],
                  ['Online', shift.totals.online],
                  ['Wallet', shift.totals.wallet],
                  ['NHIA', shift.totals.nhia],
                  ['HMO', shift.totals.hmo],
                  ['Refunds', -shift.totals.refunds],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span>{formatCurrency(v)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Expected cash at hand</span>
                <span className="text-emerald-700">{formatCurrency(shift.expectedCash)}</span>
              </div>
            </div>
          </Card>
          <Card>
            <div className="font-semibold mb-3">Close Shift</div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Actual Cash Counted</Label>
                <Input
                  type="number"
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                />
              </div>
              {actualCash !== '' && (
                <div className="text-sm">
                  Variance:{' '}
                  <b
                    className={
                      Number(actualCash) - shift.expectedCash === 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }
                  >
                    {formatCurrency(Number(actualCash) - shift.expectedCash)}
                  </b>
                </div>
              )}
              <div>
                <Label className="text-xs">Closing Note</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <LoadingButton
                className="w-full"
                loading={isBusy('close')}
                loadingText="Closing…"
                onClick={close}
              >
                <Lock className="h-4 w-4 mr-1" />
                Close Shift
              </LoadingButton>
            </div>
          </Card>
        </div>
      )}
      <Card>
        <div className="font-semibold text-sm mb-3">Shift History</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift</TableHead>
              <TableHead>Cashier</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No shifts yet.
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((s) => (
                <TableRow key={s.shiftId}>
                  <TableCell className="font-mono text-xs">{s.shiftNo}</TableCell>
                  <TableCell>{s.cashierLabel}</TableCell>
                  <TableCell className="text-xs">
                    {s.openedAt ? new Date(s.openedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {s.expectedCash != null ? formatCurrency(s.expectedCash) : '—'}
                  </TableCell>
                  <TableCell>
                    {s.actualCash != null ? formatCurrency(s.actualCash) : '—'}
                  </TableCell>
                  <TableCell
                    className={
                      s.variance
                        ? s.variance < 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                        : ''
                    }
                  >
                    {s.variance != null ? formatCurrency(s.variance) : '—'}
                  </TableCell>
                  <TableCell>
                    <Pill
                      tone={
                        s.status === 'Approved' ? 'green' : s.status === 'Closed' ? 'amber' : 'sky'
                      }
                    >
                      {s.status}
                    </Pill>
                  </TableCell>
                  <TableCell>
                    {s.status === 'Closed' && canApprove && (
                      <LoadingButton
                        size="sm"
                        loading={isBusy(`sap-${s.shiftId}`)}
                        onClick={() =>
                          void run(
                            `sap-${s.shiftId}`,
                            'Approving…',
                            async () => {
                              await approveCashierShift(s.shiftId);
                              return { ok: true as const, message: 'Shift approved.' };
                            },
                            (r) => r.message,
                            (r) => r.message,
                          ).then((r) => {
                            if (r && r.ok) void load();
                          })
                        }
                      >
                        Approve
                      </LoadingButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   13. REVENUE REPORTS
   ===================================================================== */
export const RevenueReports = () => {
  const apiOn = isCashierOpsApiEnabled();
  const [from, setFrom] = useState(() => monthStartYmd());
  const [to, setTo] = useState(() => localYmd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CashierReportsResult | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getCashierReports({ from, to }));
    } catch (err) {
      setData(null);
      setError(err instanceof ApiError ? err.message : 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, [apiOn, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = data?.kpis;

  return (
    <Shell title="Revenue Reports">
      <Section
        icon={<BarChart3 className="h-5 w-5" />}
        title="Revenue Reports & Analytics"
        desc="Collection from payment receipts, by department and payment method, plus outstanding unpaid bills."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={() => toast.success('Report exported (PDF).')}>
              <Printer className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <Button size="sm" onClick={() => void load()} disabled={loading}>Apply</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setFrom(monthStartYmd());
            setTo(localYmd());
          }}
        >
          Month to date
        </Button>
        <p className="text-xs text-muted-foreground pb-2">
          Period: <b className="text-foreground">{from}</b> → <b className="text-foreground">{to}</b>
        </p>
      </div>
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {data?.partialErrors && data.partialErrors.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
          Some outstanding bill sources could not be loaded: {data.partialErrors.join('; ')}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Collected" value={loading || !kpis ? '…' : formatCurrency(kpis.collected)} icon={Banknote} />
        <SummaryCard title="Outstanding" value={loading || !kpis ? '…' : formatCurrency(kpis.outstanding)} icon={Clock} />
        <SummaryCard title="Refunds" value={loading || !kpis ? '…' : formatCurrency(kpis.refunds)} icon={RotateCcw} />
        <SummaryCard title="Discounted" value={loading || !kpis ? '…' : formatCurrency(kpis.discounted)} icon={Percent} />
      </div>
      {loading ? (
        <div className="flex justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading reports…
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <div className="font-semibold text-sm mb-3">Revenue by Department</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data?.bySource.length ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                        No revenue yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.bySource.map((d) => (
                      <TableRow key={d.department}>
                        <TableCell>{d.department}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
            <Card>
              <div className="font-semibold text-sm mb-3">Revenue by Payment Method</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.byChannel ?? []).map((c) => (
                    <TableRow key={c.channel}>
                      <TableCell>{c.channel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <Card className="mt-5">
            <div className="font-semibold text-sm mb-3">Outstanding unpaid bills</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.outstandingItems.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No outstanding bills.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.outstandingItems.map((i) => (
                    <TableRow key={`${i.sourceType}:${i.sourceId}`}>
                      <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                      <TableCell>{i.patientName}</TableCell>
                      <TableCell>{i.department}</TableCell>
                      <TableCell>{formatCurrency(i.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </Shell>
  );
};

/* =====================================================================
   14. RECEIPT VERIFICATION
   ===================================================================== */
export const ReceiptVerification = () => {
  const { run, isBusy } = useAsyncAction();
  const apiOn = isCashierOpsApiEnabled();
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CashierReceipt | null>(null);

  const verify = async () => {
    if (!ref.trim()) {
      notify.error('verify', 'Enter a receipt number');
      return;
    }
    if (!apiOn) {
      notify.error('verify', 'Backend API is not configured');
      return;
    }
    setBusy(true);
    setError(null);
    setReceipt(null);
    try {
      const res = await verifyCashierReceipt(ref.trim());
      setReceipt(res.receipt);
      toast.success(`Receipt ${res.receipt.receiptNo} is valid.`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Verification failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Receipt Verification">
      <Section
        icon={<ClipboardList className="h-5 w-5" />}
        title="Receipt Verification"
        desc="Verify a receipt by CPR number and record a reprint (watermark) audit event."
      />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <Label className="text-xs">Receipt Number</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. CPR-2026-0001"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void verify();
              }}
            />
            <Button onClick={() => void verify()} disabled={busy || !apiOn}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
              Verify
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Enter the receipt number from the printed slip or QR payload.
          </p>
        </Card>
        <Card>
          {busy ? (
            <div className="flex justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Verifying…
            </div>
          ) : error ? (
            <div className="text-sm text-rose-600 text-center py-12">{error}</div>
          ) : !receipt ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              Enter a receipt number to verify.
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                Valid receipt
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Receipt</div>
                  <div className="font-mono text-xs">{receipt.receiptNo}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Patient</div>
                  <div>{receipt.patientName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div>{formatCurrency(receipt.amount)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Refunded</div>
                  <div>{formatCurrency(receipt.amountRefunded)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Channel</div>
                  <div>{receipt.channel}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div>{receipt.status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cashier</div>
                  <div>{receipt.cashierLabel ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Time</div>
                  <div className="text-xs">{new Date(receipt.paidAt).toLocaleString()}</div>
                </div>
              </div>
              <LoadingButton
                loading={isBusy('reprint')}
                loadingText="Reprinting…"
                onClick={() =>
                  void run(
                    'reprint',
                    'Reprinting…',
                    async () => {
                      const r = await reprintCashierReceipt(receipt.receiptId);
                      return {
                        ok: true as const,
                        message: r.watermark
                          ? `Reprint recorded with watermark for ${r.receiptNo}.`
                          : `Reprint recorded for ${r.receiptNo}.`,
                      };
                    },
                    (r) => r.message,
                    (r) => r.message,
                  )
                }
              >
                <Printer className="h-4 w-4 mr-1" />
                Reprint (watermark)
              </LoadingButton>
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   15. AUDIT TRAIL
   ===================================================================== */
export const CashierAuditTrail = () => {
  const apiOn = isCashierOpsApiEnabled();
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [from, setFrom] = useState(() => localYmd());
  const [to, setTo] = useState(() => localYmd());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CashierAuditRow[]>([]);
  const [stats, setStats] = useState<CashierAuditStats | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCashierAudit({
        q: appliedQ.trim() || undefined,
        limit: 100,
        from,
        to,
      });
      setRows(data.items);
      setStats(data.stats);
    } catch (err) {
      setRows([]);
      setStats(null);
      setError(err instanceof ApiError ? err.message : 'Could not load audit trail');
    } finally {
      setLoading(false);
    }
  }, [apiOn, appliedQ, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const periodLabel = from === to ? from : `${from} → ${to}`;

  return (
    <Shell title="Audit Trail">
      <Section
        icon={<History className="h-5 w-5" />}
        title="Cashier Audit Trail"
        desc="Every payment, refund, discount, shift and settings action is traceable — no hard deletes."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const today = localYmd();
            setFrom(today);
            setTo(today);
          }}
        >
          Today
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title={from === to ? 'Today' : 'Period'} value={loading || !stats ? '…' : String(stats.totalToday)} icon={History} />
        <SummaryCard title="Payments" value={loading || !stats ? '…' : String(stats.payments)} icon={Banknote} />
        <SummaryCard title="Refunds" value={loading || !stats ? '…' : String(stats.refunds)} icon={RotateCcw} />
        <SummaryCard title="Discounts" value={loading || !stats ? '…' : String(stats.discounts)} icon={Percent} />
        <SummaryCard title="Shifts" value={loading || !stats ? '…' : String(stats.shifts)} icon={Lock} />
      </div>
      <p className="text-xs text-muted-foreground mb-3">Showing audit for {periodLabel}</p>
      <Card>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by action or actor…"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setAppliedQ(q);
              }}
            />
          </div>
          <Button variant="outline" onClick={() => setAppliedQ(q)} disabled={loading}>
            Search
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading audit…
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No audit entries.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.auditId}>
                    <TableCell className="text-xs">
                      {a.time ? new Date(a.time).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell className="font-medium">{a.actor}</TableCell>
                    <TableCell>{a.role}</TableCell>
                    <TableCell className="text-sm">{a.action}</TableCell>
                    <TableCell className="font-mono text-xs">{a.entityId ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </Shell>
  );
};

/* =====================================================================
   16. SETTINGS / PAYMENT METHODS
   ===================================================================== */
export const CashierSettings = () => {
  const { user } = useAuth();
  const canUpdate = ['superadmin', 'admin', 'finance', 'cmd'].includes(user?.role ?? '');
  const { run, isBusy } = useAsyncAction();
  const apiOn = isCashierOpsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<CashierSettingsData | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured (VITE_USE_API / VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSettings(await getCashierSettings());
    } catch (err) {
      setSettings(null);
      setError(err instanceof ApiError ? err.message : 'Could not load settings');
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const channels: { key: keyof CashierSettingsData; label: string }[] = [
    { key: 'cashEnabled', label: 'Cash' },
    { key: 'posEnabled', label: 'POS Card' },
    { key: 'bankTransferEnabled', label: 'Bank Transfer' },
    { key: 'onlineCardEnabled', label: 'Online Card' },
    { key: 'walletEnabled', label: 'Wallet' },
    { key: 'nhiaEnabled', label: 'NHIA' },
    { key: 'hmoEnabled', label: 'HMO' },
  ];

  const toggle = (key: keyof CashierSettingsData, label: string, current: boolean) => {
    if (!canUpdate) {
      toast.error('Only finance/admin can update cashier settings.');
      return;
    }
    void run(
      `set-${key}`,
      'Saving…',
      async () => {
        const next = await updateCashierSettings({ [key]: !current } as Partial<CashierSettingsData>);
        setSettings(next);
        return { ok: true as const, message: `${label} ${!current ? 'enabled' : 'disabled'}.` };
      },
      (r) => r.message,
      (r) => r.message,
    );
  };

  return (
    <Shell title="Settings">
      <Section
        icon={<Settings2 className="h-5 w-5" />}
        title="Payment Methods & Settings"
        desc="Hospital-wide payment channels and desk policy. Cashiers can view; finance/admin update."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        }
      />
      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {!canUpdate && (
        <p className="text-xs text-muted-foreground mb-3">View only — ask finance/admin to change settings.</p>
      )}
      {loading || !settings ? (
        <div className="flex justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading settings…
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <div className="font-semibold text-sm mb-3">Payment channels</div>
            <div className="space-y-2">
              {channels.map(({ key, label }) => {
                const on = Boolean(settings[key]);
                return (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">{label}</span>
                    <LoadingButton
                      size="sm"
                      variant={on ? 'default' : 'outline'}
                      loading={isBusy(`set-${key}`)}
                      disabled={!apiOn}
                      onClick={() => toggle(key, label, on)}
                    >
                      {on ? 'Enabled' : 'Disabled'}
                    </LoadingButton>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <div className="font-semibold text-sm mb-3">Desk policy</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Require open shift</span>
                <LoadingButton
                  size="sm"
                  variant={settings.requireOpenShift ? 'default' : 'outline'}
                  loading={isBusy('set-requireOpenShift')}
                  disabled={!apiOn}
                  onClick={() =>
                    toggle('requireOpenShift', 'Require open shift', settings.requireOpenShift)
                  }
                >
                  {settings.requireOpenShift ? 'On' : 'Off'}
                </LoadingButton>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm font-medium">Reprint watermark</span>
                <LoadingButton
                  size="sm"
                  variant={settings.reprintWatermark ? 'default' : 'outline'}
                  loading={isBusy('set-reprintWatermark')}
                  disabled={!apiOn}
                  onClick={() =>
                    toggle('reprintWatermark', 'Reprint watermark', settings.reprintWatermark)
                  }
                >
                  {settings.reprintWatermark ? 'On' : 'Off'}
                </LoadingButton>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs">Variance tolerance (₦)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    defaultValue={settings.varianceTolerance}
                    disabled={!canUpdate || !apiOn}
                    id="variance-tol"
                  />
                  <LoadingButton
                    size="sm"
                    loading={isBusy('set-variance')}
                    disabled={!canUpdate || !apiOn}
                    onClick={() => {
                      const el = document.getElementById('variance-tol') as HTMLInputElement | null;
                      const n = Number(el?.value ?? settings.varianceTolerance);
                      if (Number.isNaN(n) || n < 0) {
                        toast.error('Enter a valid tolerance');
                        return;
                      }
                      void run(
                        'set-variance',
                        'Saving…',
                        async () => {
                          const next = await updateCashierSettings({ varianceTolerance: n });
                          setSettings(next);
                          return { ok: true as const, message: 'Variance tolerance saved.' };
                        },
                        (r) => r.message,
                        (r) => r.message,
                      );
                    }}
                  >
                    Save
                  </LoadingButton>
                </div>
              </div>
              {settings.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Last updated {new Date(settings.updatedAt).toLocaleString()}
                  {settings.updatedBy ? ` by ${settings.updatedBy}` : ''}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </Shell>
  );
};
