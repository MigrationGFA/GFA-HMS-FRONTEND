import { useMemo, useState } from 'react';
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Smartphone, LayoutDashboard, KeyRound, CalendarPlus, Wallet, Receipt, BedDouble, Home,
  Video, Users, PhoneCall, Bell, UserCog, ShieldCheck, Lock, FolderLock, Wifi, Hand,
  LifeBuoy, Sparkles, BarChart3, Plug, CloudCog, Globe, Plus, Send, Download, CheckCircle2,
  AlertTriangle, MessageSquare, QrCode, Fingerprint, Stethoscope, Heart, Brain, Pill,
  RefreshCw, Activity, Eye,
} from 'lucide-react';

const base = '/dashboard/superadmin/portal';
export const portalNavItems = [
  { label: 'Portal Overview', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'OTP Authentication', path: `${base}/auth`, icon: <KeyRound className="h-4 w-4" /> },
  { label: 'Patient Dashboard', path: `${base}/dashboard`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Appointment Booking', path: `${base}/appointments`, icon: <CalendarPlus className="h-4 w-4" /> },
  { label: 'Wallet & Payments', path: `${base}/wallet`, icon: <Wallet className="h-4 w-4" /> },
  { label: 'Invoices & History', path: `${base}/invoices`, icon: <Receipt className="h-4 w-4" /> },
  { label: 'Admission Tracking', path: `${base}/admission`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Accommodation Fees', path: `${base}/accommodation`, icon: <Home className="h-4 w-4" /> },
  { label: 'Telemedicine', path: `${base}/telemedicine`, icon: <Video className="h-4 w-4" /> },
  { label: 'Caregivers', path: `${base}/caregivers`, icon: <Users className="h-4 w-4" /> },
  { label: 'Emergency Contacts', path: `${base}/emergency`, icon: <PhoneCall className="h-4 w-4" /> },
  { label: 'Notifications', path: `${base}/notifications`, icon: <Bell className="h-4 w-4" /> },
  { label: 'Profile Management', path: `${base}/profile`, icon: <UserCog className="h-4 w-4" /> },
  { label: 'Patient Data Restrictions', path: `${base}/restrictions`, icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Confidentiality Layer', path: `${base}/confidentiality`, icon: <Lock className="h-4 w-4" /> },
  { label: 'Legacy EMR Requests', path: `${base}/legacy`, icon: <FolderLock className="h-4 w-4" /> },
  { label: 'Offline / Low-Bandwidth', path: `${base}/offline`, icon: <Wifi className="h-4 w-4" /> },
  { label: 'Mobile UX & PWA', path: `${base}/pwa`, icon: <Hand className="h-4 w-4" /> },
  { label: 'Help Desk & Support', path: `${base}/support`, icon: <LifeBuoy className="h-4 w-4" /> },
  { label: 'AI Patient Assistant', path: `${base}/ai`, icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Engagement Analytics', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'HMS + EMR Integration', path: `${base}/integration`, icon: <Plug className="h-4 w-4" /> },
  { label: 'Cloud & Sync Engine', path: `${base}/cloud`, icon: <CloudCog className="h-4 w-4" /> },
  { label: 'Website Bridge', path: `${base}/web`, icon: <Globe className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={portalNavItems} title={`Patient Portal & PWA · ${title}`}>{children}</DashboardLayout>
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

// ============ 1. PORTAL OVERVIEW ============
export const PortalOverview = () => {
  const widgets = [
    { title: 'Active Patient Accounts', value: '14,820', subtitle: '+312 this week', icon: Smartphone, tone: 'teal' as const },
    { title: 'PWA Installs', value: '6,471', subtitle: '43.6% adoption', icon: Hand, tone: 'blue' as const },
    { title: 'OTP Logins (24h)', value: '1,284', subtitle: '99.1% success', icon: KeyRound, tone: 'green' as const },
    { title: 'Appointments Booked', value: '342', subtitle: 'Today via portal', icon: CalendarPlus, tone: 'purple' as const },
    { title: 'Wallet Balance Total', value: '₦18.4M', subtitle: 'Across all patients', icon: Wallet, tone: 'amber' as const },
    { title: 'Telemedicine Sessions', value: '87', subtitle: 'In progress · waiting', icon: Video, tone: 'indigo' as const },
    { title: 'Push Notifications (24h)', value: '9,210', subtitle: 'Delivered · 96%', icon: Bell, tone: 'rose' as const },
    { title: 'Support Tickets Open', value: '23', subtitle: 'Avg resolution 2h 14m', icon: LifeBuoy, tone: 'teal' as const },
  ];
  return (
    <Shell title="Control Center">
      <Section icon={<LayoutDashboard className="h-6 w-6" />} title="Patient Portal & Mobile PWA"
        desc="GFA Demo Hospital — secure self-service portal, mobile PWA, telemedicine, wallet, caregiver and confidentiality controls." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {widgets.map(w => <SummaryCard key={w.title} {...w} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Real-Time Patient Activity</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>GFA HMS/2026/00145 · OTP login</span><StatusBadge status="Verified" /></li>
            <li className="flex justify-between"><span>GFA HMS/2026/00088 · Wallet fund ₦15,000</span><StatusBadge status="Paid" /></li>
            <li className="flex justify-between"><span>GFA HMS/2026/00231 · Booked OPC</span><StatusBadge status="Confirmed" /></li>
            <li className="flex justify-between"><span>GFA HMS/2026/00012 · Joined telemedicine</span><StatusBadge status="Active" /></li>
            <li className="flex justify-between"><span>GFA HMS/2026/00079 · Support ticket #4421</span><StatusBadge status="Open" /></li>
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Confidentiality Posture</h3>
          <div className="space-y-3 text-sm">
            <div><div className="flex justify-between mb-1"><span>Clinical notes masked</span><span className="font-semibold">100%</span></div><Progress value={100} /></div>
            <div><div className="flex justify-between mb-1"><span>Therapy notes shielded</span><span className="font-semibold">100%</span></div><Progress value={100} /></div>
            <div><div className="flex justify-between mb-1"><span>Risk markers hidden</span><span className="font-semibold">100%</span></div><Progress value={100} /></div>
            <div><div className="flex justify-between mb-1"><span>Caregiver scoped access</span><span className="font-semibold">94%</span></div><Progress value={94} /></div>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Wifi className="h-4 w-4 text-primary" /> Network & PWA Health</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Service Worker Cache Hit</span><span className="font-semibold text-emerald-700">88%</span></li>
            <li className="flex justify-between"><span>Avg First Paint (3G)</span><span className="font-semibold">1.4s</span></li>
            <li className="flex justify-between"><span>Background Sync Queue</span><span className="font-semibold">12 pending</span></li>
            <li className="flex justify-between"><span>SMS Fallback Triggered</span><span className="font-semibold">3.2%</span></li>
            <li className="flex justify-between"><span>Lite Mode Users</span><span className="font-semibold">2,310</span></li>
          </ul>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 2. OTP AUTHENTICATION ============
export const PortalAuth = () => {
  const [phone, setPhone] = useState('+234 801 234 5678');
  const [channel, setChannel] = useState('sms');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Shell title="OTP Authentication">
      <Section icon={<KeyRound className="h-6 w-6" />} title="Passwordless OTP Login"
        desc="Patients authenticate via SMS, Email or WhatsApp OTP with device verification, session timeout and suspicious-activity detection." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">Login Simulator</h3>
          <div className="space-y-3">
            <div><Label>Phone or Email</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div>
              <Label>OTP Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS OTP</SelectItem>
                  <SelectItem value="email">Email OTP</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp OTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setSent(true); toast.success(`OTP sent via ${channel.toUpperCase()}`); }}>
              <Send className="h-4 w-4" /> Send OTP
            </Button>
            {sent && (
              <div className="pt-2">
                <Label>Enter 6-digit OTP</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                <Button className="mt-3" onClick={() => { if (otp.length === 6) { toast.success('Identity verified — session opened'); setOtp(''); setSent(false); } else toast.error('Enter all 6 digits'); }}>
                  <CheckCircle2 className="h-4 w-4" /> Verify
                </Button>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Recent Auth Events</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Channel</TableHead><TableHead>Device</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {[
                { p: 'GFA HMS/2026/00145', c: 'SMS', d: 'Android · Chrome', s: 'Verified' },
                { p: 'GFA HMS/2026/00088', c: 'WhatsApp', d: 'iPhone · Safari', s: 'Verified' },
                { p: 'GFA HMS/2026/00231', c: 'Email', d: 'Windows · Edge', s: 'Verified' },
                { p: 'GFA HMS/2026/00012', c: 'SMS', d: 'Unknown · Lagos', s: 'Failed' },
              ].map(r => (
                <TableRow key={r.p}><TableCell className="font-mono text-xs">{r.p}</TableCell><TableCell>{r.c}</TableCell><TableCell>{r.d}</TableCell><TableCell><StatusBadge status={r.s} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 3. PATIENT DASHBOARD PREVIEW ============
export const PortalDashboard = () => {
  return (
    <Shell title="Patient Dashboard">
      <Section icon={<Smartphone className="h-6 w-6" />} title="Centralized Patient Dashboard"
        desc="Mobile-first patient home with appointments, wallet, invoices, admission, telemedicine, caregiver and emergency widgets." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Wallet Balance</p><p className="text-2xl font-bold">₦24,500</p></div><Wallet className="h-8 w-8 text-primary" /></div></Card>
        <Card><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Outstanding Bill</p><p className="text-2xl font-bold text-amber-700">₦8,000</p></div><Receipt className="h-8 w-8 text-amber-600" /></div></Card>
        <Card><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Next Appointment</p><p className="text-sm font-semibold">Cardiology · 02 May · 10:30</p></div><CalendarPlus className="h-8 w-8 text-primary" /></div></Card>
        <Card><h3 className="font-semibold mb-2 flex items-center gap-2"><BedDouble className="h-4 w-4" /> Admission Status</h3><p className="text-sm">Not admitted · last admission 25 Mar 2026 (Surgery, Ward 3B)</p></Card>
        <Card><h3 className="font-semibold mb-2 flex items-center gap-2"><Video className="h-4 w-4" /> Telemedicine</h3><p className="text-sm mb-2">Next virtual session in 2 days · Dr. Adewale</p><Button size="sm" variant="outline" onClick={() => toast.info('Joining waiting room…')}>Join Waiting Room</Button></Card>
        <Card><h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Caregiver</h3><p className="text-sm">Mrs. Adunni Doe (Spouse) · +234 803 456 7890</p></Card>
        <Card className="lg:col-span-3"><h3 className="font-semibold mb-2 flex items-center gap-2"><Bell className="h-4 w-4" /> Recent Notifications</h3>
          <ul className="text-sm space-y-1">
            <li>• Lab result for MP test released</li>
            <li>• Invoice GFA HMS-INV-1001 has ₦8,000 outstanding</li>
            <li>• Appointment reminder — Cardiology 02 May 10:30</li>
          </ul>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 4. APPOINTMENT BOOKING ============
export const PortalAppointments = () => {
  const [clinic, setClinic] = useState('OPC');
  const [type, setType] = useState('Physical');
  const appts = [
    { id: 'APT-9012', clinic: 'Cardiology', type: 'Physical', date: '2026-05-02 10:30', doctor: 'Dr. Ngozi Ikedife', status: 'Confirmed' },
    { id: 'APT-9013', clinic: 'Psychiatry OPC', type: 'Online', date: '2026-05-05 14:00', doctor: 'Dr. Adewale Ogunleye', status: 'Pending' },
    { id: 'APT-9014', clinic: 'Addiction Clinic', type: 'Physical', date: '2026-05-08 09:00', doctor: 'Auto-assign', status: 'Scheduled' },
  ];
  return (
    <Shell title="Appointment Booking">
      <Section icon={<CalendarPlus className="h-6 w-6" />} title="Modern Appointment Engine"
        desc="Physical, online, follow-up, emergency psychiatry, therapy, child & adolescent, psychogeriatric and addiction clinics — with payment-confirmed booking." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">New Booking</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Clinic</Label>
              <Select value={clinic} onValueChange={setClinic}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['GMPC','OPC','Psychiatry OPC','Child & Adolescent','Psychogeriatric','Addiction Clinic','Emergency Psychiatry','Therapy'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Consultation Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Online">Online (Telemedicine)</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Preferred Date</Label><Input type="date" /></div>
            <div><Label>Preferred Time</Label><Input type="time" /></div>
            <div className="col-span-2"><Label>Notes</Label><Textarea placeholder="Brief reason for visit (no clinical detail required)" /></div>
          </div>
          <Button className="mt-3" onClick={() => toast.success('Invoice generated · awaiting payment')}>
            <Plus className="h-4 w-4" /> Generate Invoice & Book
          </Button>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">My Appointments</h3>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Clinic</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {appts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.id}</TableCell>
                  <TableCell>{a.clinic}<div className="text-xs text-muted-foreground">{a.type} · {a.doctor}</div></TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => toast.info('Reschedule flow opened')}>Reschedule</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast.warning('Appointment cancelled')}>Cancel</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 5. WALLET & PAYMENTS ============
export const PortalWallet = () => {
  const [amount, setAmount] = useState('5000');
  const [method, setMethod] = useState('Paystack');
  const txns = [
    { id: 'WTX-7741', t: '2026-04-28 09:14', desc: 'Wallet funding · Paystack', amt: '+₦15,000', s: 'Successful' },
    { id: 'WTX-7740', t: '2026-04-27 18:02', desc: 'OPC consultation', amt: '-₦5,000', s: 'Paid' },
    { id: 'WTX-7739', t: '2026-04-25 12:48', desc: 'Pharmacy dispense', amt: '-₦2,300', s: 'Paid' },
    { id: 'WTX-7738', t: '2026-04-20 08:30', desc: 'Wallet funding · Transfer', amt: '+₦20,000', s: 'Successful' },
  ];
  return (
    <Shell title="Wallet & Payments">
      <Section icon={<Wallet className="h-6 w-6" />} title="Healthcare Wallet"
        desc="Fund wallet, pay consultations, admission, accommodation and telemedicine via Paystack, Flutterwave, Transfer, POS, NHIA/NHIS." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <p className="text-xs uppercase text-muted-foreground">Available Balance</p>
          <p className="text-3xl font-bold mt-1">₦24,500</p>
          <p className="text-xs text-muted-foreground mt-1">Patient: John Doe</p>
          <div className="mt-4 space-y-2">
            <Label>Fund Wallet (₦)</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Paystack','Flutterwave','Bank Transfer','POS','Cash at Hospital','NHIA / NHIS'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => toast.success(`₦${amount} funding via ${method} initiated`)}>Fund Now</Button>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-3">Transaction History</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Time</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {txns.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell>{t.t}</TableCell><TableCell>{t.desc}</TableCell>
                  <TableCell className={t.amt.startsWith('+') ? 'text-emerald-700' : 'text-red-700'}>{t.amt}</TableCell>
                  <TableCell><StatusBadge status={t.s} /></TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => toast.success('Receipt downloaded')}><Download className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 6. INVOICES ============
export const PortalInvoices = () => {
  const invs = [
    { id: 'GFA HMS-INV-1001', date: '2026-04-28', desc: 'Consultation + Labs', total: '₦18,000', paid: '₦10,000', bal: '₦8,000', s: 'Partial' },
    { id: 'GFA HMS-INV-0987', date: '2026-04-15', desc: 'Pharmacy dispense', total: '₦5,400', paid: '₦5,400', bal: '₦0', s: 'Paid' },
    { id: 'GFA HMS-INV-0954', date: '2026-03-25', desc: 'Admission (3 days) + Surgery', total: '₦142,000', paid: '₦142,000', bal: '₦0', s: 'Paid' },
    { id: 'GFA HMS-INV-0921', date: '2026-02-14', desc: 'Cardiology consult', total: '₦8,500', paid: '₦8,500', bal: '₦0', s: 'Paid' },
  ];
  return (
    <Shell title="Invoices & Payment History">
      <Section icon={<Receipt className="h-6 w-6" />} title="Invoices, Receipts & Payment History"
        desc="Outstanding balances, payment history, admission/accommodation bills and downloadable receipts — filterable." />
      <Card>
        <div className="flex flex-wrap gap-2 mb-3">
          <Input placeholder="Search invoice…" className="max-w-xs" />
          <Select defaultValue="all"><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{['all','paid','partial','unpaid'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={() => toast.success('History exported')}><Download className="h-4 w-4" /> Export</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Total</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {invs.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.id}</TableCell>
                <TableCell>{i.date}</TableCell><TableCell>{i.desc}</TableCell>
                <TableCell>{i.total}</TableCell><TableCell>{i.paid}</TableCell><TableCell className="font-semibold">{i.bal}</TableCell>
                <TableCell><StatusBadge status={i.s} /></TableCell>
                <TableCell className="text-right">
                  {i.bal !== '₦0' && <Button size="sm" onClick={() => toast.success('Payment initiated')}>Pay</Button>}
                  <Button size="sm" variant="ghost" onClick={() => toast.success('Receipt downloaded')}><Download className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============ 7. ADMISSION TRACKING ============
export const PortalAdmission = () => (
  <Shell title="Admission Tracking">
    <Section icon={<BedDouble className="h-6 w-6" />} title="Admission Status"
      desc="Patients see ward, bed, dates, expected discharge, days admitted and outstanding admission balances." />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <Badge className="mb-2">Currently Admitted</Badge>
        <h3 className="font-semibold">GFA HMS/2026/00088 · Mrs. Folake Adekunle</h3>
        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
          <div><p className="text-muted-foreground">Ward</p><p className="font-semibold">Female Psychiatry Ward A</p></div>
          <div><p className="text-muted-foreground">Bed</p><p className="font-semibold">Bed 12</p></div>
          <div><p className="text-muted-foreground">Admitted</p><p className="font-semibold">2026-04-22</p></div>
          <div><p className="text-muted-foreground">Expected Discharge</p><p className="font-semibold">2026-05-05</p></div>
          <div><p className="text-muted-foreground">Days Admitted</p><p className="font-semibold">6</p></div>
          <div><p className="text-muted-foreground">Outstanding</p><p className="font-semibold text-amber-700">₦42,000</p></div>
        </div>
        <Button className="mt-4" onClick={() => toast.success('Payment opened')}>Pay Outstanding</Button>
      </Card>
      <Card>
        <h3 className="font-semibold mb-3">Admission History</h3>
        <Table>
          <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Ward</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>2026-03-25</TableCell><TableCell>2026-03-28</TableCell><TableCell>Surgical Ward 3B</TableCell><TableCell><StatusBadge status="Completed" /></TableCell></TableRow>
            <TableRow><TableCell>2025-08-11</TableCell><TableCell>2025-08-14</TableCell><TableCell>Medical Ward 2A</TableCell><TableCell><StatusBadge status="Completed" /></TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </Shell>
);

// ============ 8. ACCOMMODATION ============
export const PortalAccommodation = () => (
  <Shell title="Accommodation Fees">
    <Section icon={<Home className="h-6 w-6" />} title="Accommodation Fee Visibility"
      desc="Patients track ward type, daily rate, accumulated fees, paid days and outstanding accommodation balance." />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Accommodation Type" value="Private Room" icon={Home} tone="teal" />
      <SummaryCard title="Daily Rate" value="₦12,000" icon={Wallet} tone="blue" />
      <SummaryCard title="Accumulated" value="₦72,000" subtitle="6 days" icon={Receipt} tone="purple" />
      <SummaryCard title="Outstanding" value="₦42,000" subtitle="2.5 days unpaid" icon={AlertTriangle} tone="rose" />
    </div>
    <Card>
      <h3 className="font-semibold mb-3">Daily Accommodation Ledger</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Ward / Room</TableHead><TableHead>Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {['2026-04-22','2026-04-23','2026-04-24','2026-04-25','2026-04-26','2026-04-27'].map((d, i) => (
            <TableRow key={d}><TableCell>{d}</TableCell><TableCell>Private Room 04</TableCell><TableCell>₦12,000</TableCell><TableCell><StatusBadge status={i < 3 ? 'Paid' : 'Unpaid'} /></TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 9. TELEMEDICINE ============
export const PortalTelemedicine = () => {
  const [open, setOpen] = useState(false);
  return (
    <Shell title="Telemedicine">
      <Section icon={<Video className="h-6 w-6" />} title="Secure Virtual Consultations"
        desc="Waiting room, encrypted audio/video, countdown and mobile-friendly video for psychiatric and general consultations." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-2">Upcoming Telemedicine</h3>
          <p className="text-sm text-muted-foreground">Dr. Adewale Ogunleye · Psychiatry OPC</p>
          <p className="text-sm mt-1">Starts in <span className="font-bold text-primary">2 days, 04:12:30</span></p>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => setOpen(true)}><Video className="h-4 w-4" /> Join Waiting Room</Button>
            <Button variant="outline" onClick={() => toast.info('Test call started')}>Run Tech Check</Button>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-2">Past Sessions</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead>Duration</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell>2026-04-12</TableCell><TableCell>Dr. Ngozi I.</TableCell><TableCell>22 min</TableCell><TableCell><StatusBadge status="Completed" /></TableCell></TableRow>
              <TableRow><TableCell>2026-03-30</TableCell><TableCell>Dr. Adewale O.</TableCell><TableCell>34 min</TableCell><TableCell><StatusBadge status="Completed" /></TableCell></TableRow>
            </TableBody>
          </Table>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Waiting Room — Secure Session</DialogTitle></DialogHeader>
          <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center text-white">
            <div className="text-center"><Video className="h-10 w-10 mx-auto mb-2 opacity-70" /><p className="text-sm">Encrypted · waiting for doctor to admit you</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Leave</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 10. CAREGIVERS ============
export const PortalCaregivers = () => {
  const [list, setList] = useState([
    { id: 'C1', name: 'Mrs. Adunni Doe', rel: 'Spouse', phone: '+234 803 456 7890', role: 'Primary', emergency: true },
    { id: 'C2', name: 'Mr. Tunde Doe', rel: 'Brother', phone: '+234 805 112 3344', role: 'Secondary', emergency: false },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', rel: '', phone: '', role: 'Secondary' });
  return (
    <Shell title="Caregiver Management">
      <Section icon={<Users className="h-6 w-6" />} title="Family & Caregiver Support"
        desc="Add caregivers, link guardians for child patients, set authorized representatives and emergency contacts." action={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add Caregiver</Button>
        } />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Relationship</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Emergency</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.rel}</TableCell><TableCell>{c.phone}</TableCell>
                <TableCell><Badge variant="outline">{c.role}</Badge></TableCell>
                <TableCell>{c.emergency ? <StatusBadge status="Active" /> : '—'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setList(list.filter(x => x.id !== c.id)); toast.success('Caregiver removed'); }}>Remove</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Caregiver</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Relationship</Label><Input value={form.rel} onChange={e => setForm({ ...form, rel: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.name || !form.phone) { toast.error('Name and phone required'); return; }
              setList([...list, { id: 'C' + (list.length + 1), ...form, emergency: false }]);
              setForm({ name: '', rel: '', phone: '', role: 'Secondary' }); setOpen(false); toast.success('Caregiver added');
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 11. EMERGENCY CONTACTS ============
export const PortalEmergency = () => (
  <Shell title="Emergency Contacts">
    <Section icon={<PhoneCall className="h-6 w-6" />} title="One-Tap Emergency"
      desc="Hospital emergency lines, psychiatric crisis hotline, ambulance request and quick caregiver dial." />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { t: 'GFA HMS Emergency', n: '+234 803 000 1111', icon: PhoneCall, tone: 'rose' as const },
        { t: 'Psychiatric Crisis Hotline', n: '+234 800 555 9999', icon: Brain, tone: 'purple' as const },
        { t: 'Ambulance Request', n: '+234 803 000 2222', icon: Heart, tone: 'amber' as const },
        { t: 'Primary Caregiver', n: '+234 803 456 7890', icon: Users, tone: 'teal' as const },
        { t: 'Nearest Police', n: '112', icon: ShieldCheck, tone: 'blue' as const },
        { t: 'Poison Control', n: '+234 803 000 3333', icon: AlertTriangle, tone: 'green' as const },
      ].map(c => (
        <Card key={c.t}>
          <div className="flex items-start justify-between">
            <div><p className="text-xs uppercase text-muted-foreground">{c.t}</p><p className="text-lg font-bold mt-1">{c.n}</p></div>
            <c.icon className="h-6 w-6 text-primary" />
          </div>
          <Button className="w-full mt-3" onClick={() => toast.success(`Calling ${c.t}…`)}><PhoneCall className="h-4 w-4" /> Call Now</Button>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 12. NOTIFICATIONS ============
export const PortalNotifications = () => {
  const [prefs, setPrefs] = useState({ inApp: true, sms: true, email: true, push: true, whatsapp: false });
  return (
    <Shell title="Notification Center">
      <Section icon={<Bell className="h-6 w-6" />} title="Centralized Notifications"
        desc="Appointments, payments, invoices, telemedicine, admission, wallet and emergency alerts across in-app, SMS, email, push and WhatsApp." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-3">Recent</h3>
          <ul className="divide-y">
            {[
              { t: 'Lab result released', d: '2026-04-28 10:05', k: 'lab' },
              { t: 'Outstanding bill reminder ₦8,000', d: '2026-04-28 08:00', k: 'payment' },
              { t: 'Cardiology appointment reminder', d: '2026-04-27 18:00', k: 'appt' },
              { t: 'Refill available — Amlodipine 5mg', d: '2026-04-26 09:00', k: 'rx' },
              { t: 'New device sign-in (Lagos)', d: '2026-04-25 21:14', k: 'sec' },
            ].map(n => (
              <li key={n.t} className="py-2 flex items-start justify-between">
                <div><p className="text-sm font-medium">{n.t}</p><p className="text-xs text-muted-foreground">{n.d}</p></div>
                <Button size="sm" variant="ghost" onClick={() => toast.success('Marked as read')}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Channel Preferences</h3>
          <div className="space-y-3">
            {Object.entries(prefs).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <Label className="capitalize">{k}</Label>
                <Switch checked={v} onCheckedChange={c => { setPrefs({ ...prefs, [k]: c }); toast.success('Preference saved'); }} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

// ============ 13. PROFILE ============
export const PortalProfile = () => (
  <Shell title="Profile Management">
    <Section icon={<UserCog className="h-6 w-6" />} title="Profile & Devices"
      desc="Update contact info, photo, caregivers, devices and notification preferences." />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <h3 className="font-semibold mb-3">Personal Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Full Name</Label><Input defaultValue="John Adekunle Doe" /></div>
          <div><Label>Phone</Label><Input defaultValue="+234 801 234 5678" /></div>
          <div><Label>Email</Label><Input defaultValue="john.doe@example.ng" /></div>
          <div><Label>Date of Birth</Label><Input type="date" defaultValue="1986-07-12" /></div>
          <div className="col-span-2"><Label>Address</Label><Input defaultValue="14, Lafenwa Street, Lagos, Ogun" /></div>
        </div>
        <Button className="mt-3" onClick={() => toast.success('Profile saved')}>Save Changes</Button>
      </Card>
      <Card>
        <h3 className="font-semibold mb-3">Trusted Devices</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Device</TableHead><TableHead>Location</TableHead><TableHead>Last Seen</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow><TableCell>Chrome · Windows</TableCell><TableCell>Lagos</TableCell><TableCell>Now</TableCell><TableCell><Badge>Current</Badge></TableCell></TableRow>
            <TableRow><TableCell>Safari · iPhone</TableCell><TableCell>Lagos</TableCell><TableCell>2 days ago</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => toast.warning('Device revoked')}>Revoke</Button></TableCell></TableRow>
            <TableRow><TableCell>Chrome · Android</TableCell><TableCell>Lagos</TableCell><TableCell>3 days ago</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => toast.warning('Device revoked')}>Revoke</Button></TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  </Shell>
);

// ============ 14. DATA RESTRICTIONS ============
export const PortalRestrictions = () => (
  <Shell title="Patient Data Restrictions">
    <Section icon={<ShieldCheck className="h-6 w-6" />} title="What Patients Cannot See"
      desc="Strict psychiatric confidentiality — these data classes are never exposed to the patient-facing portal." />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        'Clinical notes', 'Psychiatric records', 'Therapy notes', 'Doctor observations',
        'Internal reports', 'Sensitive diagnosis (ICD-11 F-codes)', 'Psychotherapy documentation',
        'Suicide risk records', 'Confidential staff notes', 'Internal medical evaluations',
      ].map(r => (
        <Card key={r} className="flex items-center justify-between">
          <span className="text-sm font-medium">{r}</span>
          <Badge variant="destructive">Hidden</Badge>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 15. CONFIDENTIALITY LAYER ============
export const PortalConfidentiality = () => {
  const [rules, setRules] = useState([
    { id: 1, name: 'Mask ICD-11 F-codes on portal', on: true },
    { id: 2, name: 'Suppress therapy session notes', on: true },
    { id: 3, name: 'Hide suicide-risk flags', on: true },
    { id: 4, name: 'Caregiver: scoped visibility only', on: true },
    { id: 5, name: 'Confidentiality banner on sensitive views', on: true },
  ]);
  return (
    <Shell title="Psychiatric Confidentiality Layer">
      <Section icon={<Lock className="h-6 w-6" />} title="Confidentiality Controls"
        desc="Configure psychiatric-safe shielding policies enforced across the patient portal and PWA." />
      <Card>
        {rules.map(r => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm">{r.name}</span>
            <Switch checked={r.on} onCheckedChange={c => { setRules(rules.map(x => x.id === r.id ? { ...x, on: c } : x)); toast.success('Policy updated'); }} />
          </div>
        ))}
      </Card>
    </Shell>
  );
};

// ============ 16. LEGACY EMR REQUESTS ============
export const PortalLegacy = () => {
  const [reqs, setReqs] = useState([
    { id: 'LR-201', date: '2026-04-20', reason: 'Insurance claim — Old folder', s: 'Approved' },
    { id: 'LR-198', date: '2026-04-02', reason: 'Visa medical', s: 'Pending' },
  ]);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <Shell title="Legacy EMR Requests">
      <Section icon={<FolderLock className="h-6 w-6" />} title="Controlled Record Release"
        desc="Patients cannot read legacy EMR directly — they submit a request, which is reviewed and approved before release." action={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Request</Button>
        } />
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {reqs.map(r => <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.id}</TableCell><TableCell>{r.date}</TableCell><TableCell>{r.reason}</TableCell><TableCell><StatusBadge status={r.s} /></TableCell></TableRow>)}
          </TableBody>
        </Table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Legacy EMR Records</DialogTitle></DialogHeader>
          <Label>Reason for request</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Briefly state why you need these records" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!reason) { toast.error('Reason required'); return; }
              setReqs([{ id: 'LR-' + (reqs.length + 202), date: new Date().toISOString().slice(0,10), reason, s: 'Pending' }, ...reqs]);
              setReason(''); setOpen(false); toast.success('Request submitted for review');
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 17. OFFLINE / LOW-BANDWIDTH ============
export const PortalOffline = () => (
  <Shell title="Offline & Low-Bandwidth">
    <Section icon={<Wifi className="h-6 w-6" />} title="Nigeria-Optimized Delivery"
      desc="Image optimization, service worker caching, Lite Mode, SMS fallback and background sync for unreliable networks." />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Cache Hit Rate" value="88%" icon={CloudCog} tone="teal" />
      <SummaryCard title="Lite Mode Users" value="2,310" icon={Wifi} tone="blue" />
      <SummaryCard title="SMS Fallback Used" value="3.2%" icon={MessageSquare} tone="amber" />
      <SummaryCard title="Avg Payload" value="142 KB" subtitle="Optimized" icon={Download} tone="green" />
    </div>
    <Card>
      <h3 className="font-semibold mb-3">Background Sync Queue</h3>
      <Table>
        <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Queued</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow><TableCell>Profile update</TableCell><TableCell>5 min ago</TableCell><TableCell><StatusBadge status="Retrying" /></TableCell></TableRow>
          <TableRow><TableCell>Wallet topup confirm</TableCell><TableCell>14 min ago</TableCell><TableCell><StatusBadge status="Synced" /></TableCell></TableRow>
          <TableRow><TableCell>Appointment book</TableCell><TableCell>2 hr ago</TableCell><TableCell><StatusBadge status="Synced" /></TableCell></TableRow>
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 18. MOBILE UX / PWA ============
export const PortalPwa = () => (
  <Shell title="Mobile UX & PWA">
    <Section icon={<Hand className="h-6 w-6" />} title="Progressive Web App"
      desc="Installable, push-notification capable, gesture-friendly, with bottom tab nav, floating help and voice-assist." />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Installs" value="6,471" subtitle="43.6% of users" icon={Smartphone} tone="teal" />
      <SummaryCard title="Push Opt-in" value="78%" icon={Bell} tone="blue" />
      <SummaryCard title="Avg Session" value="6m 12s" icon={Activity} tone="purple" />
      <SummaryCard title="Lighthouse Score" value="96" subtitle="Performance" icon={Sparkles} tone="green" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card>
        <h3 className="font-semibold mb-3">Enabled PWA Features</h3>
        <ul className="text-sm space-y-2">
          {['Installable home-screen app','Offline support','Push notifications','Background sync','Camera & QR scanner','Bottom-tab gesture nav','Voice-assisted accessibility','Large touch targets'].map(f => (
            <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {f}</li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="font-semibold mb-3">Device Capabilities</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span><QrCode className="h-4 w-4 inline mr-2" /> QR Scanner</span><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><span><Fingerprint className="h-4 w-4 inline mr-2" /> Biometric Unlock</span><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><span><Bell className="h-4 w-4 inline mr-2" /> Push Notifications</span><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><span><Wifi className="h-4 w-4 inline mr-2" /> Offline Mode</span><Switch defaultChecked /></div>
        </div>
      </Card>
    </div>
  </Shell>
);

// ============ 19. HELP DESK / SUPPORT ============
export const PortalSupport = () => {
  const [tickets, setTickets] = useState([
    { id: '#4421', subj: 'Cannot fund wallet via Paystack', cat: 'Billing', s: 'Open' },
    { id: '#4418', subj: 'Telemedicine link not loading', cat: 'Technical', s: 'In Progress' },
    { id: '#4402', subj: 'Reschedule request', cat: 'Appointments', s: 'Resolved' },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subj: '', cat: 'Technical', msg: '' });
  return (
    <Shell title="Help Desk & Support">
      <Section icon={<LifeBuoy className="h-6 w-6" />} title="Patient Support Center"
        desc="Chat, ticketing, FAQ, complaint submission, billing and technical support." action={
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Ticket</Button>
        } />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold mb-3">My Tickets</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Subject</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {tickets.map(t => <TableRow key={t.id}><TableCell className="font-mono text-xs">{t.id}</TableCell><TableCell>{t.subj}</TableCell><TableCell>{t.cat}</TableCell><TableCell><StatusBadge status={t.s} /></TableCell></TableRow>)}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Quick Links</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Live chat opening…')}><MessageSquare className="h-4 w-4" /> Live Chat</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('FAQ opening…')}><Eye className="h-4 w-4" /> Browse FAQ</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info('Complaint form opening…')}><AlertTriangle className="h-4 w-4" /> File Complaint</Button>
          </div>
        </Card>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Subject</Label><Input value={form.subj} onChange={e => setForm({ ...form, subj: e.target.value })} /></div>
            <div><Label>Category</Label>
              <Select value={form.cat} onValueChange={v => setForm({ ...form, cat: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Technical','Billing','Appointments','Telemedicine','Complaint','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Message</Label><Textarea value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!form.subj) { toast.error('Subject required'); return; }
              setTickets([{ id: '#' + (4422 + tickets.length), subj: form.subj, cat: form.cat, s: 'Open' }, ...tickets]);
              setForm({ subj: '', cat: 'Technical', msg: '' }); setOpen(false); toast.success('Ticket submitted');
            }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============ 20. AI ASSISTANT ============
export const PortalAi = () => {
  const [msgs, setMsgs] = useState<{ from: 'ai' | 'me'; text: string }[]>([
    { from: 'ai', text: 'Hello John 👋 I can help with appointments, billing, hospital navigation and medication reminders. I do not interpret medical results.' },
  ]);
  const [input, setInput] = useState('');
  const safeReply = (q: string) => {
    const lower = q.toLowerCase();
    if (lower.includes('diagnos') || lower.includes('what is wrong')) return 'I am not able to diagnose. Please book a consultation with a clinician.';
    if (lower.includes('appointment')) return 'You can book under Appointments → New Booking. Would you like me to open it?';
    if (lower.includes('bill') || lower.includes('pay')) return 'Outstanding invoices are on your Invoices page. You can pay from wallet, Paystack, Flutterwave or transfer.';
    return 'Got it — would you like guidance on appointments, payments or directions inside the hospital?';
  };
  return (
    <Shell title="AI Patient Assistant">
      <Section icon={<Sparkles className="h-6 w-6" />} title="Safe AI Companion"
        desc="Guides appointments, billing, navigation and reminders. Never diagnoses, never reveals psychiatric records." />
      <Card className="max-w-3xl">
        <div className="h-[360px] overflow-y-auto space-y-3 mb-3 pr-2">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === 'me' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{m.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about appointments, bills, directions…" onKeyDown={e => e.key === 'Enter' && input && (setMsgs([...msgs, { from: 'me', text: input }, { from: 'ai', text: safeReply(input) }]), setInput(''))} />
          <Button onClick={() => { if (!input) return; setMsgs([...msgs, { from: 'me', text: input }, { from: 'ai', text: safeReply(input) }]); setInput(''); }}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </Shell>
  );
};

// ============ 21. ANALYTICS ============
export const PortalAnalytics = () => (
  <Shell title="Engagement Analytics">
    <Section icon={<BarChart3 className="h-6 w-6" />} title="Patient Engagement Insights"
      desc="Appointment trends, wallet usage, telemedicine adoption, payments and missed-appointment metrics." />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Active Users (30d)" value="9,841" trend="up" subtitle="+8.4%" icon={Activity} tone="teal" />
      <SummaryCard title="Avg Booking / User" value="2.3" icon={CalendarPlus} tone="blue" />
      <SummaryCard title="Wallet Top-ups" value="₦42.1M" subtitle="This month" icon={Wallet} tone="purple" />
      <SummaryCard title="Missed Appointments" value="4.7%" trend="down" subtitle="-1.2%" icon={AlertTriangle} tone="amber" />
    </div>
    <Card>
      <h3 className="font-semibold mb-3">Channel Usage (last 30 days)</h3>
      <div className="space-y-3 text-sm">
        {[
          { ch: 'Mobile PWA', pct: 64 }, { ch: 'Desktop Web', pct: 21 },
          { ch: 'SMS Fallback', pct: 8 }, { ch: 'USSD Pay', pct: 4 }, { ch: 'WhatsApp Bot', pct: 3 },
        ].map(c => (
          <div key={c.ch}><div className="flex justify-between mb-1"><span>{c.ch}</span><span className="font-semibold">{c.pct}%</span></div><Progress value={c.pct} /></div>
        ))}
      </div>
    </Card>
  </Shell>
);

// ============ 22. HMS + EMR INTEGRATION ============
export const PortalIntegration = () => (
  <Shell title="HMS + EMR Integration">
    <Section icon={<Plug className="h-6 w-6" />} title="Integration Surface"
      desc="The portal binds to EMR, billing, telemedicine, NHIA, admission, pharmacy, lab, notifications, legacy EMR and security." />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        { n: 'EMR Core', s: 'Synced', icon: Stethoscope }, { n: 'Billing & POS', s: 'Synced', icon: Receipt },
        { n: 'Telemedicine Gateway', s: 'Active', icon: Video }, { n: 'NHIA / NHIS Bridge', s: 'Synced', icon: ShieldCheck },
        { n: 'Admission System', s: 'Synced', icon: BedDouble }, { n: 'Pharmacy', s: 'Synced', icon: Pill },
        { n: 'Laboratory', s: 'Synced', icon: Activity }, { n: 'Notification Engine', s: 'Active', icon: Bell },
        { n: 'Legacy EMR', s: 'Pending', icon: FolderLock }, { n: 'Security Engine (IAM)', s: 'Active', icon: Lock },
      ].map(i => (
        <Card key={i.n}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><i.icon className="h-5 w-5 text-primary" /><span className="font-medium">{i.n}</span></div>
            <StatusBadge status={i.s} />
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => toast.success(`${i.n} sync triggered`)}><RefreshCw className="h-3.5 w-3.5" /> Test sync</Button>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============ 23. CLOUD & SYNC ============
export const PortalCloud = () => (
  <Shell title="Cloud & Sync Engine">
    <Section icon={<CloudCog className="h-6 w-6" />} title="Cloud + Offline Architecture"
      desc="Cloud-hosted portal with offline caching, sync engine, device persistence, secure token storage and multi-device sync." />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Sync Engine" value="Healthy" icon={CloudCog} tone="teal" />
      <SummaryCard title="Cache Storage" value="124 MB / 500 MB" icon={Download} tone="blue" />
      <SummaryCard title="Token Vault" value="Encrypted" icon={Lock} tone="purple" />
      <SummaryCard title="Devices / User" value="1.6 avg" icon={Smartphone} tone="green" />
    </div>
    <Card>
      <h3 className="font-semibold mb-3">Multi-Device Sync</h3>
      <Table>
        <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Devices</TableHead><TableHead>Last Sync</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow><TableCell>John Doe</TableCell><TableCell>3</TableCell><TableCell>1 min ago</TableCell><TableCell><StatusBadge status="Synced" /></TableCell></TableRow>
          <TableRow><TableCell>Folake A.</TableCell><TableCell>2</TableCell><TableCell>14 min ago</TableCell><TableCell><StatusBadge status="Synced" /></TableCell></TableRow>
          <TableRow><TableCell>Tunde O.</TableCell><TableCell>1</TableCell><TableCell>2 hr ago</TableCell><TableCell><StatusBadge status="Retrying" /></TableCell></TableRow>
        </TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============ 24. WEB BRIDGE ============
export const PortalWeb = () => (
  <Shell title="Website Bridge">
    <Section icon={<Globe className="h-6 w-6" />} title="Unified Web + Portal Experience"
      desc="Seamless connection between the public hospital website, appointment booking, telemedicine, payment gateway and mental-health resources." />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { t: 'Public Website', d: 'gfa-health.demo — entry funnel', link: '/' },
        { t: 'Appointment Booking', d: 'Public booking portal', link: '/appointment' },
        { t: 'Telemedicine Hub', d: 'Virtual consultations gateway', link: '/dashboard/superadmin/portal/telemedicine' },
        { t: 'Payment Gateway', d: 'Unified Paystack / Flutterwave', link: '/dashboard/superadmin/portal/wallet' },
        { t: 'Mental Health Resources', d: 'Education & helplines', link: '/services' },
        { t: 'Departments Directory', d: 'Clinic & specialty index', link: '/departments' },
      ].map(b => (
        <Card key={b.t}>
          <h3 className="font-semibold">{b.t}</h3>
          <p className="text-sm text-muted-foreground mt-1">{b.d}</p>
          <Button size="sm" className="mt-3" variant="outline" onClick={() => { window.location.href = b.link; }}>Open</Button>
        </Card>
      ))}
    </div>
  </Shell>
);
