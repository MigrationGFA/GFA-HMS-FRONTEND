import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { doctorClinicalNav, notifySuccess } from '@/pages/DoctorClinicalCenter';
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video, Calendar, Plus, Printer, Download, Users, CheckCircle2, X, FileText,
  Mic, MicOff, VideoOff, Phone, Paperclip, Send, Pill, FlaskConical, ScanLine,
  Stethoscope, Activity, MoreHorizontal, Link2, MessageSquare, RotateCcw, Eye,
} from 'lucide-react';

const base = '/dashboard/doctor/clinical';
const TELE_KEY = 'gfa_doc_tele_sessions_v1';
const TELE_AUDIT_KEY = 'gfa_doc_tele_audit_v1';
const TODAY = '2026-07-06';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Telemedicine">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const StatusPill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => {
  const cls = tone === 'red' ? 'bg-rose-100 text-rose-700 border-rose-200'
    : tone === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200'
    : tone === 'green' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : tone === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200'
    : tone === 'teal' ? 'bg-teal-100 text-teal-700 border-teal-200'
    : 'bg-blue-100 text-blue-700 border-blue-200';
  return <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{children}</span>;
};

type TabId = 'upcoming' | 'waiting' | 'inSession' | 'completed' | 'missed' | 'awaitingDoc' | 'history';
type KpiFilter = 'upcoming' | 'waiting' | 'completed' | 'missed' | 'inSession' | 'awaitingDoc' | 'followUp';
type TeleStatus = 'Upcoming' | 'Waiting Room' | 'In Session' | 'Completed' | 'Missed' | 'Awaiting Documentation';
type LinkStatus = 'Not sent' | 'Sent' | 'Opened' | 'Expired';

interface ChatMessage { from: string; text: string; time: string; }

interface TeleSession {
  id: string; date: string; time: string;
  patientId: string; patientName: string; hospitalId: string;
  age: number; gender: string; clinic: 'GMPC' | 'OPC' | 'Telemedicine';
  visitType: string; status: TeleStatus; paymentStatus: string;
  linkStatus: LinkStatus; videoLink: string; phone: string; email: string;
  reason: string; waitingSince: string; deviceStatus: string;
  followUpNeeded: boolean; documentationComplete: boolean;
  summary: string; diagnosis: string; contacted: boolean;
  chat: ChatMessage[];
}

const PATIENT_OPTIONS = [
  { id: 'p1', name: 'Ibrahim Musa', hospitalId: 'GFA-2024-00149', age: 45, gender: 'M', phone: '08056789012', email: 'ibrahim.m@email.com' },
  { id: 'p2', name: 'Halima Abdullahi', hospitalId: 'GFA-2024-00890', age: 24, gender: 'F', phone: '08088990011', email: 'halima.a@email.com' },
  { id: 'p3', name: 'Tunde Bakare', hospitalId: 'GFA-2024-00733', age: 50, gender: 'M', phone: '08099001122', email: 'tunde.b@email.com' },
  { id: 'p4', name: 'Sade Ojo', hospitalId: 'GFA-2024-00678', age: 36, gender: 'F', phone: '08011223344', email: 'sade.o@email.com' },
  { id: 'p5', name: 'Ifeoma Eze', hospitalId: 'GFA-2024-00599', age: 31, gender: 'F', phone: '08022334455', email: 'ifeoma.e@email.com' },
];

