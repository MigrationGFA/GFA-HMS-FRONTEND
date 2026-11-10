import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_PASSWORD, demoLogins, type UserRole } from '@/data/dummyData';
import { Activity, Shield, HeartPulse, Users, ArrowLeft, Eye, EyeOff, CheckCircle2, Sparkles } from 'lucide-react';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { getRoleHomePath } from '@/lib/rolePaths';
import { changePassword, isUsersApiEnabled } from '@/lib/api/users';
import { Button } from '@/components/ui/button';

const LoginPage = () => {
  const { loginAsync, register, clearMustResetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { run, isBusy } = useAsyncAction();
  const [loginIdentifier, setLoginIdentifier] = useState('admin@gfa-health.demo');
  const [loginPassword, setLoginPassword] = useState(DEMO_PASSWORD);
  const [showPwd, setShowPwd] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('patient');
  const [regPassword, setRegPassword] = useState('');

  const [forceResetOpen, setForceResetOpen] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const guessRole = (email: string): UserRole => {
    const e = email.toLowerCase();
    if (e.includes('super') || e.includes('root')) return 'superadmin';
    if (e.includes('board')) return 'board';
    if (e.includes('cmd')) return 'cmd';
    if (e.includes('finance')) return 'finance';
    if (e.includes('hr')) return 'hr';
    if (e.includes('eye') || e.includes('ophthal') || e.includes('optom')) return 'eye';
    if (e.includes('paeds') || e.includes('paediatr') || e.includes('pediatr')) return 'paeds';
    if (e.includes('dental') || e.includes('dentist')) return 'dental';
    if (e.includes('doctor')) return 'doctor';
    if (e.includes('it')) return 'it';
    if (e.includes('nurse')) return 'nurse';
    if (e.includes('pharm')) return 'pharmacist';
    if (e.includes('radiology') || e.includes('radio') || e.includes('imaging')) return 'radiology';
    if (e.includes('cap') || e.includes('child') || e.includes('adolescent') || e.includes('paedpsych')) return 'cap';
    if (e.includes('addiction') || e.includes('rehab') || e.includes('detox') || e.includes('substance')) return 'addiction';
    if (e.includes('psychogeriatric') || e.includes('geriatric') || e.includes('elderly') || e.includes('dementia')) return 'psychogeriatrics';
    if (e.includes('speech') || e.includes('slt') || e.includes('swallow') || e.includes('dysphagia') || e.includes('language')) return 'speech';
    if (e.includes('physio') || e.includes('physiotherapy') || e.includes('mobility')) return 'physiotherapy';
    if (e.includes('nutrition') || e.includes('dietetic') || e.includes('dietitian') || e.includes('diet') || e.includes('kitchen') || e.includes('catering')) return 'nutrition';
    if (e.includes('socialwork') || e.includes('social-work') || e.includes('social') || e.includes('welfare') || e.includes('community-support')) return 'socialwork';
    if (e.includes('icu') || e.includes('critical') || e.includes('hdu') || e.includes('ventilator') || e.includes('codeblue') || e.includes('code-blue')) return 'icu';
    if (e.includes('psychopc') || e.includes('opc') || e.includes('outpatient')) return 'psychopc';
    if (e.includes('psychology') || e.includes('psych')) return 'psychology';
    if (e.includes('lab')) return 'lab';
    if (e.includes('cashier')) return 'cashier';
    if (e.includes('records')) return 'records';
    if (e.includes('admin')) return 'admin';
    if (e.includes('staff')) return 'staff';
    if (e.includes('student')) return 'student';
    return 'patient';
  };

  const handleLogin = async () => {
    if (!loginIdentifier.trim()) {
      notify.error('login', 'Phone number or email is required');
      return;
    }
    await run(
      'login',
      `Signing in as ${loginIdentifier}…`,
      () => {
        return loginAsync(loginIdentifier, loginPassword).then((result) => {
          if (!result.ok) {
            return {
              ok: false as const,
              message: `Sign-in failed — staff use phone + last 4 digits of phone as temporary PIN. Demo accounts use "${DEMO_PASSWORD}".`,
            };
          }
          const role = result.role || guessRole(loginIdentifier);
          return {
            ok: true as const,
            role,
            path: getRoleHomePath(role),
            mustResetPassword: Boolean(result.mustResetPassword),
          };
        });
      },
      (r) =>
        r.mustResetPassword
          ? 'Signed in — please set a new PIN to continue'
          : `Welcome — signed in as ${r.role}. Redirecting…`,
      (r) => r.message ?? 'Sign-in failed',
    ).then((r) => {
      if (!r || !('path' in r)) return;
      if (r.mustResetPassword && isUsersApiEnabled()) {
        setTempPin(loginPassword);
        setPendingPath(r.path);
        setForceResetOpen(true);
        return;
      }
      navigate(r.path);
    });
  };

  const handleForceReset = async () => {
    if (newPin.length < 4) {
      notify.error('reset-pin', 'New PIN must be at least 4 characters');
      return;
    }
    if (newPin !== confirmPin) {
      notify.error('reset-pin', 'New PIN and confirmation do not match');
      return;
    }
    if (newPin === tempPin) {
      notify.error('reset-pin', 'New PIN must be different from the temporary PIN');
      return;
    }
    setResetBusy(true);
    try {
      await changePassword({
        currentPassword: tempPin,
        newPassword: newPin,
      });
      clearMustResetPassword();
      setForceResetOpen(false);
      notify.success('reset-pin', 'PIN updated. Continuing…');
      navigate(pendingPath || getRoleHomePath(user?.role || 'staff'));
    } catch {
      notify.error('reset-pin', 'Could not update PIN. Check the temporary PIN and try again.');
    } finally {
      setResetBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim()) {
      notify.error('register', 'Name and email are required');
      return;
    }
    await run(
      'register',
      `Creating account for ${regEmail}…`,
      () => {
        const ok = register(regName, regEmail, regRole, regPassword);
        if (!ok) return { ok: false, message: 'Registration failed — try a different email.' };
        return { ok: true as const, path: getRoleHomePath(regRole) };
      },
      () => `Account created for ${regName}. Redirecting to dashboard…`,
      (r) => r.message ?? 'Registration failed',
    ).then((r) => {
      if (r && 'path' in r) navigate(r.path);
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-muted/30">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-hero-gradient text-white overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
          <div className="mt-12 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-xl">GFA HMS</div>
              <div className="text-xs text-white/70 -mt-0.5">Demo Hospital</div>
            </div>
          </div>
          <h1 className="mt-12 text-4xl font-display font-bold leading-tight max-w-md">
            Welcome to the GFA HMS Digital Health Platform
          </h1>
          <p className="mt-4 text-white/80 max-w-md">
            One secure account to manage appointments, records, billing and clinical workflows across the hospital.
          </p>
          <div className="mt-10 space-y-4 max-w-md">
            {[
              { icon: Shield, title: 'Bank-grade Security', desc: 'Encrypted records with strict role-based access' },
              { icon: HeartPulse, title: 'Real-time Clinical Data', desc: 'Live EMR sync across departments' },
              { icon: Users, title: '15 Integrated Roles', desc: 'From Board level to bedside care' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 bg-white/10 backdrop-blur ring-1 ring-white/15 rounded-xl p-3.5">
                <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">{f.title}</div>
                  <div className="text-xs text-white/70">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-white/60">© 2026 GFA Health Technologies Ltd · GFA Health HMS</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-hero-gradient flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">GFA HMS Smart Hospital</span>
          </Link>
          <div className="bg-card rounded-2xl border shadow-card-hover p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Sign in to your account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Staff: phone number + temporary PIN (last 4 digits of your phone). You will be asked to reset the PIN on first login.
              </p>
            </div>
            <Tabs defaultValue="login">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-5">
                <div>
                  <Label>Phone number or email</Label>
                  <Input
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="080xxxxxxxx or you@gfa-health.demo"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>PIN / Password</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        toast.info(
                          `Migrated staff: temporary PIN is the last 4 digits of your phone. Demo password is "${DEMO_PASSWORD}".`,
                        )
                      }
                    >
                      Forgot PIN?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPwd ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pr-10"
                      placeholder="Last 4 digits of phone"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <LoadingButton
                  className="w-full bg-hero-gradient text-white shadow"
                  size="lg"
                  loading={isBusy('login')}
                  loadingText="Signing in…"
                  onClick={handleLogin}
                >
                  Sign In
                </LoadingButton>

                <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-accent" /> Demo logins (password: {DEMO_PASSWORD})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {demoLogins.map((u) => {
                      const active = loginIdentifier === u.email;
                      return (
                        <button
                          key={u.email}
                          type="button"
                          onClick={() => {
                            setLoginIdentifier(u.email);
                            setLoginPassword(DEMO_PASSWORD);
                          }}
                          className={`group relative rounded-lg border px-2 py-1.5 text-left transition ${active ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border bg-card hover:border-primary/40'}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${u.tone.split(' ')[1]?.replace('text-', 'bg-') || 'bg-primary'}`}
                            />
                            <span className="font-semibold text-[11px] text-foreground truncate">{u.label}</span>
                            {active && <CheckCircle2 className="h-3 w-3 text-primary ml-auto" />}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">{u.email}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-5">
                <div>
                  <Label>Full Name</Label>
                  <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Enter your name" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <Label>I am a...</Label>
                  <Select value={regRole} onValueChange={(v) => setRegRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="patient">Patient</SelectItem>
                      <SelectItem value="student">Medical Student</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="dental">Dental Department</SelectItem>
                      <SelectItem value="eye">Eye Clinic</SelectItem>
                      <SelectItem value="paeds">Paediatrics</SelectItem>
                      <SelectItem value="nurse">Nurse</SelectItem>
                      <SelectItem value="pharmacist">Pharmacist</SelectItem>
                      <SelectItem value="lab">Lab Technician</SelectItem>
                      <SelectItem value="radiology">Radiology / Imaging</SelectItem>
                      <SelectItem value="psychology">Clinical Psychology</SelectItem>
                      <SelectItem value="cap">Child & Adolescent Psychiatry</SelectItem>
                      <SelectItem value="addiction">Addiction Services & Rehab</SelectItem>
                      <SelectItem value="psychogeriatrics">Psychogeriatrics</SelectItem>
                      <SelectItem value="physiotherapy">Physiotherapy</SelectItem>
                      <SelectItem value="speech">Speech Therapy</SelectItem>
                      <SelectItem value="nutrition">Nutrition & Dietetics</SelectItem>
                      <SelectItem value="socialwork">Social Work & Community Support</SelectItem>
                      <SelectItem value="icu">ICU / Critical Care</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                      <SelectItem value="records">Records Officer</SelectItem>
                      <SelectItem value="it">IT / Systems</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cmd">CMD (Executive)</SelectItem>
                      <SelectItem value="board">Board Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create password"
                  />
                </div>
                <LoadingButton
                  className="w-full bg-hero-gradient text-white shadow"
                  size="lg"
                  loading={isBusy('register')}
                  loadingText="Creating account…"
                  onClick={handleRegister}
                >
                  Create Account
                </LoadingButton>
                <p className="text-xs text-center text-muted-foreground">
                  By registering you agree to GFA HMS&apos;s Terms & Privacy Policy.
                </p>
              </TabsContent>
            </Tabs>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Need help? Call <span className="font-semibold text-foreground">+234 803 456 7890</span> or email{' '}
            <span className="font-semibold text-foreground">support@gfa-health.demo</span>
          </p>
        </div>
      </div>

      <Dialog open={forceResetOpen} onOpenChange={() => undefined}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Reset your PIN</DialogTitle>
            <DialogDescription>
              For security, change the temporary PIN (last 4 digits of your phone) before using the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Current temporary PIN</Label>
              <Input
                type="password"
                value={tempPin}
                onChange={(e) => setTempPin(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label>New PIN</Label>
              <Input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="At least 4 characters"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label>Confirm new PIN</Label>
              <Input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleForceReset} disabled={resetBusy}>
              {resetBusy ? 'Saving…' : 'Save PIN and continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
