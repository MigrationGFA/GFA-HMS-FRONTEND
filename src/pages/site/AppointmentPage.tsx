import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  User,
  Stethoscope,
  Calendar,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Phone,
  Mail,
  Sparkles,
  Loader2,
  UserPlus,
  UserCheck,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SiteLayout from '@/components/site/SiteLayout';
import PageHero from '@/components/site/PageHero';
import { formatCurrency } from '@/data/dummyData';
import { consultationTypes } from '@/data/invoiceData';
import {
  isBillingServicesApiEnabled,
  listBookableServices,
  type BookableService,
} from '@/lib/api/billing-services';
import {
  confirmPublicVerification,
  createPublicBooking,
  getPublicRegistrationCharges,
  listPublicAvailability,
  lookupPublicPatient,
  sendPublicVerification,
  type AvailabilitySlot,
  type MaskedPatientMatch,
  type PublicRegistrationCharges,
} from '@/lib/api/appointments';
import { ApiError } from '@/lib/api/client';
import { toast } from 'sonner';

type PatientPath = 'new' | 'returning' | null;

type StepDef = { id: number; title: string; icon: typeof User };

function modesForDelivery(deliveryMode?: string): Array<'PHYSICAL' | 'ONLINE'> {
  if (deliveryMode === 'ONLINE') return ['ONLINE'];
  if (deliveryMode === 'PHYSICAL') return ['PHYSICAL'];
  return ['PHYSICAL', 'ONLINE'];
}

function stepsForPath(path: PatientPath): StepDef[] {
  if (!path) {
    return [{ id: 0, title: 'Patient type', icon: User }];
  }
  return [
    { id: 0, title: 'Patient type', icon: User },
    { id: 1, title: path === 'new' ? 'Your details' : 'Verify identity', icon: path === 'new' ? UserPlus : ShieldCheck },
    { id: 2, title: 'Service', icon: Stethoscope },
    { id: 3, title: 'Schedule', icon: Calendar },
    { id: 4, title: 'Confirm', icon: CreditCard },
  ];
}