const SEED: TeleSession[] = [
  { id: 'TS1', date: TODAY, time: '14:00', patientId: 'p1', patientName: 'Ibrahim Musa', hospitalId: 'GFA-2024-00149', age: 45, gender: 'M', clinic: 'Telemedicine', visitType: 'Telemedicine', status: 'Upcoming', paymentStatus: 'Paid online', linkStatus: 'Sent', videoLink: 'https://tele.fnph.gov.ng/session/IM-2026-0042', phone: '08056789012', email: 'ibrahim.m@email.com', reason: 'Anxiety follow-up', waitingSince: '', deviceStatus: '—', followUpNeeded: false, documentationComplete: false, summary: '', diagnosis: '', contacted: false, chat: [] },
  { id: 'TS2', date: TODAY, time: '14:30', patientId: 'p2', patientName: 'Halima Abdullahi', hospitalId: 'GFA-2024-00890', age: 24, gender: 'F', clinic: 'OPC', visitType: 'Telemedicine', status: 'Waiting Room', paymentStatus: 'Paid', linkStatus: 'Opened', videoLink: 'https://tele.fnph.gov.ng/session/HA-2026-0011', phone: '08088990011', email: 'halima.a@email.com', reason: 'First telepsychiatry assessment', waitingSince: '12 min', deviceStatus: 'Camera OK', followUpNeeded: false, documentationComplete: false, summary: '', diagnosis: '', contacted: false, chat: [{ from: 'Patient', text: 'I am in the waiting room', time: '14:28' }] },
  { id: 'TS3', date: '2026-07-05', time: '10:00', patientId: 'p3', patientName: 'Tunde Bakare', hospitalId: 'GFA-2024-00733', age: 50, gender: 'M', clinic: 'GMPC', visitType: 'Review', status: 'Completed', paymentStatus: 'Paid', linkStatus: 'Opened', videoLink: 'https://tele.fnph.gov.ng/session/TB-2026-0033', phone: '08099001122', email: 'tunde.b@email.com', reason: 'Schizophrenia review', waitingSince: '', deviceStatus: '—', followUpNeeded: true, documentationComplete: true, summary: 'Stable on risperidone. Continue current dose.', diagnosis: 'Schizophrenia — stable', contacted: false, chat: [] },
  { id: 'TS4', date: '2026-07-04', time: '09:00', patientId: 'p4', patientName: 'Sade Ojo', hospitalId: 'GFA-2024-00678', age: 36, gender: 'F', clinic: 'Telemedicine', visitType: 'Telemedicine', status: 'Missed', paymentStatus: 'Unpaid', linkStatus: 'Sent', videoLink: 'https://tele.fnph.gov.ng/session/SO-2026-0022', phone: '08011223344', email: 'sade.o@email.com', reason: 'Depression review', waitingSince: '', deviceStatus: 'No-show', followUpNeeded: false, documentationComplete: false, summary: '', diagnosis: '', contacted: false, chat: [] },
  { id: 'TS5', date: TODAY, time: '13:45', patientId: 'p5', patientName: 'Ifeoma Eze', hospitalId: 'GFA-2024-00599', age: 31, gender: 'F', clinic: 'OPC', visitType: 'Follow-up', status: 'In Session', paymentStatus: 'Paid', linkStatus: 'Opened', videoLink: 'https://tele.fnph.gov.ng/session/IE-2026-0055', phone: '08022334455', email: 'ifeoma.e@email.com', reason: 'Medication review', waitingSince: '', deviceStatus: 'Connected', followUpNeeded: false, documentationComplete: false, summary: '', diagnosis: '', contacted: false, chat: [{ from: 'Dr. Hassan', text: 'Good afternoon, can you hear me?', time: '13:46' }] },
  { id: 'TS6', date: '2026-07-05', time: '16:00', patientId: 'p1', patientName: 'Ibrahim Musa', hospitalId: 'GFA-2024-00149', age: 45, gender: 'M', clinic: 'Telemedicine', visitType: 'Telemedicine', status: 'Awaiting Documentation', paymentStatus: 'Paid', linkStatus: 'Opened', videoLink: '', phone: '08056789012', email: 'ibrahim.m@email.com', reason: 'Anxiety teleconsult', waitingSince: '', deviceStatus: '—', followUpNeeded: true, documentationComplete: false, summary: 'Session completed — note pending', diagnosis: 'GAD', contacted: false, chat: [] },
];

function loadSessions(): TeleSession[] {
  try { const raw = localStorage.getItem(TELE_KEY); if (raw) return JSON.parse(raw); } catch { /* noop */ }
  return SEED;
}

function saveSessions(s: TeleSession[]) { try { localStorage.setItem(TELE_KEY, JSON.stringify(s)); } catch { /* noop */ } }

function logAudit(action: string, detail?: string) {
  try {
    const arr = JSON.parse(localStorage.getItem(TELE_AUDIT_KEY) || '[]');
    arr.unshift({ action, detail, timestamp: new Date().toISOString() });
    localStorage.setItem(TELE_AUDIT_KEY, JSON.stringify(arr.slice(0, 500)));
    const master = JSON.parse(localStorage.getItem('gfa_doc_audit_master_v1') || '[]');
    master.unshift({ action, detail, module: 'Telemedicine', timestamp: new Date().toISOString() });
    localStorage.setItem('gfa_doc_audit_master_v1', JSON.stringify(master.slice(0, 500)));
  } catch { /* noop */ }
}

function logTimeline(event: string, patient: string) {
  try {
    const tl = JSON.parse(localStorage.getItem('gfa_doc_schedule_timeline_v1') || '[]');
    tl.unshift({ event, patient, module: 'Telemedicine', timestamp: new Date().toISOString() });
    localStorage.setItem('gfa_doc_schedule_timeline_v1', JSON.stringify(tl.slice(0, 500)));
  } catch { /* noop */ }
}

