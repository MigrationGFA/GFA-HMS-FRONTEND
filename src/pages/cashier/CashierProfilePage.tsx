import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cashierNav } from '@/pages/CashierCenter';
import { ApiError } from '@/lib/api/client';
import {
  changePassword,
  getMyProfile,
  isUsersApiEnabled,
  updateMyProfile,
  type UserProfile,
} from '@/lib/api/users';
import { Loader2, UserCog } from 'lucide-react';

const PREFS_KEY = 'gfa_cashier_prefs_v1';

type Prefs = { notifications: boolean; theme: string };

function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{"notifications":true,"theme":"system"}');
  } catch {
    return { notifications: true, theme: 'system' };
  }
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

export const CashierProfile = () => {
  const apiOn = isUsersApiEnabled();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phoneNo: '',
    departmentName: '',
    clinicName: '',
    wardAssignment: '',
    qualifications: '',
    consultationHours: '',
  });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await getMyProfile();
      setProfile(p);
      setForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phoneNo: p.phoneNo || '',
        departmentName: p.departmentName || '',
        clinicName: p.clinicName || '',
        wardAssignment: p.wardAssignment || '',
        qualifications: p.qualifications || '',
        consultationHours: p.consultationHours || '',
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    if (!apiOn) return toast.error('Backend API is not configured');
    setSaving(true);
    try {
      const p = await updateMyProfile(form);
      setProfile(p);
      toast.success('Profile saved');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onPassword = async () => {
    if (!pwd.current || !pwd.next) return toast.error('Enter current and new password');
    if (pwd.next.length < 8) return toast.error('New password must be at least 8 characters');
    if (pwd.next !== pwd.confirm) return toast.error('Passwords do not match');
    setPwdBusy(true);
    try {
      await changePassword({ currentPassword: pwd.current, newPassword: pwd.next });
      toast.success('Password updated');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Password change failed');
    } finally {
      setPwdBusy(false);
    }
  };

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email
    : null;

  return (
    <DashboardLayout navItems={cashierNav} title="Cashier · My Profile">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">My Profile</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {displayName
                ? `Cashier desk identity and preferences · ${displayName}`
                : 'Identity, till assignment, duty hours, and account security.'}
            </p>
          </div>
        </div>
        <Button onClick={() => void onSave()} disabled={saving || !apiOn || loading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </div>

      {!apiOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm mb-4">
          Backend API is not configured.
        </div>
      )}
      {error && apiOn && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4">
          {error}
        </div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
        </div>
      )}

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="prefs">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="mt-4">
          <Card className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={(profile?.roles || []).join(', ') || '—'} disabled readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phoneNo} onChange={(e) => setField('phoneNo', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input
                value={form.departmentName}
                onChange={(e) => setField('departmentName', e.target.value)}
                placeholder="e.g. Accounts / Cash Office"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Desk / unit</Label>
              <Input
                value={form.clinicName}
                onChange={(e) => setField('clinicName', e.target.value)}
                placeholder="e.g. Main Cashier, Pharmacy Till"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Till / window</Label>
              <Input
                value={form.wardAssignment}
                onChange={(e) => setField('wardAssignment', e.target.value)}
                placeholder="e.g. Window 1"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Qualifications (optional)</Label>
              <Input
                value={form.qualifications}
                onChange={(e) => setField('qualifications', e.target.value)}
                placeholder="e.g. Accounting certificate"
              />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="availability" className="mt-4">
          <Card className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Duty hours</Label>
              <Input
                value={form.consultationHours}
                onChange={(e) => setField('consultationHours', e.target.value)}
                placeholder="Mon–Fri, 08:00–16:00"
              />
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <Card className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={pwd.current}
                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={pwd.next}
                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={pwd.confirm}
                onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between border-t pt-3 opacity-60">
              <div>
                <div className="font-medium text-sm">Two-Factor Authentication</div>
                <div className="text-xs text-muted-foreground">Coming soon</div>
              </div>
              <Switch checked={false} disabled />
            </div>
            <Button disabled={pwdBusy || !apiOn} onClick={() => void onPassword()}>
              {pwdBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </Card>
        </TabsContent>
        <TabsContent value="prefs" className="mt-4">
          <Card className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Notifications</div>
                <div className="text-xs text-muted-foreground">Stored in this browser</div>
              </div>
              <Switch
                checked={prefs.notifications}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, notifications: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Theme</Label>
              <Select value={prefs.theme} onValueChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CashierProfile;