const AppointmentPage = () => {
  const [step, setStep] = useState(0);
  const [patientPath, setPatientPath] = useState<PatientPath>(null);
  const [done, setDone] = useState(false);
  const [bookingNo, setBookingNo] = useState<string | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [feeBreakdown, setFeeBreakdown] = useState<{
    service: number;
    registration: number;
    card: number;
    total: number;
  } | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    nin: '',
    serviceId: '',
    consultationType: '',
    mode: 'PHYSICAL' as 'PHYSICAL' | 'ONLINE' | string,
    department: '',
    date: new Date().toISOString().slice(0, 10),
    time: '',
    notes: '',
  });

  const [bookable, setBookable] = useState<BookableService[]>([]);
  const [serviceQ, setServiceQ] = useState('');
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [regCharges, setRegCharges] = useState<PublicRegistrationCharges | null>(null);

  // Returning patient flow
  const [lookupQ, setLookupQ] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [matches, setMatches] = useState<MaskedPatientMatch[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [verifiedPerson, setVerifiedPerson] = useState<{
    personId: number;
    firstName: string | null;
    lastName: string | null;
    hospitalNo: string | null;
    phone: string | null;
  } | null>(null);

  const apiOn = isBillingServicesApiEnabled();
  const steps = stepsForPath(patientPath);

  const loadServices = useCallback(
    async (q?: string) => {
      if (!apiOn) return;
      setServicesLoading(true);
      setServicesError(null);
      try {
        const res = await listBookableServices({ q: q?.trim() || undefined });
        const items = res && Array.isArray(res.items) ? res.items : [];
        setBookable(items);
      } catch (e) {
        setServicesError(e instanceof Error ? e.message : 'Could not load services');
        setBookable([]);
      } finally {
        setServicesLoading(false);
      }
    },
    [apiOn],
  );

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!apiOn) return;
    const handle = window.setTimeout(() => void loadServices(serviceQ), 350);
    return () => window.clearTimeout(handle);
  }, [apiOn, serviceQ, loadServices]);

  useEffect(() => {
    if (!apiOn || patientPath !== 'new') return;
    getPublicRegistrationCharges()
      .then(setRegCharges)
      .catch(() => setRegCharges(null));
  }, [apiOn, patientPath]);

  const useLiveServices = apiOn && (bookable?.length ?? 0) > 0;

  const selectedLive = useMemo(
    () => (bookable ?? []).find((s) => String(s.serviceId) === form.serviceId),
    [bookable, form.serviceId],
  );
  const selectedConsultation = consultationTypes.find((c) => c.id === form.consultationType);

  const allowedModes = useLiveServices
    ? modesForDelivery(selectedLive?.deliveryMode)
    : (['PHYSICAL', 'ONLINE'] as const);

  const serviceName = useLiveServices ? selectedLive?.name : selectedConsultation?.name;
  const servicePrice = useLiveServices
    ? livePrice ?? selectedLive?.generalPrice ?? 0
    : selectedConsultation?.basePrice ?? 0;
  const regFee = patientPath === 'new' ? (regCharges?.regFee ?? 0) : 0;
  const cardFee = patientPath === 'new' ? (regCharges?.cardFee ?? 0) : 0;
  const total = servicePrice + regFee + cardFee;

  const displayName =
    patientPath === 'returning' && verifiedPerson
      ? [verifiedPerson.firstName, verifiedPerson.lastName].filter(Boolean).join(' ')
      : `${form.firstName} ${form.lastName}`.trim();

  const update = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const selectLiveService = (svc: BookableService) => {
    const modes = modesForDelivery(svc.deliveryMode);
    setForm((s) => ({
      ...s,
      serviceId: String(svc.serviceId),
      consultationType: '',
      department: svc.departmentName || s.department,
      mode: modes.includes(s.mode as 'PHYSICAL' | 'ONLINE') ? s.mode : modes[0],
      time: '',
    }));
    setLivePrice(svc.generalPrice);
    setSlots([]);
  };

  useEffect(() => {
    if (!useLiveServices || !form.serviceId || !form.date || !form.mode) return;
    if (form.mode !== 'PHYSICAL' && form.mode !== 'ONLINE') return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    listPublicAvailability({
      serviceId: Number(form.serviceId),
      date: form.date,
      mode: form.mode,
    })
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setLivePrice(res.price);
        if (form.time && !res.slots.some((s) => s.start === form.time && s.available)) {
          setForm((f) => ({ ...f, time: '' }));
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsError(e instanceof ApiError ? e.message : 'Could not load slots');
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useLiveServices, form.serviceId, form.date, form.mode]);

  const choosePath = (path: 'new' | 'returning') => {
    setPatientPath(path);
    setStep(1);
    setVerificationToken(null);
    setVerifiedPerson(null);
    setDisplayCode(null);
    setOtpCode('');
    setSelectedPersonId(null);
    setMatches([]);
  };

  const validateStep = (): boolean => {
    if (step === 1 && patientPath === 'new') {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        toast.error('First and last name are required');
        return false;
      }
      if (form.phone.trim().length < 10) {
        toast.error('Phone number is required (at least 10 digits)');
        return false;
      }
    }
    if (step === 1 && patientPath === 'returning') {
      if (!verificationToken || !verifiedPerson) {
        toast.error('Verify your identity before continuing');
        return false;
      }
    }
    if (step === 2) {
      if (useLiveServices && !form.serviceId) {
        toast.error('Select a service');
        return false;
      }
      if (!useLiveServices && !form.consultationType) {
        toast.error('Select a service');
        return false;
      }
    }
    if (step === 3) {
      if (!form.date || !form.time) {
        toast.error('Select a date and available time');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  };
  const back = () => {
    if (step === 1) {
      setPatientPath(null);
      setStep(0);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const doLookup = async () => {
    if (!apiOn) {
      toast.error('API is not configured');
      return;
    }
    if (lookupQ.trim().length < 3) {
      toast.error('Enter at least 3 characters');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await lookupPublicPatient(lookupQ.trim());
      setMatches(res.items);
      if (res.items.length === 0) toast.message('No matching patients found');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Lookup failed');
      setMatches([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const doSendOtp = async (personId: number) => {
    setSelectedPersonId(personId);
    setOtpSending(true);
    setDisplayCode(null);
    setVerificationToken(null);
    setVerifiedPerson(null);
    try {
      const res = await sendPublicVerification(personId);
      setDisplayCode(res.displayCode);
      toast.success('Verification code ready (shown on screen for testing)');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not send code');
    } finally {
      setOtpSending(false);
    }
  };

  const doConfirmOtp = async () => {
    if (!selectedPersonId || !otpCode.trim()) {
      toast.error('Enter the verification code');
      return;
    }
    setOtpConfirming(true);
    try {
      const res = await confirmPublicVerification(selectedPersonId, otpCode.trim());
      setVerificationToken(res.verificationToken);
      setVerifiedPerson(res.person);
      if (res.person?.phone) update('phone', res.person.phone);
      if (res.person?.email) update('email', res.person.email ?? '');
      if (res.person?.firstName) update('firstName', res.person.firstName);
      if (res.person?.lastName) update('lastName', res.person.lastName);
      toast.success('Identity verified');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Invalid code');
    } finally {
      setOtpConfirming(false);
    }
  };

  const confirmBooking = async () => {
    if (!useLiveServices) {
      setBookingNo(`GFA HMS-${Math.floor(Math.random() * 9000 + 1000)}`);
      setFeeBreakdown({
        service: servicePrice,
        registration: regFee,
        card: cardFee,
        total,
      });
      setPaymentStatus('Pending');
      setDone(true);
      return;
    }
    if (!form.serviceId || !form.time || !form.date || !patientPath) {
      toast.error('Select a service, date and available time');
      return;
    }
    if (form.mode !== 'PHYSICAL' && form.mode !== 'ONLINE') {
      toast.error('Select a valid visit mode');
      return;
    }
    setBookingBusy(true);
    try {
      const booking = await createPublicBooking({
        serviceId: Number(form.serviceId),
        date: form.date,
        startTime: form.time,
        mode: form.mode,
        patientType: patientPath === 'new' ? 'NEW' : 'RETURNING',
        phone: (patientPath === 'returning' ? verifiedPerson?.phone : form.phone)?.trim() || form.phone.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
        nin: form.nin.trim() || undefined,
        notes: form.notes.trim() || undefined,
        personId: patientPath === 'returning' ? verifiedPerson?.personId : undefined,
        verificationToken: patientPath === 'returning' ? verificationToken ?? undefined : undefined,
      });
      setBookingNo(booking.bookingNo);
      setLivePrice(booking.feeBreakdown?.service ?? booking.priceAmount);
      setFeeBreakdown(booking.feeBreakdown ?? { service: booking.priceAmount, registration: 0, card: 0, total: booking.priceAmount });
      setPaymentStatus(booking.paymentStatus ?? 'Pending');
      setDone(true);
      toast.success('Appointment booked');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Booking failed');
    } finally {
      setBookingBusy(false);
    }
  };

  const resetAll = () => {
    setDone(false);
    setStep(0);
    setPatientPath(null);
    setBookingNo(null);
    setFeeBreakdown(null);
    setVerificationToken(null);
    setVerifiedPerson(null);
    setDisplayCode(null);
    setForm({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      nin: '',
      serviceId: '',
      consultationType: '',
      mode: 'PHYSICAL',
      department: '',
      date: new Date().toISOString().slice(0, 10),
      time: '',
      notes: '',
    });
  };

  if (done) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Booking Confirmed"
          title={<>Thank you, your appointment is <span className="text-tertiary">booked</span></>}
          description="Please arrive early and pay at the cashier on arrival. Bring a valid ID."
          crumbs={[{ label: 'Appointment', to: '/appointment' }, { label: 'Confirmed' }]}
        />
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="bg-card rounded-2xl border shadow-card p-8 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-green flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-tertiary" />
              </div>
              <h2 className="mt-4 font-display font-bold text-2xl text-foreground">
                Appointment #{bookingNo}
              </h2>
              <p className="text-muted-foreground mt-1">{form.date} at {form.time}</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-left text-sm bg-muted/40 rounded-xl p-4">
                <div><span className="text-muted-foreground">Patient</span><div className="font-semibold text-foreground">{displayName || '—'}</div></div>
                <div><span className="text-muted-foreground">Type</span><div className="font-semibold text-foreground">{patientPath === 'new' ? 'New' : 'Returning'}</div></div>
                <div><span className="text-muted-foreground">Service</span><div className="font-semibold text-foreground">{serviceName || '—'}</div></div>
                <div><span className="text-muted-foreground">Mode</span><div className="font-semibold text-foreground">{form.mode === 'ONLINE' ? 'Online' : 'Physical'}</div></div>
                <div><span className="text-muted-foreground">Payment</span><div className="font-semibold text-amber-700">{paymentStatus}</div></div>
                <div><span className="text-muted-foreground">Total</span><div className="font-semibold text-tertiary">{formatCurrency(feeBreakdown?.total ?? total)}</div></div>
              </div>
              {feeBreakdown && (
                <div className="mt-3 text-left text-xs text-muted-foreground space-y-1 px-1">
                  <div className="flex justify-between"><span>Service</span><span>{formatCurrency(feeBreakdown.service)}</span></div>
                  {feeBreakdown.registration > 0 && <div className="flex justify-between"><span>Registration</span><span>{formatCurrency(feeBreakdown.registration)}</span></div>}
                  {feeBreakdown.card > 0 && <div className="flex justify-between"><span>Card fee</span><span>{formatCurrency(feeBreakdown.card)}</span></div>}
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">Pay at the hospital cashier on arrival. A clinician will be assigned for your slot.</p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <Link to="/login"><Button className="bg-hero-gradient text-white">Go to Patient Portal <ArrowRight className="h-4 w-4" /></Button></Link>
                <Button variant="outline" onClick={resetAll}>Book Another</Button>
              </div>
            </div>
          </div>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Book Appointment"
        title={<>Reserve a slot in <span className="text-tertiary">under 60 seconds</span></>}
        description="New or returning patient — choose a service and time. A clinician will be assigned; pay at the hospital on arrival."
        crumbs={[{ label: 'Book Appointment' }]}
      />

      <section className="py-12">
        <div className="container mx-auto px-4 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border shadow-card p-5 mb-6 -mt-12 relative z-10">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {steps.map((s, i) => {
                  const active = step === s.id;
                  const complete = step > s.id;
                  return (
                    <div key={s.id} className="flex-1 flex items-center min-w-[72px]">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                          complete ? 'bg-tertiary text-white' : active ? 'bg-hero-gradient text-white shadow-lg scale-110' : 'bg-muted text-muted-foreground'
                        }`}>
                          {complete ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                        </div>
                        <div className={`mt-2 text-[11px] font-semibold text-center ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</div>
                      </div>
                      {i < steps.length - 1 && <div className={`h-0.5 flex-1 -mt-6 ${step > s.id ? 'bg-tertiary' : 'bg-muted'}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card rounded-2xl border shadow-card p-6 md:p-8 min-h-[420px]">
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-xl text-foreground">Are you a new or returning patient?</h2>
                  <p className="text-sm text-muted-foreground">This helps us show the right fees and verify your record.</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <button
                      type="button"
                      onClick={() => choosePath('new')}
                      className="text-left rounded-2xl border-2 p-6 hover:border-primary hover:bg-primary/5 transition"
                    >
                      <UserPlus className="h-8 w-8 text-primary mb-3" />
                      <div className="font-display font-bold text-lg">New patient</div>
                      <p className="text-xs text-muted-foreground mt-1">First visit — we will collect basic details and registration fees.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => choosePath('returning')}
                      className="text-left rounded-2xl border-2 p-6 hover:border-primary hover:bg-primary/5 transition"
                    >
                      <UserCheck className="h-8 w-8 text-tertiary mb-3" />
                      <div className="font-display font-bold text-lg">Returning patient</div>
                      <p className="text-xs text-muted-foreground mt-1">Already registered — verify with a code, then book (service fee only).</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && patientPath === 'new' && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-xl text-foreground">Basic information</h2>
                  <p className="text-sm text-muted-foreground">Only what we need to create your record. Full medical history is collected at the hospital.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>First name *</Label><Input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></div>
                    <div><Label>Last name *</Label><Input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></div>
                    <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="080xxxxxxxx" /></div>
                    <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></div>
                    <div className="sm:col-span-2"><Label>NIN (optional)</Label><Input value={form.nin} onChange={(e) => update('nin', e.target.value)} placeholder="National Identification Number" /></div>
                  </div>
                </div>
              )}

              {step === 1 && patientPath === 'returning' && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-xl text-foreground">Verify your identity</h2>
                  <p className="text-sm text-muted-foreground">Search by phone, name, or hospital number. We will show a verification code on screen for testing.</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" value={lookupQ} onChange={(e) => setLookupQ(e.target.value)} placeholder="Phone, name or hospital no…" onKeyDown={(e) => { if (e.key === 'Enter') void doLookup(); }} />
                    </div>
                    <Button variant="outline" onClick={() => void doLookup()} disabled={lookupLoading}>
                      {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {matches.map((m) => (
                      <button
                        key={m.personId}
                        type="button"
                        onClick={() => void doSendOtp(m.personId)}
                        disabled={otpSending}
                        className={`w-full text-left rounded-xl border p-3 transition ${
                          selectedPersonId === m.personId ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
                        }`}
                      >
                        <div className="font-semibold text-sm">{m.displayName}</div>
                        <div className="text-xs text-muted-foreground">{m.phoneMasked} · {m.hospitalNoMasked}</div>
                      </button>
                    ))}
                  </div>
                  {displayCode && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3">
                      <p className="text-xs text-amber-900 font-medium">
                        Testing only — in production this code will be sent by SMS/email. Your code:
                      </p>
                      <div className="text-2xl font-mono font-bold tracking-widest text-foreground">{displayCode}</div>
                      <div>
                        <Label>Enter code</Label>
                        <div className="flex gap-2 mt-1">
                          <Input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="6-digit code" />
                          <Button onClick={() => void doConfirmOtp()} disabled={otpConfirming}>
                            {otpConfirming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                          </Button>
                        </div>
                      </div>
                      {verifiedPerson && (
                        <p className="text-sm text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Verified — {[verifiedPerson.firstName, verifiedPerson.lastName].filter(Boolean).join(' ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-xl text-foreground">Choose your service</h2>
                  {apiOn && (
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={serviceQ}
                        onChange={(e) => setServiceQ(e.target.value)}
                        placeholder="Search services…"
                      />
                    </div>
                  )}
                  {apiOn && servicesLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
                    </div>
                  )}
                  {apiOn && servicesError && (
                    <p className="text-xs text-destructive">{servicesError}</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
                    {useLiveServices
                      ? bookable.map((c) => (
                          <button
                            key={c.serviceId}
                            type="button"
                            onClick={() => selectLiveService(c)}
                            className={`text-left rounded-xl border p-3 transition ${
                              form.serviceId === String(c.serviceId)
                                ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                : 'hover:border-primary/40'
                            }`}
                          >
                            <div className="font-semibold text-sm text-foreground">{c.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.departmentName}
                              {c.durationMinutes != null ? ` · ${c.durationMinutes} min` : ''}
                              {c.deliveryMode ? ` · ${c.deliveryMode}` : ''}
                            </div>
                            <div className="text-sm font-semibold text-tertiary mt-1">
                              {formatCurrency(c.generalPrice ?? 0)}
                            </div>
                          </button>
                        ))
                      : consultationTypes.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              update('consultationType', c.id);
                              update('serviceId', '');
                            }}
                            className={`text-left rounded-xl border p-3 transition ${
                              form.consultationType === c.id
                                ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                : 'hover:border-primary/40'
                            }`}
                          >
                            <div className="font-semibold text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">From {formatCurrency(c.basePrice)}</div>
                          </button>
                        ))}
                  </div>
                  {useLiveServices && bookable.length === 0 && !servicesLoading && (
                    <p className="text-sm text-muted-foreground">No bookable services found.</p>
                  )}
                  <div>
                    <Label>Visit mode *</Label>
                    <Select
                      value={form.mode === 'Physical' ? 'PHYSICAL' : form.mode === 'Online' ? 'ONLINE' : form.mode}
                      onValueChange={(v) => {
                        update('mode', v);
                        update('time', '');
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allowedModes.map((m) => (
                          <SelectItem key={m} value={m}>{m === 'ONLINE' ? 'Online' : 'Physical (in hospital)'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-display font-bold text-xl text-foreground">Pick a date and time</h2>
                  <p className="text-sm text-muted-foreground">A clinician will be assigned — doctor names are not shown for online booking.</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        min={new Date().toISOString().slice(0, 10)}
                        value={form.date}
                        onChange={(e) => { update('date', e.target.value); update('time', ''); }}
                      />
                    </div>
                    {useLiveServices && selectedLive && (
                      <div className="text-sm text-muted-foreground flex items-end pb-2">
                        {selectedLive.durationMinutes ?? 30} min slots · {formatCurrency(selectedLive.generalPrice ?? 0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Available time slots</Label>
                    {useLiveServices && slotsLoading && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
                      </div>
                    )}
                    {slotsError && <p className="mt-2 text-xs text-destructive">{slotsError}</p>}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                      {slots.map((slot) => {
                        const taken = !slot.available;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            disabled={taken}
                            onClick={() => update('time', slot.start)}
                            className={`text-xs font-semibold py-2 rounded-lg border transition ${
                              taken
                                ? 'bg-muted text-muted-foreground/40 cursor-not-allowed line-through opacity-60'
                                : form.time === slot.start
                                  ? 'bg-hero-gradient text-white border-transparent shadow'
                                  : 'bg-card hover:border-primary text-foreground'
                            }`}
                          >
                            <div>{slot.start}</div>
                            {!taken && slot.remainingSpots != null && (
                              <div className="text-[9px] font-normal opacity-80">{slot.remainingSpots} left</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {useLiveServices && !slotsLoading && slots.length === 0 && !slotsError && (
                      <p className="mt-2 text-xs text-muted-foreground">No slots for this date. Pick another day.</p>
                    )}
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input placeholder="Brief reason for visit" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <h2 className="font-display font-bold text-xl text-foreground">Confirm booking</h2>
                  <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm">
                    <Row label="Patient" value={displayName || '—'} />
                    <Row label="Type" value={patientPath === 'new' ? 'New patient' : 'Returning patient'} />
                    <Row label="Phone" value={form.phone || verifiedPerson?.phone || '—'} />
                    <Row label="Service" value={serviceName || '—'} />
                    <Row label="Mode" value={form.mode === 'ONLINE' ? 'Online' : 'Physical'} />
                    <Row label="Date / Time" value={`${form.date} · ${form.time || 'TBA'}`} />
                  </div>
                  <div className="rounded-xl border p-4 space-y-2 text-sm">
                    <div className="font-semibold mb-2">Payment summary</div>
                    <div className="flex justify-between"><span>Service fee</span><span>{formatCurrency(servicePrice)}</span></div>
                    {patientPath === 'new' && (
                      <>
                        <div className="flex justify-between"><span>Registration fee</span><span>{formatCurrency(regFee)}</span></div>
                        <div className="flex justify-between"><span>Card fee</span><span>{formatCurrency(cardFee)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total due at hospital</span>
                      <span className="text-tertiary">{formatCurrency(total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">
                      Pay at the cashier on arrival. Online payment is not required to reserve this slot.
                    </p>
                  </div>
                  <div className="rounded-xl bg-hero-gradient p-5 text-white flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-white/80">Amount due</div>
                      <div className="text-3xl font-bold font-display">{formatCurrency(total)}</div>
                    </div>
                    <Sparkles className="h-10 w-10 text-indigo-brand" />
                  </div>
                </div>
              )}

              {step > 0 && (
                <div className="mt-8 flex items-center justify-between gap-3">
                  <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
                  {step < 4 ? (
                    <Button className="bg-hero-gradient text-white" onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button>
                  ) : (
                    <Button className="bg-hero-gradient text-white" onClick={() => void confirmBooking()} disabled={bookingBusy}>
                      {bookingBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm booking
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="bg-card rounded-2xl border shadow-card p-6 -mt-12 relative z-10">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-primary" /> Your Booking</h3>
              <div className="mt-4 space-y-2.5 text-sm">
                <Row label="Path" value={patientPath === 'new' ? 'New' : patientPath === 'returning' ? 'Returning' : '—'} />
                <Row label="Service" value={serviceName || '—'} />
                <Row label="Mode" value={form.mode === 'ONLINE' ? 'Online' : form.mode === 'PHYSICAL' ? 'Physical' : form.mode || '—'} />
                <Row label="Date" value={form.date} />
                <Row label="Time" value={form.time || '—'} />
              </div>
              <div className="mt-5 pt-4 border-t flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated total</span>
                <span className="font-display font-bold text-lg text-tertiary">{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-rose border p-5">
              <h4 className="font-display font-semibold text-foreground">Need help?</h4>
              <p className="text-xs text-muted-foreground mt-1">Our patient liaison team is ready to assist.</p>
              <div className="mt-3 space-y-2 text-sm">
                <a className="flex items-center gap-2 text-foreground hover:text-accent" href="tel:+2348034567890"><Phone className="h-4 w-4 text-accent" /> +234 803 456 7890</a>
                <a className="flex items-center gap-2 text-foreground hover:text-accent" href="mailto:appointments@gfa-health.demo"><Mail className="h-4 w-4 text-accent" /> appointments@gfa-health.demo</a>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="text-foreground font-medium text-right truncate">{value}</span>
  </div>
);

export default AppointmentPage;