const statusTone = (s: TeleStatus) => {
  if (s === 'Completed') return 'green';
  if (s === 'Missed') return 'red';
  if (s === 'Waiting Room') return 'amber';
  if (s === 'In Session') return 'purple';
  if (s === 'Awaiting Documentation') return 'teal';
  return 'blue';
};

const tabMatch = (s: TeleSession, tab: TabId) => {
  if (tab === 'upcoming') return s.status === 'Upcoming';
  if (tab === 'waiting') return s.status === 'Waiting Room';
  if (tab === 'inSession') return s.status === 'In Session';
  if (tab === 'completed') return s.status === 'Completed';
  if (tab === 'missed') return s.status === 'Missed';
  if (tab === 'awaitingDoc') return s.status === 'Awaiting Documentation';
  return true;
};

export const DoctorTelemedicine = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const doctorName = user?.name ?? 'Dr. Hassan';

  const [sessions, setSessions] = useState<TeleSession[]>(loadSessions);
  const [tab, setTab] = useState<TabId>('upcoming');
  const [kpiFilter, setKpiFilter] = useState<KpiFilter | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [chatDraft, setChatDraft] = useState('');

  const [newApptOpen, setNewApptOpen] = useState(false);
  const [newApptForm, setNewApptForm] = useState({ patientId: '', clinic: 'Telemedicine', doctor: doctorName, visitType: 'Telemedicine', date: TODAY, time: '15:00', duration: '30', reason: '', paymentRequired: true, reminder: 'SMS', sendLink: true });
  const [sendLinkOpen, setSendLinkOpen] = useState<TeleSession | null>(null);
  const [linkForm, setLinkForm] = useState({ method: 'SMS', preview: '' });
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [endForm, setEndForm] = useState({ summary: '', diagnosis: '', rxDone: false, labImaging: false, followUp: false, docComplete: false });
  const [rescheduleOpen, setRescheduleOpen] = useState<TeleSession | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });
  const [summaryView, setSummaryView] = useState<TeleSession | null>(null);

  const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId) ?? null, [sessions, activeSessionId]);

  const updateSession = useCallback((id: string, patch: Partial<TeleSession>) => {
    setSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...patch } : s);
      saveSessions(next);
      return next;
    });
  }, []);

  const kpis = useMemo(() => ({
    upcoming: sessions.filter(s => s.status === 'Upcoming').length,
    waiting: sessions.filter(s => s.status === 'Waiting Room').length,
    completed: sessions.filter(s => s.status === 'Completed').length,
    missed: sessions.filter(s => s.status === 'Missed').length,
    inSession: sessions.filter(s => s.status === 'In Session').length,
    awaitingDoc: sessions.filter(s => s.status === 'Awaiting Documentation').length,
    followUp: sessions.filter(s => s.followUpNeeded && s.status === 'Completed').length,
  }), [sessions]);

  const filtered = useMemo(() => {
    let rows = sessions.filter(s => tabMatch(s, tab));
    if (kpiFilter === 'upcoming') rows = rows.filter(s => s.status === 'Upcoming');
    else if (kpiFilter === 'waiting') rows = rows.filter(s => s.status === 'Waiting Room');
    else if (kpiFilter === 'completed') rows = rows.filter(s => s.status === 'Completed');
    else if (kpiFilter === 'missed') rows = rows.filter(s => s.status === 'Missed');
    else if (kpiFilter === 'inSession') rows = rows.filter(s => s.status === 'In Session');
    else if (kpiFilter === 'awaitingDoc') rows = rows.filter(s => s.status === 'Awaiting Documentation');
    else if (kpiFilter === 'followUp') rows = rows.filter(s => s.followUpNeeded);
    return rows;
  }, [sessions, tab, kpiFilter]);

  const waitingPatients = useMemo(() => sessions.filter(s => s.status === 'Waiting Room'), [sessions]);

  const navigatePatient = (s: TeleSession, path: string, extra?: Partial<DocPatientContext>) => {
    setDocPatientContext({ id: s.patientId, name: s.patientName, hospitalId: s.hospitalId, clinic: s.clinic === 'Telemedicine' ? 'OPC' : s.clinic, ...extra } as DocPatientContext);
    logAudit(`Navigate → ${path}`, s.patientName);
    navigate(path);
  };

  const joinSession = (s: TeleSession) => {
    updateSession(s.id, { status: 'In Session' });
    setActiveSessionId(s.id);
    setDocPatientContext({ id: s.patientId, name: s.patientName, hospitalId: s.hospitalId, clinic: 'OPC' } as DocPatientContext);
    logAudit('Joined telemedicine session', s.patientName);
    setTab('inSession');
  };

  const admitFromWaiting = (s: TeleSession) => joinSession(s);

  const sendChat = () => {
    if (!chatDraft.trim() || !activeSession) return;
    const msg: ChatMessage = { from: 'You', text: chatDraft.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    updateSession(activeSession.id, { chat: [...activeSession.chat, msg] });
    setChatDraft('');
  };

  const createAppointment = () => {
    const p = PATIENT_OPTIONS.find(x => x.id === newApptForm.patientId);
    if (!p) { toast.error('Select patient'); return; }
    const sess: TeleSession = {
      id: `TS${Date.now()}`, date: newApptForm.date, time: newApptForm.time,
      patientId: p.id, patientName: p.name, hospitalId: p.hospitalId, age: p.age, gender: p.gender,
      clinic: newApptForm.clinic as TeleSession['clinic'], visitType: newApptForm.visitType,
      status: 'Upcoming', paymentStatus: newApptForm.paymentRequired ? 'Pending' : 'Waived',
      linkStatus: newApptForm.sendLink ? 'Sent' : 'Not sent',
      videoLink: `https://tele.fnph.gov.ng/session/${p.id.slice(1)}-${Date.now()}`,
      phone: p.phone, email: p.email, reason: newApptForm.reason,
      waitingSince: '', deviceStatus: '—', followUpNeeded: false, documentationComplete: false,
      summary: '', diagnosis: '', contacted: false, chat: [],
    };
    setSessions(prev => { const next = [sess, ...prev]; saveSessions(next); return next; });
    if (newApptForm.sendLink) logTimeline('Telemedicine link sent', p.name);
    logAudit('Telemedicine appointment created', p.name);
    setNewApptOpen(false);
    notifySuccess('Appointment created', 'Created');
  };

  const confirmSendLink = () => {
    if (!sendLinkOpen) return;
    updateSession(sendLinkOpen.id, { linkStatus: 'Sent' });
    logAudit('Session link sent', `${sendLinkOpen.patientName} via ${linkForm.method}`);
    logTimeline('Telemedicine link sent', sendLinkOpen.patientName);
    setSendLinkOpen(null);
    notifySuccess(`Link sent via ${linkForm.method}`, 'Link Sent');
  };

  const completeSession = (awaitingDoc = false) => {
    if (!activeSession) return;
    const status: TeleStatus = awaitingDoc ? 'Awaiting Documentation' : 'Completed';
    updateSession(activeSession.id, {
      status, summary: endForm.summary, diagnosis: endForm.diagnosis,
      followUpNeeded: endForm.followUp, documentationComplete: endForm.docComplete,
    });
    logAudit(awaitingDoc ? 'Session saved awaiting documentation' : 'Telemedicine session completed', activeSession.patientName);
    logTimeline(`Telemedicine ${awaitingDoc ? 'awaiting documentation' : 'completed'} — ${activeSession.patientName}`, activeSession.patientName);
    setActiveSessionId(null);
    setEndSessionOpen(false);
    setTab(awaitingDoc ? 'awaitingDoc' : 'completed');
    notifySuccess(awaitingDoc ? 'Saved — documentation pending' : 'Session completed', 'Done');
  };

  const markMissed = (s: TeleSession) => {
    updateSession(s.id, { status: 'Missed' });
    logAudit('Session marked missed', s.patientName);
    toast.info('Marked as missed');
  };

  const reschedule = () => {
    if (!rescheduleOpen) return;
    updateSession(rescheduleOpen.id, { date: rescheduleForm.date, time: rescheduleForm.time, status: 'Upcoming' });
    logAudit('Session rescheduled', rescheduleOpen.patientName);
    setRescheduleOpen(null);
    notifySuccess('Appointment rescheduled', 'Rescheduled');
  };

  const ActionMenu = ({ s }: { s: TeleSession }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {s.status === 'Completed' && (
          <>
            <DropdownMenuItem onClick={() => setSummaryView(s)}><Eye className="h-3 w-3 mr-2" />View Summary</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}><Printer className="h-3 w-3 mr-2" />Print</DropdownMenuItem>
            <DropdownMenuItem onClick={() => notifySuccess('PDF exported', s.patientName)}><Download className="h-3 w-3 mr-2" />Export PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setRescheduleOpen(s); setRescheduleForm({ date: TODAY, time: '10:00' }); }}><RotateCcw className="h-3 w-3 mr-2" />Rebook Follow-Up</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info('Recording playback placeholder')}><Video className="h-3 w-3 mr-2" />View Recording</DropdownMenuItem>
          </>
        )}
        {s.status === 'Missed' && (
          <>
            <DropdownMenuItem onClick={() => { setRescheduleOpen(s); setRescheduleForm({ date: s.date, time: s.time }); }}><Calendar className="h-3 w-3 mr-2" />Reschedule</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSendLinkOpen(s); setLinkForm({ method: 'SMS', preview: `We missed you — rebook: ${s.videoLink}` }); }}><MessageSquare className="h-3 w-3 mr-2" />Send Message</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { updateSession(s.id, { contacted: true }); toast.success('Marked as contacted'); }}>Mark Contacted</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { updateSession(s.id, { status: 'Completed', summary: 'Closed — no-show resolved' }); logAudit('Missed session closed', s.patientName); }}>Close</DropdownMenuItem>
          </>
        )}
        {!['Completed', 'Missed'].includes(s.status) && (
          <>
            <DropdownMenuItem onClick={() => joinSession(s)} disabled={s.status === 'Completed' || s.status === 'Missed'}><Video className="h-3 w-3 mr-2" />Join</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigatePatient(s, `${base}/workspace`)}><Stethoscope className="h-3 w-3 mr-2" />View Patient</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setRescheduleOpen(s); setRescheduleForm({ date: s.date, time: s.time }); }}><Calendar className="h-3 w-3 mr-2" />Reschedule</DropdownMenuItem>
            <DropdownMenuItem onClick={() => markMissed(s)}><X className="h-3 w-3 mr-2" />Mark Missed</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSendLinkOpen(s); setLinkForm({ method: 'SMS', preview: `Join your GFA telemedicine session: ${s.videoLink}` }); }}><Link2 className="h-3 w-3 mr-2" />Send Link</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigatePatient(s, `${base}/documentation`, { noteType: 'Telemedicine Note' })}><FileText className="h-3 w-3 mr-2" />Start Documentation</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigatePatient(s, `${base}/prescriptions`)}><Pill className="h-3 w-3 mr-2" />Prescribe</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigatePatient(s, `${base}/schedule`)}><Calendar className="h-3 w-3 mr-2" />Schedule Follow-Up</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">Telemedicine Clinic</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-1">Virtual consultations with full clinical tools, documentation, prescriptions, and follow-up workflow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setNewApptOpen(true)}><Plus className="h-4 w-4 mr-1" />New Telemedicine Appointment</Button>
          <Button size="sm" variant="outline" onClick={() => setTab('waiting')}><Users className="h-4 w-4 mr-1" />Open Waiting Room</Button>
          <Button size="sm" variant="outline" onClick={() => { const w = waitingPatients[0]; if (w) joinSession(w); else toast.info('No patients in waiting room'); }}><Video className="h-4 w-4 mr-1" />Start Instant Session</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print Schedule</Button>
          <Button size="sm" variant="outline" onClick={() => notifySuccess('Schedule exported', 'Export')}><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {([
          { id: 'upcoming' as KpiFilter, title: 'Upcoming', value: kpis.upcoming, icon: Calendar, tone: 'blue' as const },
          { id: 'waiting' as KpiFilter, title: 'Waiting Room', value: kpis.waiting, icon: Users, tone: 'amber' as const },
          { id: 'completed' as KpiFilter, title: 'Completed', value: kpis.completed, icon: CheckCircle2, tone: 'green' as const },
          { id: 'missed' as KpiFilter, title: 'Missed', value: kpis.missed, icon: X, tone: 'rose' as const },
          { id: 'inSession' as KpiFilter, title: 'In Session', value: kpis.inSession, icon: Video, tone: 'purple' as const },
          { id: 'awaitingDoc' as KpiFilter, title: 'Awaiting Documentation', value: kpis.awaitingDoc, icon: FileText, tone: 'teal' as const },
          { id: 'followUp' as KpiFilter, title: 'Follow-Up Needed', value: kpis.followUp, icon: RotateCcw, tone: 'indigo' as const },
        ]).map(k => (
          <button key={k.id} type="button" onClick={() => { setKpiFilter(kpiFilter === k.id ? null : k.id); if (k.id === 'upcoming') setTab('upcoming'); else if (k.id === 'waiting') setTab('waiting'); else if (k.id === 'completed') setTab('completed'); else if (k.id === 'missed') setTab('missed'); else if (k.id === 'inSession') setTab('inSession'); else if (k.id === 'awaitingDoc') setTab('awaitingDoc'); else setTab('completed'); }}
            className={`text-left rounded-xl ${kpiFilter === k.id ? 'ring-2 ring-primary' : ''}`}>
            <SummaryCard title={k.title} value={String(k.value)} icon={k.icon} tone={k.tone} />
          </button>
        ))}
      </div>

      {tab === 'waiting' && waitingPatients.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><Users className="h-4 w-4" />Waiting Room</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {waitingPatients.map(s => (
              <Card key={s.id} className="!p-4 border-amber-200 bg-amber-50/30">
                <div className="font-medium">{s.patientName}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.hospitalId}</div>
                <div className="text-xs mt-1">Waiting {s.waitingSince} · {s.reason}</div>
                <div className="flex gap-1 mt-1 text-xs"><StatusPill tone="green">{s.paymentStatus}</StatusPill><StatusPill tone="blue">{s.deviceStatus}</StatusPill></div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => admitFromWaiting(s)}>Admit to Session</Button>
                  <Button size="sm" variant="outline" onClick={() => { setActiveSessionId(s.id); setChatDraft(''); }}><MessageSquare className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRescheduleOpen(s); setRescheduleForm({ date: s.date, time: s.time }); }}>Reschedule</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as TabId)}>
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {(['upcoming', 'waiting', 'inSession', 'completed', 'missed', 'awaitingDoc', 'history'] as TabId[]).map(t => (
            <TabsTrigger key={t} value={t} className="capitalize">{t === 'inSession' ? 'In Session' : t === 'awaitingDoc' ? 'Awaiting Documentation' : t === 'history' ? 'Telemedicine History' : t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <Card className="hidden md:block overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead><tr>{['Time', 'Patient', 'Hospital No.', 'Age / Sex', 'Clinic', 'Visit Type', 'Status', 'Payment', 'Link', 'Action'].map(h => <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 border-b text-xs whitespace-nowrap">{s.date} {s.time}</td>
                    <td className="px-3 py-2 border-b font-medium">{s.patientName}</td>
                    <td className="px-3 py-2 border-b font-mono text-xs">{s.hospitalId}</td>
                    <td className="px-3 py-2 border-b text-xs">{s.age} / {s.gender}</td>
                    <td className="px-3 py-2 border-b text-xs">{s.clinic}</td>
                    <td className="px-3 py-2 border-b text-xs">{s.visitType}</td>
                    <td className="px-3 py-2 border-b"><StatusPill tone={statusTone(s.status)}>{s.status}</StatusPill></td>
                    <td className="px-3 py-2 border-b text-xs">{s.paymentStatus}</td>
                    <td className="px-3 py-2 border-b text-xs">{s.linkStatus}</td>
                    <td className="px-3 py-2 border-b"><ActionMenu s={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <p className="text-center text-muted-foreground py-10 text-sm">No sessions in this view.</p>}
          </Card>

          <div className="md:hidden space-y-3">
            {filtered.map(s => (
              <Card key={s.id} className="!p-4">
                <div className="flex justify-between items-start">
                  <div><div className="font-medium">{s.patientName}</div><div className="text-xs text-muted-foreground">{s.date} {s.time}</div></div>
                  <StatusPill tone={statusTone(s.status)}>{s.status}</StatusPill>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.hospitalId} · {s.clinic}</div>
                <Button size="sm" className="w-full mt-2" onClick={() => joinSession(s)} disabled={s.status === 'Completed' || s.status === 'Missed'}><Video className="h-4 w-4 mr-1" />Join</Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur p-2 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => { const s = filtered.find(x => x.status === 'Waiting Room' || x.status === 'Upcoming'); if (s) joinSession(s); else toast.info('No session to join'); }}><Video className="h-4 w-4 mr-1" />Join</Button>
        <Button size="sm" variant="outline" onClick={() => setTab('waiting')}><Users className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => setNewApptOpen(true)}><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Virtual consultation room */}
      <Sheet open={!!activeSessionId} onOpenChange={o => { if (!o) { if (activeSession?.status === 'In Session') setEndSessionOpen(true); else setActiveSessionId(null); } }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-0">
          {activeSession && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <div><SheetTitle className="text-left">{activeSession.patientName}</SheetTitle><SheetDescription>{activeSession.hospitalId} · {activeSession.reason}</SheetDescription></div>
                <StatusPill tone="purple">● LIVE</StatusPill>
              </div>
              <div className="grid lg:grid-cols-[1fr_280px] flex-1 min-h-0">
                <div className="p-4 space-y-3">
                  <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center text-white/70 relative">
                    {videoOn ? <Video className="h-16 w-16" /> : <VideoOff className="h-16 w-16 opacity-50" />}
                    <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">● LIVE</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button size="sm" variant={videoOn ? 'outline' : 'secondary'} onClick={() => setVideoOn(v => !v)}>{videoOn ? <VideoOff className="h-4 w-4 mr-1" /> : <Video className="h-4 w-4 mr-1" />}{videoOn ? 'Stop Video' : 'Start Video'}</Button>
                    <Button size="sm" variant={muted ? 'secondary' : 'outline'} onClick={() => setMuted(m => !m)}>{muted ? <MicOff className="h-4 w-4 mr-1" /> : <Mic className="h-4 w-4 mr-1" />}{muted ? 'Unmute' : 'Mute'}</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info('Screen share started')}><Phone className="h-4 w-4 mr-1" />Screen Share</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.success('File attached')}><Paperclip className="h-4 w-4 mr-1" />Attach</Button>
                    <Button size="sm" variant="destructive" onClick={() => setEndSessionOpen(true)}>End Session</Button>
                  </div>
                  <div className="border rounded-lg p-3 h-40 overflow-y-auto space-y-2">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Chat</div>
                    {activeSession.chat.map((m, i) => (
                      <div key={i} className={`text-sm ${m.from === 'You' ? 'text-right' : ''}`}>
                        <span className="text-[10px] text-muted-foreground">{m.from} · {m.time}</span>
                        <div className={`inline-block rounded-lg px-2 py-1 ${m.from === 'You' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>{m.text}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Message patient…" />
                    <Button onClick={sendChat}><Send className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="border-l p-4 space-y-3 bg-muted/20 overflow-y-auto">
                  <div><div className="text-xs font-medium text-muted-foreground">Patient summary</div><div className="text-sm font-medium">{activeSession.patientName}</div><div className="text-xs">{activeSession.age}y · {activeSession.gender} · {activeSession.clinic}</div><div className="text-xs text-muted-foreground mt-1">{activeSession.reason}</div></div>
                  <div><div className="text-xs font-medium text-muted-foreground mb-1">Clinical tools</div>
                    <div className="grid gap-1">
                      {[
                        { label: 'Start Note', icon: FileText, path: `${base}/documentation`, extra: { noteType: 'Telemedicine Note' } },
                        { label: 'View Timeline', icon: Activity, path: `${base}/timeline` },
                        { label: 'View Results', icon: FlaskConical, path: `${base}/results` },
                        { label: 'Prescribe', icon: Pill, path: `${base}/prescriptions` },
                        { label: 'Request Lab', icon: FlaskConical, path: `${base}/lab` },
                        { label: 'Request Imaging', icon: ScanLine, path: `${base}/imaging` },
                        { label: 'Refer', icon: Stethoscope, path: `${base}/referrals` },
                        { label: 'Schedule Follow-Up', icon: Calendar, path: `${base}/schedule` },
                      ].map(t => (
                        <Button key={t.label} size="sm" variant="outline" className="justify-start h-8" onClick={() => navigatePatient(activeSession, t.path, t.extra)}><t.icon className="h-3 w-3 mr-2" />{t.label}</Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* New appointment */}
      <Dialog open={newApptOpen} onOpenChange={setNewApptOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Telemedicine Appointment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Patient</Label><Select value={newApptForm.patientId} onValueChange={v => setNewApptForm(f => ({ ...f, patientId: v }))}><SelectTrigger><SelectValue placeholder="Search patient" /></SelectTrigger><SelectContent>{PATIENT_OPTIONS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Clinic</Label><Select value={newApptForm.clinic} onValueChange={v => setNewApptForm(f => ({ ...f, clinic: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['GMPC', 'OPC', 'Telemedicine'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Doctor</Label><Input value={newApptForm.doctor} onChange={e => setNewApptForm(f => ({ ...f, doctor: e.target.value }))} /></div>
              <div><Label>Visit type</Label><Select value={newApptForm.visitType} onValueChange={v => setNewApptForm(f => ({ ...f, visitType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Telemedicine">Telemedicine</SelectItem><SelectItem value="Follow-up">Follow-up</SelectItem><SelectItem value="Review">Review</SelectItem></SelectContent></Select></div>
              <div><Label>Duration (min)</Label><Input value={newApptForm.duration} onChange={e => setNewApptForm(f => ({ ...f, duration: e.target.value }))} /></div>
              <div><Label>Date</Label><Input type="date" value={newApptForm.date} onChange={e => setNewApptForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Time</Label><Input type="time" value={newApptForm.time} onChange={e => setNewApptForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
            <div><Label>Reason</Label><Textarea value={newApptForm.reason} onChange={e => setNewApptForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={newApptForm.paymentRequired} onCheckedChange={v => setNewApptForm(f => ({ ...f, paymentRequired: !!v }))} /><Label>Payment required</Label></div>
            <div><Label>Reminder</Label><Select value={newApptForm.reminder} onValueChange={v => setNewApptForm(f => ({ ...f, reminder: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SMS">SMS</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-2"><Checkbox checked={newApptForm.sendLink} onCheckedChange={v => setNewApptForm(f => ({ ...f, sendLink: !!v }))} /><Label>Send link on create</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNewApptOpen(false)}>Cancel</Button><Button onClick={createAppointment}>Create Appointment</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send link */}
      <Dialog open={!!sendLinkOpen} onOpenChange={o => !o && setSendLinkOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Session Link</DialogTitle><DialogDescription>{sendLinkOpen?.patientName} · {sendLinkOpen?.date} {sendLinkOpen?.time}</DialogDescription></DialogHeader>
          <div><Label>Contact method</Label><Select value={linkForm.method} onValueChange={v => setLinkForm(f => ({ ...f, method: v, preview: `Join your GFA telemedicine session at ${sendLinkOpen?.time}: ${sendLinkOpen?.videoLink}` }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SMS">SMS</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="WhatsApp">WhatsApp</SelectItem></SelectContent></Select></div>
          <div><Label>Message preview</Label><Textarea value={linkForm.preview || `Join your GFA telemedicine session: ${sendLinkOpen?.videoLink}`} readOnly rows={3} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setSendLinkOpen(null)}>Cancel</Button><Button onClick={confirmSendLink}><Send className="h-4 w-4 mr-1" />Send Link</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End session */}
      <Dialog open={endSessionOpen} onOpenChange={setEndSessionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Session</DialogTitle><DialogDescription>{activeSession?.patientName}</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Session summary</Label><Textarea value={endForm.summary} onChange={e => setEndForm(f => ({ ...f, summary: e.target.value }))} /></div>
            <div><Label>Diagnosis</Label><Input value={endForm.diagnosis} onChange={e => setEndForm(f => ({ ...f, diagnosis: e.target.value }))} /></div>
            {(['rxDone', 'labImaging', 'followUp', 'docComplete'] as const).map(k => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox checked={endForm[k]} onCheckedChange={v => setEndForm(f => ({ ...f, [k]: !!v }))} />
                <Label>{k === 'rxDone' ? 'Prescription completed' : k === 'labImaging' ? 'Lab/imaging requested' : k === 'followUp' ? 'Follow-up required' : 'Documentation completed'}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndSessionOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => completeSession(true)}>Save as Awaiting Documentation</Button>
            <Button onClick={() => completeSession(false)}>Complete Session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule */}
      <Dialog open={!!rescheduleOpen} onOpenChange={o => !o && setRescheduleOpen(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reschedule</DialogTitle><DialogDescription>{rescheduleOpen?.patientName}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-2"><div><Label>Date</Label><Input type="date" value={rescheduleForm.date} onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))} /></div><div><Label>Time</Label><Input type="time" value={rescheduleForm.time} onChange={e => setRescheduleForm(f => ({ ...f, time: e.target.value }))} /></div></div>
          <DialogFooter><Button onClick={reschedule}>Reschedule</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Completed summary view */}
      <Dialog open={!!summaryView} onOpenChange={o => !o && setSummaryView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Session Summary</DialogTitle><DialogDescription>{summaryView?.patientName} · {summaryView?.date}</DialogDescription></DialogHeader>
          <div className="text-sm space-y-2"><p><strong>Diagnosis:</strong> {summaryView?.diagnosis}</p><p><strong>Summary:</strong> {summaryView?.summary}</p></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" onClick={() => notifySuccess('PDF exported', summaryView?.patientName)}><Download className="h-4 w-4 mr-1" />Export PDF</Button>
            <Button onClick={() => { if (summaryView) { setRescheduleOpen(summaryView); setRescheduleForm({ date: TODAY, time: '10:00' }); setSummaryView(null); } }}>Rebook Follow-Up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
