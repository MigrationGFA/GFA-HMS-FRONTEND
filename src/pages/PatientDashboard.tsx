import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar, CreditCard, Stethoscope, History, FileText, Bell, ShieldCheck, FlaskConical,
  Pill, User, Smartphone, Lock, Download, Share2, Phone, MapPin, AlertTriangle,
  CheckCircle2, Clock, WifiOff, KeyRound, Eye, EyeOff, ScrollText, Receipt, ArrowRight,
  Activity, HeartPulse, ClipboardList, Sparkles,
} from 'lucide-react';
import { appointments, departments, doctors, timeSlots, formatCurrency } from '@/data/dummyData';
import { invoices, consultationTypes, consultationModes } from '@/data/invoiceData';
import { labRequestsFull } from '@/data/labData';
import { prescriptionsFull } from '@/data/pharmacyData';
import {
  PATIENT_ID, PATIENT_NAME, PATIENT_PHONE,
  medicalRecords, patientNotifications, defaultConsents, accessLogs, patientDevices,
} from '@/data/patientPortalData';

// ============================================================
// SIDEBAR NAV
// ============================================================
const patientNav = [
  { label: 'Dashboard',     path: '/dashboard/patient',               icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Book Appointment', path: '/dashboard/patient/book',       icon: <Calendar className="h-4 w-4" /> },
  { label: 'Billing & Pay', path: '/dashboard/patient/invoices',      icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Medical Records', path: '/dashboard/patient/records',     icon: <FileText className="h-4 w-4" /> },
  { label: 'Lab Results',   path: '/dashboard/patient/lab',           icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Prescriptions', path: '/dashboard/patient/prescriptions', icon: <Pill className="h-4 w-4" /> },
  { label: 'Notifications', path: '/dashboard/patient/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Booking History', path: '/dashboard/patient/history',     icon: <History className="h-4 w-4" /> },
  { label: 'Profile & Consent', path: '/dashboard/patient/profile',   icon: <ShieldCheck className="h-4 w-4" /> },
];

// ============================================================
// SHARED — patient-scoped data
// ============================================================
const myAppointments = appointments.filter(a => a.patientName === PATIENT_NAME);
const myInvoices = invoices.filter(i => i.patientName === PATIENT_NAME);
const myLabs = labRequestsFull.filter(l => l.patientName === PATIENT_NAME);
const myRx = prescriptionsFull.filter(p => p.patientName === PATIENT_NAME);

const outstandingTotal = myInvoices.reduce((s, i) => s + i.balance, 0);
const outstandingCount = myInvoices.filter(i => i.balance > 0 && i.paymentStatus !== 'Cancelled').length;
const upcoming = myAppointments[0];
const latestLab = myLabs[0];
const unreadNotifs = patientNotifications.filter(n => !n.read).length;

// ============================================================
// OTP GATE — Phone + OTP verification once per session
// ============================================================
const OTP_KEY = 'oouth_patient_otp_verified';

const OtpGate = ({ onVerified }: { onVerified: () => void }) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState(PATIENT_PHONE);
  const [otp, setOtp] = useState('');
  const [sentCode] = useState('428193'); // demo code shown to user

  const sendOtp = () => {
    toast({ title: 'OTP sent', description: `A 6-digit code was sent to ${phone}. (Demo: ${sentCode})` });
    setStep('otp');
  };

  const verify = () => {
    if (otp === sentCode || otp === '000000') {
      sessionStorage.setItem(OTP_KEY, '1');
      toast({ title: 'Identity verified', description: 'Welcome to your secure patient portal.' });
      onVerified();
    } else {
      toast({ title: 'Incorrect code', description: 'Please re-enter the 6-digit OTP.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Secure Patient Sign-in</h2>
            <p className="text-xs text-muted-foreground">GFA HMS • NDPR-compliant identity check</p>
          </div>
        </div>

        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Registered Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <p className="text-[11px] text-muted-foreground">A one-time code will be sent via SMS. Standard rates may apply.</p>
            </div>
            <Button className="w-full bg-gradient-to-r from-primary to-accent" onClick={sendOtp}>
              Send OTP <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs">
              <p className="text-foreground"><b>OTP sent</b> to <span className="font-mono">{phone}</span></p>
              <p className="text-muted-foreground mt-0.5">Demo code: <span className="font-mono font-bold text-primary">{sentCode}</span> (or use 000000)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">6-digit Verification Code</Label>
              <Input maxLength={6} className="text-center text-xl font-mono tracking-[0.5em] h-12" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('phone')}>Back</Button>
              <Button className="flex-1 bg-gradient-to-r from-primary to-accent" onClick={verify}>Verify & Continue</Button>
            </div>
            <button className="text-xs text-primary hover:underline w-full text-center" onClick={sendOtp}>Resend code</button>
          </>
        )}

        <div className="pt-3 border-t flex items-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          Your session is encrypted. Auto sign-out after 15 min of inactivity.
        </div>
      </div>
    </div>
  );
};

const PatientShell = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [verified, setVerified] = useState(() => sessionStorage.getItem(OTP_KEY) === '1');
  if (!verified) return <OtpGate onVerified={() => setVerified(true)} />;
  return <DashboardLayout navItems={patientNav} title={title}>{children}</DashboardLayout>;
};

// ============================================================
// 1. DASHBOARD HOME
// ============================================================
const QuickActionTile = ({ icon: Icon, label, sub, onClick, gradient }: { icon: any; label: string; sub: string; onClick: () => void; gradient: string }) => (
  <button onClick={onClick} className={`group relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 ${gradient}`}>
    <Icon className="h-7 w-7 mb-3 opacity-90" />
    <div className="font-display font-semibold text-base">{label}</div>
    <div className="text-[11px] opacity-80 mt-0.5">{sub}</div>
    <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform" />
  </button>
);

const SummaryTile = ({ icon: Icon, label, value, hint, accent }: { icon: any; label: string; value: string; hint?: string; accent: string }) => (
  <div className="bg-card border rounded-2xl p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
        <p className="font-display font-bold text-2xl text-foreground mt-1">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

export const PatientOverview = () => {
  const navigate = useNavigate();
  return (
    <PatientShell title="Patient Portal">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent p-6 mb-6 text-primary-foreground shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-20 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">Welcome back</p>
            <h2 className="font-display font-bold text-2xl mt-1">{PATIENT_NAME}</h2>
            <p className="text-xs opacity-90 mt-1 font-mono">{PATIENT_ID} • {PATIENT_PHONE}</p>
            <div className="flex items-center gap-2 mt-3 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur"><ShieldCheck className="h-3 w-3" /> Identity Verified</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur"><Activity className="h-3 w-3" /> EMR Connected</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest opacity-80">Outstanding</p>
            <p className="font-display font-bold text-3xl">{formatCurrency(outstandingTotal)}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('/dashboard/patient/invoices')}>
              <Receipt className="h-3.5 w-3.5 mr-1" /> Pay now
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryTile icon={Calendar} label="Upcoming Visits" value={String(myAppointments.length)} hint={upcoming ? `${upcoming.date} • ${upcoming.time}` : 'None'} accent="bg-primary/10 text-primary" />
        <SummaryTile icon={CreditCard} label="Open Invoices" value={String(outstandingCount)} hint={outstandingCount ? 'Pay to unlock services' : 'All settled ✓'} accent="bg-amber-500/10 text-amber-600" />
        <SummaryTile icon={FlaskConical} label="Lab Results" value={String(myLabs.length)} hint={latestLab ? `Latest: ${latestLab.testName}` : '—'} accent="bg-emerald-500/10 text-emerald-600" />
        <SummaryTile icon={Bell} label="Notifications" value={String(unreadNotifs)} hint={unreadNotifs ? 'Unread alerts' : 'You are up to date'} accent="bg-rose-500/10 text-rose-600" />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <QuickActionTile icon={Calendar}     label="Book Appointment" sub="Choose dept, doctor & date" gradient="bg-gradient-to-br from-sky-500 to-indigo-600"   onClick={() => navigate('/dashboard/patient/book')} />
        <QuickActionTile icon={Receipt}      label="Pay a Bill"        sub="Card · Transfer · USSD · POS" gradient="bg-gradient-to-br from-emerald-500 to-teal-600" onClick={() => navigate('/dashboard/patient/invoices')} />
        <QuickActionTile icon={FileText}     label="View Records"      sub="Your medical history"        gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600" onClick={() => navigate('/dashboard/patient/records')} />
        <QuickActionTile icon={Phone}        label="Contact Hospital"  sub="A&E · Wards · Help desk"     gradient="bg-gradient-to-br from-rose-500 to-orange-500"  onClick={() => alert('Helpline: 0800-GFA HMS-24')} />
      </div>

      {/* Two-column: upcoming + notifications */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Upcoming Appointments</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/patient/history')}>View all</Button>
          </div>
          {myAppointments.length ? (
            <div className="space-y-2">
              {myAppointments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <HeartPulse className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{a.department}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor} • {a.date} at {a.time}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{a.bookingCode}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No upcoming appointments. <button className="text-primary underline" onClick={() => navigate('/dashboard/patient/book')}>Book one</button>
            </div>
          )}

          {/* Last visit summary */}
          {medicalRecords[0] && (
            <div className="mt-5 pt-5 border-t">
              <h4 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">Last Visit Summary</h4>
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">{medicalRecords[0].diagnosis}</p>
                    <p className="text-[11px] text-muted-foreground">{medicalRecords[0].department} • {medicalRecords[0].doctor} • {medicalRecords[0].date}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{medicalRecords[0].type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{medicalRecords[0].summary}</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Latest Alerts</h3>
            {unreadNotifs > 0 && <Badge className="bg-rose-500 text-white">{unreadNotifs} new</Badge>}
          </div>
          <div className="space-y-2">
            {patientNotifications.slice(0, 4).map(n => (
              <button key={n.id} onClick={() => n.link && navigate(n.link)} className={`w-full text-left p-2.5 rounded-lg border ${n.read ? 'bg-muted/30' : 'bg-primary/5 border-primary/20'}`}>
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 h-1.5 w-1.5 rounded-full ${n.read ? 'bg-muted-foreground/40' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{n.at}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => navigate('/dashboard/patient/notifications')}>
            See all notifications <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>

          {/* Low-bandwidth banner */}
          <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-2.5 flex items-start gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-[11px]">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Offline-friendly</p>
              <p className="text-amber-700 dark:text-amber-300">Pay via USSD <span className="font-mono">*737*0011#</span> or reply to SMS link.</p>
            </div>
          </div>
        </div>
      </div>
    </PatientShell>
  );
};

// ============================================================
// 2. BOOK APPOINTMENT
// ============================================================
export const PatientBooking = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: PATIENT_NAME, phone: PATIENT_PHONE, department: '', doctor: '',
    date: '2026-05-02', time: '', consultationType: '', mode: 'Physical', doctorChoice: 'auto',
    reason: '',
  });
  const [booked, setBooked] = useState<{ code: string; price: number } | null>(null);
  const [step, setStep] = useState(1);

  const bookedSlots = appointments.filter(a => a.doctor === formData.doctor && a.date === formData.date).map(a => a.time);
  const selectedConsultation = consultationTypes.find(c => c.id === formData.consultationType);
  const extraCharge = formData.doctorChoice === 'choose' && selectedConsultation ? selectedConsultation.chooseDoctorExtra : 0;
  const totalPrice = (selectedConsultation?.basePrice || 0) + extraCharge;

  const confirm = () => {
    const code = `GFA HMS-${Math.floor(10000 + Math.random() * 90000)}`;
    setBooked({ code, price: totalPrice });
    toast({ title: 'Appointment booked', description: `Invoice generated. Marked Pending Payment until settled.` });
  };

  return (
    <PatientShell title="Book Appointment">
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border rounded-2xl p-5">
          {booked ? (
            <div className="text-center py-10">
              <div className="rounded-full bg-emerald-500/15 p-5 w-fit mx-auto mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="font-display font-bold text-xl">Appointment Booked!</h3>
              <p className="text-sm text-muted-foreground mt-2">Booking Code</p>
              <p className="text-2xl font-mono font-bold text-primary mt-1">{booked.code}</p>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 max-w-sm mx-auto mt-4 p-3 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-semibold">Pending Payment</p>
                    <p>Pay {formatCurrency(booked.price)} to unlock consultation.</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-center mt-5">
                <Button variant="outline" onClick={() => { setBooked(null); setStep(1); }}>Book Another</Button>
                <Button onClick={() => window.location.href = '/dashboard/patient/invoices'}>
                  <Receipt className="h-4 w-4 mr-1" /> Pay Now
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Stepper */}
              <div className="flex items-center justify-between mb-6">
                {['Service', 'Doctor', 'Slot', 'Confirm'].map((s, i) => (
                  <div key={s} className="flex items-center flex-1 last:flex-none">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${step > i ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {step > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`ml-2 text-xs font-medium ${step === i + 1 ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
                    {i < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > i + 1 ? 'bg-emerald-500' : 'bg-muted'}`} />}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label>Consultation Type</Label>
                    <Select value={formData.consultationType} onValueChange={v => setFormData({ ...formData, consultationType: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {consultationTypes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {formatCurrency(c.basePrice)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {consultationModes.map(m => (
                        <button key={m} onClick={() => setFormData({ ...formData, mode: m })}
                          className={`p-3 rounded-lg border text-sm font-medium ${formData.mode === m ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={formData.department} onValueChange={v => setFormData({ ...formData, department: v, doctor: '' })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Reason for Visit (optional)</Label>
                    <Textarea rows={2} placeholder="e.g. Follow-up, persistent headache…" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
                  </div>
                  <Button className="w-full" disabled={!formData.consultationType || !formData.department} onClick={() => setStep(2)}>Next</Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label>Doctor Selection</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        { v: 'auto', t: 'Auto-Assign', s: 'Quickest available' },
                        { v: 'choose', t: 'Choose Doctor', s: `+${formatCurrency(selectedConsultation?.chooseDoctorExtra || 5000)}` },
                      ].map(o => (
                        <button key={o.v} onClick={() => setFormData({ ...formData, doctorChoice: o.v })}
                          className={`p-3 rounded-lg border text-left ${formData.doctorChoice === o.v ? 'border-primary bg-primary/5' : 'hover:border-primary/40'}`}>
                          <p className="text-sm font-semibold">{o.t}</p>
                          <p className="text-[11px] text-muted-foreground">{o.s}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  {formData.doctorChoice === 'choose' && (
                    <div>
                      <Label>Doctor</Label>
                      <div className="space-y-2 mt-1">
                        {doctors.filter(d => !formData.department || d.department === formData.department).map(d => (
                          <button key={d.name} onClick={() => setFormData({ ...formData, doctor: d.name })}
                            className={`w-full p-3 rounded-lg border flex items-center gap-3 text-left ${formData.doctor === d.name ? 'border-primary bg-primary/5' : 'hover:border-primary/40'}`}>
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold text-xs">
                              {d.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{d.name}</p>
                              <p className="text-[11px] text-muted-foreground">{d.department}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button className="flex-1" disabled={formData.doctorChoice === 'choose' && !formData.doctor} onClick={() => setStep(3)}>Next</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Available Time Slots</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                      {timeSlots.map(t => {
                        const taken = bookedSlots.includes(t);
                        return (
                          <button key={t} disabled={taken} onClick={() => setFormData({ ...formData, time: t })}
                            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${taken ? 'bg-muted text-muted-foreground line-through cursor-not-allowed' : formData.time === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/40'}`}>
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
                    <Button className="flex-1" disabled={!formData.time} onClick={() => setStep(4)}>Review</Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h3 className="font-display font-semibold">Confirm your booking</h3>
                  <div className="rounded-xl bg-muted/40 p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{formData.department}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Doctor</span><span className="font-medium">{formData.doctor || 'Auto-assigned'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{selectedConsultation?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mode</span><span className="font-medium">{formData.mode}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">When</span><span className="font-medium">{formData.date} • {formData.time}</span></div>
                    <div className="border-t pt-2 mt-2 flex justify-between text-base">
                      <span className="font-semibold">Total</span><span className="font-bold text-primary">{formatCurrency(totalPrice)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>Back</Button>
                    <Button className="flex-1 bg-gradient-to-r from-primary to-accent" onClick={confirm}>Confirm Booking</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Side info */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-4">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> How it works</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 mt-2 list-decimal pl-4">
              <li>Pick a service & department</li>
              <li>Auto-assign or choose your doctor</li>
              <li>Confirm slot — invoice is auto-generated</li>
              <li>Pay to unlock the consultation</li>
            </ol>
          </div>
          <div className="rounded-2xl border p-4">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Payment Required</h4>
            <p className="text-xs text-muted-foreground mt-1">Consultation begins only after the system confirms payment. Emergency cases may proceed with override.</p>
          </div>
          <div className="rounded-2xl border p-4">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-500" /> Visit GFA HMS</h4>
            <p className="text-xs text-muted-foreground mt-1">Lagos Campus, Ogun State.<br />Helpline: 0800-GFA HMS-24</p>
          </div>
        </div>
      </div>
    </PatientShell>
  );
};

// ============================================================
// 3. INVOICES + MULTI-CHANNEL PAYMENT
// ============================================================
export const PatientInvoices = () => {
  const { toast } = useToast();
  const [payInvoice, setPayInvoice] = useState<typeof myInvoices[0] | null>(null);
  const [channel, setChannel] = useState<'card' | 'transfer' | 'ussd' | 'sms' | 'pos'>('card');
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => { if (payInvoice) { setAmount(payInvoice.balance); setChannel('card'); } }, [payInvoice]);

  const submit = () => {
    toast({ title: 'Payment initiated', description: `${formatCurrency(amount)} via ${channel.toUpperCase()}. HMS will validate automatically.` });
    setPayInvoice(null);
  };

  return (
    <PatientShell title="Billing & Payments">
      {/* Top stats */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <p className="text-[11px] uppercase opacity-80">Total Paid</p>
          <p className="font-display font-bold text-2xl mt-1">{formatCurrency(myInvoices.reduce((s, i) => s + i.amountPaid, 0))}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <p className="text-[11px] uppercase opacity-80">Outstanding</p>
          <p className="font-display font-bold text-2xl mt-1">{formatCurrency(outstandingTotal)}</p>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-500 to-indigo-600 text-white">
          <p className="text-[11px] uppercase opacity-80">Total Invoices</p>
          <p className="font-display font-bold text-2xl mt-1">{myInvoices.length}</p>
        </div>
      </div>

      <div className="bg-card border rounded-2xl p-4">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
          {['all', 'pending', 'partial', 'paid'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myInvoices.filter(i => tab === 'all' || i.paymentStatus.toLowerCase() === tab).map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-semibold">{inv.invoiceId}</p>
                        <p className="text-[10px] text-muted-foreground">{inv.date}</p>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{inv.services.map(s => s.serviceName).join(', ')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                      <TableCell className="font-bold text-amber-700">{formatCurrency(inv.balance)}</TableCell>
                      <TableCell><StatusBadge status={inv.paymentStatus} /></TableCell>
                      <TableCell>
                        {inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Cancelled' ? (
                          <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => setPayInvoice(inv)}>Pay Now</Button>
                        ) : (
                          <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5 mr-1" /> Receipt</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!payInvoice} onOpenChange={() => setPayInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Pay Invoice</DialogTitle>
            <DialogDescription>HMS auto-confirms once payment is received. No manual marking.</DialogDescription>
          </DialogHeader>
          {payInvoice && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono font-bold">{payInvoice.invoiceId}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatCurrency(payInvoice.totalAmount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-bold text-destructive">{formatCurrency(payInvoice.balance)}</span></div>
              </div>

              <div>
                <Label>Amount to Pay</Label>
                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
                {amount > 0 && amount < payInvoice.balance && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Partial payment — appointment remains locked until balance is settled.</p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Payment Method</Label>
                <div className="grid grid-cols-5 gap-1.5">
                  {([
                    { id: 'card',     label: 'Card',     icon: CreditCard },
                    { id: 'transfer', label: 'Transfer', icon: Receipt },
                    { id: 'ussd',     label: 'USSD',     icon: Smartphone },
                    { id: 'sms',      label: 'SMS',      icon: Bell },
                    { id: 'pos',      label: 'POS',      icon: Activity },
                  ] as const).map(opt => (
                    <button key={opt.id} onClick={() => setChannel(opt.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[11px] font-medium ${channel === opt.id ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/40'}`}>
                      <opt.icon className="h-4 w-4" /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs">
                {channel === 'card' && (<>
                  <Label className="text-xs">Card Number</Label>
                  <Input className="mt-1" defaultValue="4242 4242 4242 4242" />
                </>)}
                {channel === 'transfer' && (<>
                  <p className="font-semibold mb-1">Bank Transfer Details</p>
                  <p>Bank: <span className="font-medium">GTBank</span></p>
                  <p>Account: <span className="font-mono font-medium">0123456789</span> — GFA HMS Revenue</p>
                  <p>Use <span className="font-mono">{payInvoice.invoiceId}</span> as narration.</p>
                </>)}
                {channel === 'ussd' && (<>
                  <p className="font-semibold mb-1">Dial on your phone</p>
                  <p className="text-xl font-mono font-bold text-primary">*737*0011*{Math.floor(amount)}#</p>
                  <p className="text-muted-foreground mt-1">Works on all Nigerian networks.</p>
                </>)}
                {channel === 'sms' && (<>
                  <p className="font-semibold mb-1">SMS Pay Link</p>
                  <p>A secure one-time link will be sent to <span className="font-medium">{PATIENT_PHONE}</span>. Tap to complete payment.</p>
                </>)}
                {channel === 'pos' && (<>
                  <p className="font-semibold mb-1">In-hospital POS</p>
                  <p>Show invoice <span className="font-mono">{payInvoice.invoiceId}</span> at any cashier desk. Linked automatically.</p>
                </>)}
              </div>

              <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600" onClick={submit}>
                <Lock className="h-4 w-4 mr-1" /> Pay {formatCurrency(amount)}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Secured by Lovable Cloud • PCI-DSS</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PatientShell>
  );
};

// ============================================================
// 4. MEDICAL RECORDS
// ============================================================
export const PatientRecords = () => {
  const { toast } = useToast();
  const [view, setView] = useState<typeof medicalRecords[0] | null>(null);
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <PatientShell title="Medical Records">
      <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white p-5 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Your Health History</h3>
            <p className="text-sm opacity-90 mt-1">Every view is logged. Sensitive notes may be hidden by your doctor.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowSensitive(s => !s)}>
              {showSensitive ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />} {showSensitive ? 'Hide' : 'Show'} sensitive
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {medicalRecords.map(r => (
          <div key={r.id} className="bg-card border rounded-2xl p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                <p className="font-display font-semibold mt-2">{r.diagnosis}</p>
                <p className="text-[11px] text-muted-foreground">{r.department} • {r.doctor}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">{r.date}</p>
                <Badge className={`mt-1 text-[9px] ${r.emrSync === 'SYNCED' ? 'bg-emerald-500' : r.emrSync === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'} text-white`}>
                  EMR {r.emrSync}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{r.summary}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setView(r)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'PDF generated', description: `Watermarked copy of ${r.id} downloaded.` })}><Download className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Share link created', description: 'One-time link valid for 24 hours.' })}><Share2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{view.diagnosis}</DialogTitle>
                <DialogDescription>{view.department} • {view.doctor} • {view.date}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Visit ID</p>
                  <p className="font-mono">{view.visitId}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Clinical Summary</p>
                  <p>{view.summary}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Treatment</p>
                  <p>{view.treatment}</p>
                </div>
                {view.sensitive && !showSensitive && (
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-xs flex items-start gap-2">
                    <Lock className="h-4 w-4 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-800 dark:text-rose-200">Sensitive notes restricted</p>
                      <p className="text-rose-700 dark:text-rose-300">Toggle "Show sensitive" to view (logged).</p>
                    </div>
                  </div>
                )}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-[11px] text-amber-800 dark:text-amber-200">
                  <ScrollText className="h-3.5 w-3.5 inline mr-1" /> This view was logged in your access history.
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PatientShell>
  );
};

// ============================================================
// 5. LAB RESULTS
// ============================================================
export const PatientLab = () => {
  const [view, setView] = useState<typeof myLabs[0] | null>(null);

  return (
    <PatientShell title="Lab Results">
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <SummaryTile icon={CheckCircle2} label="Released" value={String(myLabs.filter(l => l.status === 'RELEASED').length)} accent="bg-emerald-500/10 text-emerald-600" />
        <SummaryTile icon={Clock}        label="In Progress" value={String(myLabs.filter(l => !['RELEASED'].includes(l.status)).length)} accent="bg-amber-500/10 text-amber-600" />
        <SummaryTile icon={FlaskConical} label="Total Tests" value={String(myLabs.length)} accent="bg-sky-500/10 text-sky-600" />
      </div>

      <div className="bg-card border rounded-2xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lab ID</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myLabs.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.id}</TableCell>
                <TableCell><p className="font-medium text-sm">{l.testName}</p><p className="text-[10px] text-muted-foreground">{l.category} • {l.priority}</p></TableCell>
                <TableCell className="text-xs">{l.requestedAt}</TableCell>
                <TableCell><StatusBadge status={l.status === 'RELEASED' ? 'Active' : 'Pending'} /></TableCell>
                <TableCell>
                  {l.status === 'RELEASED' ? (
                    <Button size="sm" onClick={() => setView(l)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Awaiting result</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> {view.testName}</DialogTitle>
                <DialogDescription>{view.id} • Verified {view.verifiedAt}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Table>
                  <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead>Value</TableHead><TableHead>Flag</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {view.results?.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.parameter}</TableCell>
                        <TableCell className="font-mono">{r.value}</TableCell>
                        <TableCell>{r.flag && <Badge className={r.flag === 'High' ? 'bg-rose-500' : r.flag === 'Low' ? 'bg-amber-500' : 'bg-emerald-500'}>{r.flag}</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {view.remarks && <div className="rounded-lg bg-muted/40 p-3 text-xs"><p className="font-semibold mb-1">Lab Remarks</p>{view.remarks}</div>}
                <p className="text-[10px] text-muted-foreground"><ShieldCheck className="h-3 w-3 inline mr-1" /> Verified by {view.verifiedBy}. Tamper-proof, EMR-synced.</p>
                <Button className="w-full" variant="outline"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PatientShell>
  );
};

// ============================================================
// 6. PRESCRIPTIONS
// ============================================================
export const PatientPrescriptions = () => {
  const { toast } = useToast();
  return (
    <PatientShell title="Prescriptions">
      <div className="space-y-3">
        {myRx.length === 0 && <div className="bg-card border rounded-2xl p-8 text-center text-sm text-muted-foreground">No prescriptions yet.</div>}
        {myRx.map(rx => (
          <div key={rx.id} className="bg-card border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{rx.id}</p>
                <p className="font-display font-semibold">{rx.diagnosis}</p>
                <p className="text-[11px] text-muted-foreground">Prescribed by {rx.prescribedBy} • {rx.prescribedAt}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={rx.status === 'DISPENSED' ? 'Active' : 'Pending'} />
                <Badge variant="outline" className="text-[10px]">{rx.paymentStatus}</Badge>
              </div>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Drug</TableHead><TableHead>Dose</TableHead><TableHead>Duration</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
              <TableBody>
                {rx.items.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell><p className="font-medium text-sm">{it.drug}</p><p className="text-[10px] text-muted-foreground">{it.strength}</p></TableCell>
                    <TableCell className="text-xs">{it.dose}</TableCell>
                    <TableCell className="text-xs">{it.duration}</TableCell>
                    <TableCell className="text-xs font-medium">{it.qty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast({ title: 'Refill requested', description: 'Pharmacy will review and confirm shortly.' })}>
                <Pill className="h-3.5 w-3.5 mr-1" /> Request Refill
              </Button>
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
              {rx.allergies && <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600"><AlertTriangle className="h-3 w-3 mr-1" /> Allergy: {rx.allergies}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </PatientShell>
  );
};

// ============================================================
// 7. NOTIFICATIONS
// ============================================================
const KIND_META: Record<string, { color: string; icon: any }> = {
  appointment:  { color: 'bg-sky-500',     icon: Calendar },
  payment:      { color: 'bg-amber-500',   icon: CreditCard },
  lab:          { color: 'bg-emerald-500', icon: FlaskConical },
  prescription: { color: 'bg-violet-500',  icon: Pill },
  security:     { color: 'bg-rose-500',    icon: ShieldCheck },
  consent:      { color: 'bg-indigo-500',  icon: KeyRound },
};

export const PatientNotifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const list = filter === 'all' ? patientNotifications : patientNotifications.filter(n => n.kind === filter);

  return (
    <PatientShell title="Notifications">
      <div className="flex flex-wrap gap-2 mb-4">
        {['all', 'appointment', 'payment', 'lab', 'prescription', 'security', 'consent'].map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize ${filter === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:border-primary/40'}`}>
            {k}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map(n => {
          const meta = KIND_META[n.kind];
          const Icon = meta.icon;
          return (
            <button key={n.id} onClick={() => n.link && navigate(n.link)} className={`w-full text-left bg-card border rounded-2xl p-4 hover:shadow-md transition flex items-start gap-3 ${!n.read ? 'border-primary/30 bg-primary/5' : ''}`}>
              <div className={`h-10 w-10 rounded-xl ${meta.color} text-white flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {n.at}
                  <span>•</span>
                  {n.channel.map(c => <Badge key={c} variant="outline" className="text-[9px]">{c}</Badge>)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </PatientShell>
  );
};

// ============================================================
// 8. PROFILE & CONSENT
// ============================================================
export const PatientProfile = () => {
  const { toast } = useToast();
  const [consents, setConsents] = useState(defaultConsents);
  const [profile, setProfile] = useState({
    fullName: PATIENT_NAME, phone: PATIENT_PHONE, email: 'john.doe@gmail.com',
    address: 'Plot 15, Akarigbo Road, Lagos, Nigeria', dob: '1983-07-22',
    nin: '12345678901', emergencyName: 'Jane Doe', emergencyPhone: '+234 802 345 6789', emergencyRel: 'Spouse',
    nokName: 'Mr. James Doe', nokPhone: '+234 803 456 7890', nokRel: 'Father',
  });

  const toggle = (id: string) => setConsents(c => c.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));

  return (
    <PatientShell title="Profile & Consent">
      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Profile</TabsTrigger>
          <TabsTrigger value="consent"><ShieldCheck className="h-4 w-4 mr-1" /> Consent</TabsTrigger>
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-1" /> Security</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-1" /> Access Log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-card border rounded-2xl p-5 text-center">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl">
                {profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <p className="font-display font-bold mt-3">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground font-mono">{PATIENT_ID}</p>
              <Badge className="mt-2 bg-emerald-500 text-white"><ShieldCheck className="h-3 w-3 mr-1" /> Verified</Badge>
              <div className="border-t mt-4 pt-4 text-left text-xs space-y-1.5">
                <p><span className="text-muted-foreground">DOB:</span> {profile.dob}</p>
                <p><span className="text-muted-foreground">NIN:</span> <span className="font-mono">{profile.nin}</span></p>
                <p><span className="text-muted-foreground">Phone:</span> {profile.phone}</p>
              </div>
            </div>
            <div className="md:col-span-2 bg-card border rounded-2xl p-5 space-y-4">
              <h3 className="font-display font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Full Name</Label><Input value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={profile.dob} onChange={e => setProfile({ ...profile, dob: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address</Label><Input value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} /></div>
              </div>
              <h3 className="font-display font-semibold flex items-center gap-2 pt-3 border-t"><Phone className="h-4 w-4 text-rose-500" /> Emergency Contact</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><Label>Name</Label><Input value={profile.emergencyName} onChange={e => setProfile({ ...profile, emergencyName: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={profile.emergencyPhone} onChange={e => setProfile({ ...profile, emergencyPhone: e.target.value })} /></div>
                <div><Label>Relationship</Label><Input value={profile.emergencyRel} onChange={e => setProfile({ ...profile, emergencyRel: e.target.value })} /></div>
              </div>
              <h3 className="font-display font-semibold flex items-center gap-2 pt-3 border-t"><User className="h-4 w-4 text-indigo-500" /> Next of Kin</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div><Label>Name</Label><Input value={profile.nokName} onChange={e => setProfile({ ...profile, nokName: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={profile.nokPhone} onChange={e => setProfile({ ...profile, nokPhone: e.target.value })} /></div>
                <div><Label>Relationship</Label><Input value={profile.nokRel} onChange={e => setProfile({ ...profile, nokRel: e.target.value })} /></div>
              </div>
              <Button className="bg-gradient-to-r from-primary to-accent" onClick={() => toast({ title: 'Profile updated', description: 'Records office will verify changes.' })}>Save Changes</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="consent">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white p-5 mb-4">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Privacy & Consent</h3>
            <p className="text-sm opacity-90 mt-1">Compliant with NDPR. You may revoke any permission at any time. Changes take effect immediately and are logged.</p>
          </div>
          <div className="space-y-2">
            {(['sharing', 'usage', 'download'] as const).map(cat => (
              <div key={cat} className="bg-card border rounded-2xl p-4">
                <p className="text-[11px] uppercase font-semibold text-muted-foreground mb-2">{cat}</p>
                <div className="space-y-2">
                  {consents.filter(c => c.category === cat).map(c => (
                    <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-muted/40">
                      <div>
                        <p className="text-sm font-semibold">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{c.description}</p>
                      </div>
                      <Switch checked={c.enabled} onCheckedChange={() => { toggle(c.id); toast({ title: c.enabled ? 'Permission revoked' : 'Permission granted', description: c.label }); }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> Trusted Devices</h3>
              <div className="space-y-2">
                {patientDevices.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">{d.name} {d.current && <Badge className="bg-emerald-500 text-white text-[9px]">This device</Badge>}</p>
                      <p className="text-[11px] text-muted-foreground">{d.location} • {d.lastSeen}</p>
                    </div>
                    {!d.current && <Button size="sm" variant="ghost" className="text-rose-600">Sign out</Button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border rounded-2xl p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Account Security</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="text-sm font-semibold">OTP via SMS</p><p className="text-[11px] text-muted-foreground">Required at every sign-in</p></div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="text-sm font-semibold">Login alerts</p><p className="text-[11px] text-muted-foreground">SMS + In-App for new devices</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="text-sm font-semibold">Auto sign-out</p><p className="text-[11px] text-muted-foreground">After 15 minutes idle</p></div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div><p className="text-sm font-semibold">PIN / Biometric</p><p className="text-[11px] text-muted-foreground">Coming soon</p></div>
                  <Switch disabled />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="bg-card border rounded-2xl p-4">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> Who accessed your record</h3>
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Resource</TableHead></TableRow></TableHeader>
              <TableBody>
                {accessLogs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs whitespace-nowrap">{l.at}</TableCell>
                    <TableCell><p className="text-sm font-medium">{l.actor}</p><p className="text-[10px] text-muted-foreground">{l.role}</p></TableCell>
                    <TableCell className="text-xs">{l.action}</TableCell>
                    <TableCell className="font-mono text-[11px]">{l.resource}{l.ip && <p className="text-[10px] text-muted-foreground">{l.device} • {l.ip}</p>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </PatientShell>
  );
};

// ============================================================
// 9. BOOKING HISTORY
// ============================================================
export const PatientHistory = () => (
  <PatientShell title="Booking History">
    <div className="bg-card border rounded-2xl p-4">
      <Table>
        <TableHeader><TableRow><TableHead>Booking Code</TableHead><TableHead>Service</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {appointments.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.bookingCode}</TableCell>
              <TableCell>{a.department}</TableCell>
              <TableCell>{a.doctor}</TableCell>
              <TableCell>{a.date}</TableCell>
              <TableCell>{a.time}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </PatientShell>
);
