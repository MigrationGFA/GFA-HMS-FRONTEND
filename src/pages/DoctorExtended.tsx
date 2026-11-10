import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { doctorClinicalNav, notifySuccess } from './DoctorClinicalCenter';
import { patients } from '@/data/dummyData';
import {
  Search, Eye, Stethoscope, FileText, Star, BedDouble, Calendar, Plus, Printer, Send,
  X, CheckCircle2, AlertTriangle, ListChecks, MessageSquare, Paperclip, Video, Phone,
  Mic, ShieldCheck, FileSignature, Download, Bell, Archive, BarChart3, FlaskRound,
  UserCog, Lock, Smartphone, ArrowRightLeft,
} from 'lucide-react';

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title={`Doctor · ${title}`}>{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
);

const Header = ({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }) => (
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

const tone = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
}[t] || 'bg-muted text-foreground border-border');

const Pill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

const Stat = ({ label, value, t = 'blue', icon }: { label: string; value: string | number; t?: string; icon?: React.ReactNode }) => (
  <Card className="flex items-center gap-3">
    <div className={`h-10 w-10 rounded-lg border flex items-center justify-center ${tone(t)}`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </Card>
);

// ============ 2. PATIENT DIRECTORY — see DoctorPatientDirectoryEngine.tsx ============
export { DoctorPatientDirectory } from '@/pages/DoctorPatientDirectoryEngine';

// ============ 3. MY SCHEDULE — see DoctorMyScheduleEngine.tsx ============
export { DoctorMySchedule } from '@/pages/DoctorMyScheduleEngine';

// ============ 4. APPOINTMENT MANAGEMENT — see DoctorAppointmentMgmtEngine.tsx ============
export { DoctorAppointmentMgmt } from '@/pages/DoctorAppointmentMgmtEngine';

// ============ 5. TASKS & WORK QUEUE — see DoctorTasksWorkQueueEngine.tsx ============
export { DoctorTasks } from '@/pages/DoctorTasksWorkQueueEngine';

// ============ 6. COMMUNICATION CENTER — see DoctorCommunicationCenterEngine.tsx ============
export { DoctorComms } from '@/pages/DoctorCommunicationCenterEngine';

// ============ 7. CLINICAL DECISION SUPPORT — see DoctorClinicalDecisionSupportEngine.tsx ============
export { DoctorCDS } from '@/pages/DoctorClinicalDecisionSupportEngine';

// ============ 8. CERTIFICATES & REPORTS — see DoctorCertificatesReportsEngine.tsx ============
export { DoctorCertificates } from '@/pages/DoctorCertificatesReportsEngine';

// ============ 9. TELEMEDICINE — see DoctorTelemedicineEngine.tsx ============
export { DoctorTelemedicine } from '@/pages/DoctorTelemedicineEngine';

// ============ 10. NOTIFICATIONS CENTER — see DoctorNotificationsCenterEngine.tsx ============
export { DoctorNotifications } from '@/pages/DoctorNotificationsCenterEngine';

// ============ 11. RESEARCH & CLINICAL AUDIT — see DoctorResearchClinicalAuditEngine.tsx ============
export { DoctorResearch } from '@/pages/DoctorResearchClinicalAuditEngine';

// ============ 12. REPORTS & ANALYTICS — see DoctorReportsAnalyticsEngine.tsx ============
export { DoctorAnalytics } from '@/pages/DoctorReportsAnalyticsEngine';

// ============ 14. MY PROFILE — see DoctorClinicalProfileEngine.tsx ============
export { DoctorClinicalProfile } from '@/pages/DoctorClinicalProfileEngine';
