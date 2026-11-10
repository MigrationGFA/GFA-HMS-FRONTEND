import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DbBootGate } from '@/components/DbBootGate';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { notify } from '@/lib/notify';
import { canExportOpcCsv, canUseConfidentialNotes } from '@/lib/opc-access';
import { useDbTick } from '@/contexts/DatabaseProvider';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/db/database';
import { formatCurrency } from '@/data/dummyData';
import * as opc from '@/lib/opc-actions';
import { ApiError } from '@/lib/api/client';
import { searchPersons } from '@/lib/api/patients';
import { createLabRequest, isLaboratoryApiEnabled, listLabTests } from '@/lib/api/laboratory';
import { createPrescription, isPrescriptionsApiEnabled } from '@/lib/api/prescriptions';
import { listDrugs } from '@/lib/api/pharmacy';
import { createAdmissionRequest, isAdmissionRequestsApiEnabled } from '@/lib/api/admission-requests';
import { createReferral as createClinicalReferral, isReferralsApiEnabled } from '@/lib/api/referrals';
import {
  createImagingRequest,
  isImagingApiEnabled,
  listImagingRequests,
  resolveImagingStudyItems,
  type ApiImagingRequest,
} from '@/lib/api/imaging';
import { MobileWorklist, MobileWorklistCard, DesktopOnlyTable } from '@/components/MobileWorklist';
import { isOpcApiEnabled } from '@/lib/api/opc';
import type {
  OpcVisit, OpcVisitType, OpcPayer, OpcPriority, OpcVisitStatus,
  PsychAssessmentType, PsychDxType, OpcRiskLevel, PsychNoteType,
} from '@/data-access/types';
import {
  LayoutDashboard, Users, Stethoscope, ClipboardList, Brain, ListChecks, Pill as PillIcon,
  FlaskConical, ShieldAlert, BedDouble, CalendarClock, HeartHandshake, LifeBuoy,
  Siren, BarChart3, Settings2, Search, Plus, Send, ArrowRight, AlertTriangle,
  CheckCircle2, Clock, ScrollText,
} from 'lucide-react';

/* ===================================================================== */
const base = '/dashboard/psychopc';
export const psychOpcNav = [
  { label: 'OPC Dashboard', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Patient Queue', path: `${base}/queue`, icon: <Users className="h-4 w-4" /> },
  { label: 'Active Consultation', path: `${base}/consult`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Psychiatric Assessment', path: `${base}/assessment`, icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Mental Status Exam', path: `${base}/mse`, icon: <Brain className="h-4 w-4" /> },
  { label: 'Diagnosis & Plan', path: `${base}/diagnosis`, icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Prescriptions', path: `${base}/prescriptions`, icon: <PillIcon className="h-4 w-4" /> },
  { label: 'Lab / Investigations', path: `${base}/investigations`, icon: <FlaskConical className="h-4 w-4" /> },
  { label: 'Risk Assessment', path: `${base}/risk`, icon: <ShieldAlert className="h-4 w-4" /> },
  { label: 'Admission Requests', path: `${base}/admission`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Follow-Up Appointments', path: `${base}/appointments`, icon: <CalendarClock className="h-4 w-4" /> },
  { label: 'Psychology Referrals', path: `${base}/psychology`, icon: <HeartHandshake className="h-4 w-4" /> },
  { label: 'Social Welfare Referrals', path: `${base}/welfare`, icon: <LifeBuoy className="h-4 w-4" /> },
  { label: 'Emergency Cases', path: `${base}/emergency`, icon: <Siren className="h-4 w-4" /> },
  { label: 'Reports & Analytics', path: `${base}/reports`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Settings & Templates', path: `${base}/settings`, icon: <Settings2 className="h-4 w-4" /> },
];

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={psychOpcNav} title={`Psychiatric OPC · ${title}`}>
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
  <div className={`bg-card rounded-xl border shadow-sm p-3 sm:p-5 ${className}`}>{children}</div>
);
const toneCls = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200', red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200', blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200', purple: 'bg-purple-100 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}[t] ?? 'bg-muted text-foreground border-border');
const Pill = ({ tone = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${toneCls(tone)}`}>{children}</span>
);

/* Compact, clickable status card used as a tab-filter across pages */
const MiniStat = ({ label, value, tone = 'slate', active, onClick }: { label: string; value: number | string; tone?: string; active?: boolean; onClick?: () => void }) => (
  <button type="button" onClick={onClick}
    className={`text-left p-3 rounded-xl border transition ${toneCls(tone)} ${onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'} ${active ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
    <div className="text-2xl font-bold leading-none">{value}</div>
    <div className="text-xs mt-1">{label}</div>
  </button>
);
const StatRow = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">{children}</div>
);

const priorityTone = (p: OpcPriority) => p === 'Emergency' ? 'red' : p === 'Crisis' ? 'red' : p === 'Urgent' ? 'amber' : 'slate';
const statusTone = (s: OpcVisitStatus) => s === 'COMPLETED' ? 'green' : s === 'WITH_DOCTOR' ? 'blue' : s === 'FOR_ADMISSION' ? 'purple' : s === 'REFERRED' ? 'sky' : 'amber';
const statusLabel = (s: string) => s.replace(/_/g, ' ');

/* Split order/request status into pending vs completed for tab filters */
const DONE_STATUSES = ['DISPENSED', 'COMPLETED', 'PAID', 'RELEASED', 'RESULT_READY', 'VERIFIED', 'DONE', 'CLOSED', 'REPORTED'];
const isDone = (s: string) => DONE_STATUSES.includes((s || '').toUpperCase());

const useStaffName = () => { const { user } = useAuth(); return user?.name ?? 'Dr. Okonkwo'; };

async function resolveApiPersonId(localPatientId: string): Promise<number> {
  if (localPatientId.startsWith('api:')) {
    const id = Number(localPatientId.replace('api:', ''));
    if (Number.isFinite(id)) return id;
  }
  const local = db.patients.get(localPatientId);
  const q = local?.hospitalId || local?.name || '';
  const people = q ? await searchPersons(q) : [];
  const hit = people.find((p) =>
    (local?.hospitalId && p.hospitalNo === local.hospitalId)
    || Number(localPatientId) === p.personId,
  ) ?? people[0];
  if (!hit) throw new ApiError('Patient not found in API Persons. Check hospital number mapping.', 404);
  return hit.personId;
}

/* Shared patient picker */
const PatientPicker = ({ value, onChange }: { value: string; onChange: (id: string) => void }) => {
  const apiMode = isOpcApiEnabled();
  const [q, setQ] = useState('');
  const [apiPeople, setApiPeople] = useState<{ id: string; label: string }[]>([]);
  const patients = db.patients.list();

  useEffect(() => {
    if (!apiMode) return;
    const query = q.trim();
    if (query.length < 2) {
      setApiPeople([]);
      return;
    }
    void searchPersons(query)
      .then((rows) => {
        setApiPeople(rows.map((p) => ({
          id: `api:${p.personId}`,
          label: `${[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || 'Unknown'} · ${p.hospitalNo ?? `#${p.personId}`}`,
        })));
      })
      .catch(() => setApiPeople([]));
  }, [apiMode, q]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={apiMode ? 'Search Persons (type below)…' : 'Select patient…'} /></SelectTrigger>
      <SelectContent>
        {apiMode && (
          <div className="p-2 border-b">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9"
              placeholder="Type hospital no or name…"
            />
          </div>
        )}
        {apiMode
          ? apiPeople.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)
          : patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} · {p.hospitalId}</SelectItem>)}
      </SelectContent>
    </Select>
  );
};

/* Generic "New …" dialog wrapper */
const NewDialog = ({ open, onOpenChange, title, desc, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; desc?: string; children: React.ReactNode; footer: React.ReactNode }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{title}</DialogTitle>{desc && <DialogDescription>{desc}</DialogDescription>}</DialogHeader>
      <div className="space-y-3 py-1">{children}</div>
      <DialogFooter>{footer}</DialogFooter>
    </DialogContent>
  </Dialog>
);

const RISK_LEVELS: OpcRiskLevel[] = ['None', 'Low', 'Moderate', 'High'];

/* =====================================================================
   1. DASHBOARD
   ===================================================================== */
export const PsychOpcDashboard = () => {
  useDbTick();
  const navigate = useNavigate();
  const m = opc.dashboardMetrics();
  const cards: { t: string; v: number; i: typeof Users; to: string }[] = [
    { t: 'Seen Today', v: m.seenToday, i: Users, to: `${base}/queue` },
    { t: 'Waiting Patients', v: m.waiting, i: Clock, to: `${base}/queue` },
    { t: 'Active Consultations', v: m.withDoctor, i: Stethoscope, to: `${base}/consult` },
    { t: 'Awaiting Nursing', v: m.withNurse, i: Users, to: `${base}/queue` },
    { t: 'Follow-up Patients', v: m.followUp, i: CalendarClock, to: `${base}/appointments` },
    { t: 'New Psychiatric Cases', v: m.newCases, i: Plus, to: `${base}/queue` },
    { t: 'Emergency / Crisis', v: m.emergency, i: Siren, to: `${base}/emergency` },
    { t: 'High-Risk Alerts', v: m.highRisk, i: ShieldAlert, to: `${base}/risk` },
    { t: 'Awaiting Lab', v: m.awaitingLab, i: FlaskConical, to: `${base}/investigations` },
    { t: 'Awaiting Pharmacy', v: m.awaitingPharmacy, i: PillIcon, to: `${base}/prescriptions` },
    { t: 'Patients for Admission', v: m.forAdmission, i: BedDouble, to: `${base}/admission` },
    { t: 'Pending Referrals', v: m.pendingReferrals, i: HeartHandshake, to: `${base}/psychology` },
    { t: 'Upcoming Follow-Ups', v: m.upcomingFollowUps, i: CalendarClock, to: `${base}/appointments` },
  ];
  const queue = opc.todaysVisits().slice(0, 8);
  return (
    <Shell title="Dashboard">
      <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Psychiatric OPC" desc={isOpcApiEnabled() ? 'API mode on — queue/consult dual-mode landing next. Cards link to clinic workflows.' : 'Local demo mode — set VITE_USE_API=true for live Persons/imaging. Cards link to clinic workflows.'}
        action={<Button className="min-h-10" onClick={() => navigate(`${base}/queue`)}><Plus className="h-4 w-4 mr-1.5" />Check-in Patient</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mb-6">
        {cards.map(c => (
          <button key={c.t} type="button" onClick={() => navigate(c.to)} className="text-left min-h-10">
            <SummaryCard title={c.t} value={String(c.v)} icon={c.i} />
          </button>
        ))}
      </div>
      <Card>
        <Section icon={<Users className="h-5 w-5" />} title="Today's Queue" desc="Most recent check-ins." action={<Button size="sm" variant="outline" className="min-h-10" onClick={() => navigate(`${base}/queue`)}>Open Queue</Button>} />
        <MobileWorklist>
          {queue.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No patients checked in today.</div> : queue.map(v => (
            <MobileWorklistCard
              key={v.id}
              title={v.patientName}
              subtitle={`${v.hospitalId} · ${v.visitType}`}
              meta={v.assignedDoctor ?? 'Unassigned'}
              status={<Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill>}
              onClick={() => navigate(`${base}/queue`)}
            />
          ))}
        </MobileWorklist>
        <DesktopOnlyTable>
          <Table>
            <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Doctor</TableHead></TableRow></TableHeader>
            <TableBody>
              {queue.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No patients checked in today.</TableCell></TableRow> : queue.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.patientName}<div className="text-xs text-muted-foreground">{v.hospitalId}</div></TableCell>
                  <TableCell>{v.visitType}</TableCell>
                  <TableCell><Pill tone={priorityTone(v.priority)}>{v.priority}</Pill></TableCell>
                  <TableCell><Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill></TableCell>
                  <TableCell className="text-sm">{v.assignedDoctor ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DesktopOnlyTable>
      </Card>
    </Shell>
  );
};

/* =====================================================================
   2. PATIENT QUEUE
   ===================================================================== */
const VISIT_TYPES: OpcVisitType[] = ['New', 'Returning', 'Follow-up', 'Emergency'];
const PAYERS: OpcPayer[] = ['Cash', 'NHIS', 'HMO', 'Private'];
const PRIORITIES: OpcPriority[] = ['Normal', 'Urgent', 'Crisis', 'Emergency'];
const NEXT_STATUS: OpcVisitStatus[] = ['WAITING', 'WITH_NURSE', 'WITH_DOCTOR', 'AWAITING_LAB', 'AWAITING_PHARMACY', 'COMPLETED', 'REFERRED', 'FOR_ADMISSION'];

export const PsychOpcQueue = () => {
  useDbTick();
  const navigate = useNavigate();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [filter, setFilter] = useState<'all' | OpcVisitStatus>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [vtype, setVtype] = useState<OpcVisitType>('New');
  const [payer, setPayer] = useState<OpcPayer>('Cash');
  const [priority, setPriority] = useState<OpcPriority>('Normal');
  const [reason, setReason] = useState('');

  const all = db.opcVisits.list().slice().reverse();
  const count = (s: OpcVisitStatus) => all.filter(v => v.status === s).length;
  const visits = all
    .filter(v => filter === 'all' || v.status === filter)
    .filter(v => !q || v.patientName.toLowerCase().includes(q.toLowerCase()) || v.hospitalId.toLowerCase().includes(q.toLowerCase()));

  const checkIn = () => {
    if (!pid) { notify.error('checkin', 'Select a patient to check in'); return; }
    run('checkin', 'Checking patient in…',
      () => { const v = opc.checkInVisit({ patientId: pid, visitType: vtype, payer, priority, reason, by: staff }); return { ok: true as const, message: `${v.patientName} checked in to the OPC queue.` }; },
      r => r.message, () => 'Check-in failed',
    ).then(r => { if (r?.ok) { setPid(''); setReason(''); setOpen(false); } });
  };
  const move = (id: string, status: OpcVisitStatus) => {
    run(`mv-${id}`, 'Updating queue…', () => opc.setVisitStatus(id, status, staff), r => r.message, r => r.message ?? 'Failed');
  };

  return (
    <Shell title="Patient Queue">
      <Section icon={<Users className="h-5 w-5" />} title="Patient Queue Management" desc="Check-in, triage tagging, waiting-time and clinic flow. Click a card to filter, then advance each patient to the next step."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Check-in</Button>} />

      <StatRow>
        <MiniStat label="Waiting" value={count('WAITING')} tone="amber" active={filter === 'WAITING'} onClick={() => setFilter('WAITING')} />
        <MiniStat label="With Nurse" value={count('WITH_NURSE')} tone="sky" active={filter === 'WITH_NURSE'} onClick={() => setFilter('WITH_NURSE')} />
        <MiniStat label="With Doctor" value={count('WITH_DOCTOR')} tone="blue" active={filter === 'WITH_DOCTOR'} onClick={() => setFilter('WITH_DOCTOR')} />
        <MiniStat label="For Admission" value={count('FOR_ADMISSION')} tone="purple" active={filter === 'FOR_ADMISSION'} onClick={() => setFilter('FOR_ADMISSION')} />
        <MiniStat label="Completed" value={count('COMPLETED')} tone="green" active={filter === 'COMPLETED'} onClick={() => setFilter('COMPLETED')} />
      </StatRow>

      <Card>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button type="button" onClick={() => setFilter('all')} className={`text-xs px-3 py-2 min-h-10 rounded-full border ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>All ({all.length})</button>
          {(['WAITING', 'WITH_NURSE', 'WITH_DOCTOR', 'AWAITING_LAB', 'AWAITING_PHARMACY', 'REFERRED', 'FOR_ADMISSION', 'COMPLETED'] as OpcVisitStatus[]).map(s => (
            <button type="button" key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-2 min-h-10 rounded-full border ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>{statusLabel(s)} ({count(s)})</button>
          ))}
          <div className="relative w-full sm:flex-1 sm:ml-auto"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-9 h-10 w-full" /></div>
        </div>
        <MobileWorklist>
          {visits.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No patients in this view.</div> : visits.map(v => (
            <MobileWorklistCard
              key={v.id}
              title={v.patientName}
              subtitle={`${v.hospitalId} · ${v.visitType} · ${v.payer}`}
              status={<Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill>}
              actions={
                <>
                  <Select value={v.status} onValueChange={val => move(v.id, val as OpcVisitStatus)} disabled={isBusy(`mv-${v.id}`)}>
                    <SelectTrigger className="h-10 min-w-[9rem] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{NEXT_STATUS.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-10 text-xs" onClick={() => navigate(`${base}/consult`)}>Open <ArrowRight className="h-3 w-3 ml-1" /></Button>
                </>
              }
            />
          ))}
        </MobileWorklist>
        <DesktopOnlyTable>
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Next Step</TableHead></TableRow></TableHeader>
              <TableBody>
                {visits.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No patients in this view.</TableCell></TableRow> : visits.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.patientName}<div className="text-xs text-muted-foreground">{v.hospitalId} · {v.payer}</div></TableCell>
                    <TableCell className="text-sm">{v.visitType}</TableCell>
                    <TableCell><Pill tone={priorityTone(v.priority)}>{v.priority}</Pill></TableCell>
                    <TableCell><Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Select value={v.status} onValueChange={val => move(v.id, val as OpcVisitStatus)} disabled={isBusy(`mv-${v.id}`)}>
                          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{NEXT_STATUS.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`${base}/consult`)}>Open <ArrowRight className="h-3 w-3 ml-1" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DesktopOnlyTable>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="Check-in Patient" desc="Add a patient to the Psychiatric OPC queue."
        footer={<LoadingButton loading={isBusy('checkin')} loadingText="Checking in…" onClick={checkIn}><Plus className="h-4 w-4 mr-1.5" />Check In</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div><Label className="text-xs">Visit Type</Label><Select value={vtype} onValueChange={v => setVtype(v as OpcVisitType)}><SelectTrigger className="min-h-10"><SelectValue /></SelectTrigger><SelectContent>{VISIT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Payer</Label><Select value={payer} onValueChange={v => setPayer(v as OpcPayer)}><SelectTrigger className="min-h-10"><SelectValue /></SelectTrigger><SelectContent>{PAYERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div><Label className="text-xs">Priority</Label><Select value={priority} onValueChange={v => setPriority(v as OpcPriority)}><SelectTrigger className="min-h-10"><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Reason / Complaint</Label><Textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Medication review, relapse, first presentation…" /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   3. ACTIVE CONSULTATION — clinician workspace
   ===================================================================== */
export const PsychOpcConsultation = () => {
  useDbTick();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const active = db.opcVisits.list().filter(v => v.status === 'WITH_DOCTOR' || v.status === 'WITH_NURSE');
  const [pickedId, setPickedId] = useState<string | null>(active[0]?.id ?? null);
  const visit = pickedId ? db.opcVisits.get(pickedId) : undefined;
  const profile = visit ? opc.patientProfile(visit.patientId) : undefined;

  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState<PsychNoteType>('SOAP');
  const [confidentialNote, setConfidentialNote] = useState(false);

  const saveNote = (status: 'DRAFT' | 'FINAL') => {
    if (!visit) return;
    run('note', status === 'FINAL' ? 'Finalising note…' : 'Saving draft…',
      () => opc.saveNote({
        patientId: visit.patientId,
        visitId: visit.id,
        type: noteType,
        content: note,
        status,
        confidential: canUseConfidentialNotes(user?.role) ? confidentialNote : false,
        by: staff,
      }),
      r => r.message, r => r.message ?? 'Failed',
    ).then(r => { if (r?.ok && status === 'FINAL') setNote(''); });
  };
  const complete = () => { if (!visit) return; run('done', 'Completing visit…', () => opc.completeVisit(visit.id, staff), r => r.message, r => r.message ?? 'Failed'); };
  const bill = () => { if (!visit) return; run('bill', 'Sending to cashier…', () => opc.billConsultation({ patientId: visit.patientId, description: 'Psychiatric OPC consultation', amount: opc.CONSULTATION_FEE, by: staff }), r => r.message, r => r.message ?? 'Failed'); };

  const nextSteps = [
    { label: 'Assessment', to: `${base}/assessment`, icon: <ClipboardList className="h-4 w-4" /> },
    { label: 'MSE', to: `${base}/mse`, icon: <Brain className="h-4 w-4" /> },
    { label: 'Diagnosis', to: `${base}/diagnosis`, icon: <ListChecks className="h-4 w-4" /> },
    { label: 'Prescribe', to: `${base}/prescriptions`, icon: <PillIcon className="h-4 w-4" /> },
    { label: 'Investigations', to: `${base}/investigations`, icon: <FlaskConical className="h-4 w-4" /> },
    { label: 'Risk', to: `${base}/risk`, icon: <ShieldAlert className="h-4 w-4" /> },
    { label: 'Admission', to: `${base}/admission`, icon: <BedDouble className="h-4 w-4" /> },
    { label: 'Follow-up', to: `${base}/appointments`, icon: <CalendarClock className="h-4 w-4" /> },
  ];

  return (
    <Shell title="Active Consultation">
      <Section icon={<Stethoscope className="h-5 w-5" />} title="Active Consultation" desc="Clinical workspace for the patient currently with the clinician — notes, quick next-step actions and full psychiatric history." />
      <StatRow>
        <MiniStat label="With Doctor" value={db.opcVisits.list().filter(v => v.status === 'WITH_DOCTOR').length} tone="blue" />
        <MiniStat label="With Nurse" value={db.opcVisits.list().filter(v => v.status === 'WITH_NURSE').length} tone="sky" />
        <MiniStat label="Waiting" value={db.opcVisits.list().filter(v => v.status === 'WAITING').length} tone="amber" />
        <MiniStat label="Completed Today" value={opc.todaysVisits().filter(v => v.status === 'COMPLETED').length} tone="green" />
        <MiniStat label="For Admission" value={db.opcVisits.list().filter(v => v.status === 'FOR_ADMISSION').length} tone="purple" />
      </StatRow>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">In Consultation</h3>
          <div className="space-y-2 max-h-[540px] overflow-auto">
            {active.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">No patient with nurse/doctor. Move a patient from the Queue.</div> : active.map(v => (
              <button key={v.id} onClick={() => setPickedId(v.id)} className={`w-full text-left p-3 border rounded-lg hover:border-primary/50 ${pickedId === v.id ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex justify-between"><span className="font-semibold text-sm">{v.patientName}</span><Pill tone={priorityTone(v.priority)}>{v.priority}</Pill></div>
                <div className="text-xs text-muted-foreground">{v.hospitalId} · {v.reason ?? v.visitType}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          {!visit || !profile ? <div className="text-sm text-muted-foreground text-center py-16">Select a patient in consultation.</div> : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><div className="font-display font-bold text-lg">{visit.patientName}</div><div className="text-xs text-muted-foreground">{visit.hospitalId} · {visit.visitType} · {visit.payer}</div></div>
                <div className="flex gap-2">
                  <LoadingButton variant="outline" loading={isBusy('bill')} loadingText="…" onClick={bill}>Bill Consultation</LoadingButton>
                  <LoadingButton loading={isBusy('done')} loadingText="…" onClick={complete}><CheckCircle2 className="h-4 w-4 mr-1.5" />Complete Visit</LoadingButton>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 border rounded-lg"><div className="text-muted-foreground">Active Diagnoses</div><div className="font-semibold">{profile.diagnoses.filter(d => d.status === 'Active').length}</div></div>
                <div className="p-2 border rounded-lg"><div className="text-muted-foreground">Assessments</div><div className="font-semibold">{profile.assessments.length}</div></div>
                <div className="p-2 border rounded-lg"><div className="text-muted-foreground">Latest Risk</div><div className="font-semibold">{profile.risk ? (profile.risk.crisisAlert ? 'HIGH' : 'Recorded') : '—'}</div></div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">Continue to next step</div>
                <div className="flex flex-wrap gap-2">
                  {nextSteps.map(s => <Button key={s.label} size="sm" variant="outline" className="h-8" onClick={() => navigate(s.to)}>{s.icon}<span className="ml-1.5">{s.label}</span></Button>)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-xs">Note Type</Label>
                  <Select value={noteType} onValueChange={v => setNoteType(v as PsychNoteType)}><SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['SOAP', 'Consultation', 'Progress', 'Follow-up', 'Emergency', 'Discharge Planning', 'Ward Referral'] as PsychNoteType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <Textarea rows={5} value={note} onChange={e => setNote(e.target.value)} placeholder="Document the consultation…" />
                {canUseConfidentialNotes(user?.role) && (
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={confidentialNote} onChange={(e) => setConfidentialNote(e.target.checked)} />
                    Mark as confidential note
                  </label>
                )}
                <div className="flex gap-2 justify-end mt-2">
                  <LoadingButton variant="outline" loading={isBusy('note')} loadingText="Saving…" onClick={() => saveNote('DRAFT')}>Save Draft</LoadingButton>
                  <LoadingButton loading={isBusy('note')} loadingText="Finalising…" onClick={() => saveNote('FINAL')}><Send className="h-4 w-4 mr-1.5" />Finalise Note</LoadingButton>
                </div>
              </div>
              {profile.notes.length > 0 && (
                <div className="border rounded-lg p-3 text-xs space-y-1 max-h-40 overflow-auto">
                  {profile.notes.slice().reverse().map(n => <div key={n.id} className="flex justify-between"><span>{n.type} · {n.by}</span><Pill tone={n.status === 'FINAL' ? 'green' : 'amber'}>{n.status}</Pill></div>)}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   4. PSYCHIATRIC ASSESSMENT
   ===================================================================== */
const ASSESSMENT_TYPES: PsychAssessmentType[] = [
  'Initial Psychiatric Assessment', 'Follow-up Psychiatric Assessment', 'Suicide/Self-harm Screening',
  'Violence/Aggression Risk', 'Substance Use Assessment', 'Sleep Assessment', 'Mood Assessment',
  'Psychosis Assessment', 'Anxiety Assessment', 'Cognitive Assessment', 'Child/Adolescent Assessment',
  'Geriatric Assessment', 'Forensic Assessment', 'Drug Adherence Assessment', 'Medication Side Effect Assessment', 'Psychosocial Assessment',
];

export const PsychOpcAssessment = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [pid, setPid] = useState('');
  const [type, setType] = useState<PsychAssessmentType>('Initial Psychiatric Assessment');
  const [presenting, setPresenting] = useState('');
  const [history, setHistory] = useState('');
  const [summary, setSummary] = useState('');

  const all = db.psychAssessments.list().slice().reverse();
  const list = all.filter(a => !q || a.patientName.toLowerCase().includes(q.toLowerCase()) || a.type.toLowerCase().includes(q.toLowerCase()));
  const today = all.filter(a => a.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const followUps = all.filter(a => a.type.includes('Follow-up')).length;
  const screenings = all.filter(a => a.type.includes('Screening') || a.type.includes('Risk')).length;

  const save = () => {
    if (!pid) { notify.error('asm', 'Select a patient'); return; }
    run('asm', 'Saving assessment…',
      () => { const a = opc.saveAssessment({ patientId: pid, type, values: { presenting, history }, summary, by: staff }); return { ok: true as const, message: `${a.type} saved.` }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setPresenting(''); setHistory(''); setSummary(''); setOpen(false); } });
  };

  return (
    <Shell title="Psychiatric Assessment">
      <Section icon={<ClipboardList className="h-5 w-5" />} title="Psychiatric Assessment Forms" desc="Structured psychiatric documentation — initial, follow-up and specialised screening tools. Every entry is timestamped and audited."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Assessment</Button>} />
      <StatRow>
        <MiniStat label="Total Assessments" value={all.length} tone="blue" />
        <MiniStat label="Today" value={today} tone="green" />
        <MiniStat label="Follow-ups" value={followUps} tone="sky" />
        <MiniStat label="Risk / Screening" value={screenings} tone="amber" />
        <MiniStat label="Form Types" value={ASSESSMENT_TYPES.length} tone="slate" />
      </StatRow>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">All Assessments</h3>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search patient or type…" className="pl-9 h-9 w-64" /></div>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Summary</TableHead><TableHead>By</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No assessments yet.</TableCell></TableRow> : list.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.patientName}</TableCell>
                <TableCell className="text-xs">{a.type}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{a.summary ?? '—'}</TableCell>
                <TableCell className="text-xs">{a.by}</TableCell>
                <TableCell className="text-xs">{a.createdAt.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="New Psychiatric Assessment" desc="Structured, timestamped and audited."
        footer={<LoadingButton loading={isBusy('asm')} loadingText="Saving…" onClick={save}><Send className="h-4 w-4 mr-1.5" />Save Assessment</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div><Label className="text-xs">Assessment Type</Label><Select value={type} onValueChange={v => setType(v as PsychAssessmentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Presenting Complaint</Label><Textarea rows={2} value={presenting} onChange={e => setPresenting(e.target.value)} /></div>
        <div><Label className="text-xs">History / Findings</Label><Textarea rows={3} value={history} onChange={e => setHistory(e.target.value)} /></div>
        <div><Label className="text-xs">Clinical Summary</Label><Textarea rows={2} value={summary} onChange={e => setSummary(e.target.value)} /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   5. MENTAL STATUS EXAMINATION (MSE)
   ===================================================================== */
const MSE_FIELDS: { key: string; label: string; options?: string[] }[] = [
  { key: 'appearance', label: 'Appearance', options: ['Well-kempt', 'Unkempt', 'Dishevelled', 'Bizarre'] },
  { key: 'behaviour', label: 'Behaviour', options: ['Cooperative', 'Agitated', 'Withdrawn', 'Guarded', 'Hostile'] },
  { key: 'speech', label: 'Speech', options: ['Normal', 'Pressured', 'Slowed', 'Poverty of speech', 'Mute'] },
  { key: 'mood', label: 'Mood', options: ['Euthymic', 'Depressed', 'Elevated', 'Anxious', 'Irritable'] },
  { key: 'affect', label: 'Affect', options: ['Congruent', 'Blunted', 'Flat', 'Labile', 'Inappropriate'] },
  { key: 'thoughtForm', label: 'Thought Form', options: ['Logical', 'Circumstantial', 'Tangential', 'Flight of ideas', 'Loosening'] },
  { key: 'thoughtContent', label: 'Thought Content', options: ['Normal', 'Delusions', 'Obsessions', 'Suicidal ideation', 'Homicidal ideation'] },
  { key: 'perception', label: 'Perception', options: ['Normal', 'Auditory hallucinations', 'Visual hallucinations', 'Illusions'] },
  { key: 'cognition', label: 'Cognition', options: ['Intact', 'Mild impairment', 'Moderate impairment', 'Severe impairment'] },
  { key: 'insight', label: 'Insight', options: ['Good', 'Partial', 'Poor', 'Absent'] },
  { key: 'judgment', label: 'Judgment', options: ['Good', 'Fair', 'Impaired'] },
];

export const PsychOpcMse = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [pid, setPid] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [impression, setImpression] = useState('');
  const [plan, setPlan] = useState('');

  const mseList = db.psychAssessments.list().filter(a => a.type === 'Mental Status Examination').slice().reverse();
  const set = (k: string, v: string) => setValues(s => ({ ...s, [k]: v }));

  const save = () => {
    if (!pid) { notify.error('mse', 'Select a patient'); return; }
    run('mse', 'Saving MSE…',
      () => { const a = opc.saveAssessment({ patientId: pid, type: 'Mental Status Examination', values: { ...values, impression, plan }, summary: impression, by: staff }); return { ok: true as const, message: `MSE saved for ${a.patientName}.` }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setValues({}); setImpression(''); setPlan(''); } });
  };

  return (
    <Shell title="Mental Status Examination">
      <Section icon={<Brain className="h-5 w-5" />} title="Mental Status Examination (MSE)" desc="Structured MSE with dropdowns and free text — appearance through insight, judgment and plan." />
      <StatRow>
        <MiniStat label="MSEs Recorded" value={mseList.length} tone="blue" />
        <MiniStat label="Today" value={mseList.filter(a => a.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length} tone="green" />
        <MiniStat label="Domains" value={MSE_FIELDS.length} tone="slate" />
      </StatRow>
      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <div className="mb-4 max-w-sm"><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            {MSE_FIELDS.map(f => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Select value={values[f.key] ?? ''} onValueChange={v => set(f.key, v)}><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{(f.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div><Label className="text-xs">Doctor's Impression</Label><Textarea rows={3} value={impression} onChange={e => setImpression(e.target.value)} /></div>
            <div><Label className="text-xs">Plan</Label><Textarea rows={3} value={plan} onChange={e => setPlan(e.target.value)} /></div>
          </div>
          <div className="flex justify-end mt-4"><LoadingButton loading={isBusy('mse')} loadingText="Saving…" onClick={save}><Send className="h-4 w-4 mr-1.5" />Save MSE</LoadingButton></div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Recent MSEs</h3>
          <div className="space-y-2 max-h-[520px] overflow-auto">
            {mseList.length === 0 ? <div className="text-sm text-muted-foreground text-center py-8">No MSEs recorded.</div> : mseList.map(a => (
              <div key={a.id} className="p-2.5 border rounded-lg text-sm"><div className="font-medium">{a.patientName}</div><div className="text-xs text-muted-foreground">{a.by} · {a.createdAt.slice(0, 10)}</div></div>
            ))}
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   6. DIAGNOSIS & TREATMENT PLAN
   ===================================================================== */
const DX_CATEGORIES = [
  'Schizophrenia spectrum disorders', 'Mood disorders', 'Anxiety disorders', 'Substance use disorders',
  'Personality disorders', 'Neurodevelopmental disorders', 'Dementia and cognitive disorders',
  'Sleep disorders', 'Child and adolescent disorders', 'Psychogeriatric conditions',
];
const DX_TYPES: PsychDxType[] = ['Primary', 'Secondary', 'Provisional', 'Differential'];

export const PsychOpcDiagnosis = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'Active' | 'Inactive' | 'all'>('all');
  const [pid, setPid] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState(DX_CATEGORIES[0]);
  const [dxType, setDxType] = useState<PsychDxType>('Primary');
  const [followUp, setFollowUp] = useState('');
  const [medPlan, setMedPlan] = useState('');
  const [therapyPlan, setTherapyPlan] = useState('');

  const allDx = db.psychDiagnoses.list().slice().reverse();
  const scoped = pid ? allDx.filter(d => d.patientId === pid) : allDx;
  const dxList = scoped.filter(d => tab === 'all' || d.status === tab);
  const plans = db.opcTreatmentPlans.list();

  const addDx = () => {
    if (!pid || !code || !label) { notify.error('dx', 'Patient, ICD code and diagnosis are required'); return; }
    run('dx', 'Recording diagnosis…',
      () => { opc.addDiagnosis({ patientId: pid, code, label, category, type: dxType, by: staff }); return { ok: true as const, message: `${code} — ${label} recorded.` }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setCode(''); setLabel(''); } });
  };
  const savePlan = () => {
    if (!pid) { notify.error('plan', 'Select a patient'); return; }
    run('plan', 'Saving treatment plan…',
      () => { opc.saveTreatmentPlan({ patientId: pid, medicationPlan: medPlan, psychotherapyPlan: therapyPlan, followUpDate: followUp, by: staff }); return { ok: true as const, message: 'Treatment plan saved.' }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setMedPlan(''); setTherapyPlan(''); } });
  };
  const toggle = (id: string, status: 'Active' | 'Inactive') => run(`tg-${id}`, 'Updating…', () => opc.setDiagnosisStatus(id, status, staff), r => r.message, r => r.message ?? 'Failed');

  return (
    <Shell title="Diagnosis & Plan">
      <Section icon={<ListChecks className="h-5 w-5" />} title="Diagnosis & Treatment Plan" desc="ICD-10/11 diagnosis with primary/secondary/provisional/differential typing, status tracking, and structured care planning." />
      <StatRow>
        <MiniStat label="All Diagnoses" value={allDx.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Active" value={allDx.filter(d => d.status === 'Active').length} tone="green" active={tab === 'Active'} onClick={() => setTab('Active')} />
        <MiniStat label="Inactive" value={allDx.filter(d => d.status === 'Inactive').length} tone="slate" active={tab === 'Inactive'} onClick={() => setTab('Inactive')} />
        <MiniStat label="Provisional" value={allDx.filter(d => d.type === 'Provisional').length} tone="amber" />
        <MiniStat label="Treatment Plans" value={plans.length} tone="purple" />
      </StatRow>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">Record Diagnosis</h3>
          <div className="space-y-3">
            <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">ICD Code</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="F20.0" /></div>
              <div><Label className="text-xs">Type</Label><Select value={dxType} onValueChange={v => setDxType(v as PsychDxType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label className="text-xs">Diagnosis</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Paranoid schizophrenia" /></div>
            <div><Label className="text-xs">Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DX_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <LoadingButton className="w-full" loading={isBusy('dx')} loadingText="Recording…" onClick={addDx}><Plus className="h-4 w-4 mr-1.5" />Add Diagnosis</LoadingButton>
          </div>
          <div className="mt-4 border rounded-lg divide-y max-h-56 overflow-auto">
            {dxList.length === 0 ? <div className="text-sm text-muted-foreground text-center py-6">No diagnoses in this view.</div> : dxList.map(d => (
              <div key={d.id} className="p-2 flex items-center justify-between text-sm">
                <div><span className="font-mono text-xs">{d.code}</span> {d.label} <Pill tone={d.status === 'Active' ? 'green' : 'slate'}>{d.type}</Pill></div>
                <button className="text-xs underline" onClick={() => toggle(d.id, d.status === 'Active' ? 'Inactive' : 'Active')} disabled={isBusy(`tg-${d.id}`)}>{d.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Treatment Plan</h3>
          <div className="space-y-3">
            <div><Label className="text-xs">Medication Plan</Label><Textarea rows={3} value={medPlan} onChange={e => setMedPlan(e.target.value)} /></div>
            <div><Label className="text-xs">Psychotherapy / Psychoeducation Plan</Label><Textarea rows={3} value={therapyPlan} onChange={e => setTherapyPlan(e.target.value)} /></div>
            <div><Label className="text-xs">Follow-up Date</Label><Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} /></div>
            <LoadingButton className="w-full" loading={isBusy('plan')} loadingText="Saving…" onClick={savePlan}><Send className="h-4 w-4 mr-1.5" />Save Treatment Plan</LoadingButton>
          </div>
        </Card>
      </div>
    </Shell>
  );
};

/* =====================================================================
   7. PRESCRIPTIONS
   ===================================================================== */
const PSYCH_DRUGS = [
  { code: 'HAL-5', name: 'Haloperidol 5mg', price: 1200 },
  { code: 'OLA-10', name: 'Olanzapine 10mg', price: 3500 },
  { code: 'RIS-2', name: 'Risperidone 2mg', price: 2200 },
  { code: 'FLU-20', name: 'Fluoxetine 20mg', price: 1800 },
  { code: 'SER-50', name: 'Sertraline 50mg', price: 2600 },
  { code: 'DIA-5', name: 'Diazepam 5mg', price: 900 },
  { code: 'CBZ-200', name: 'Carbamazepine 200mg', price: 1500 },
  { code: 'FLU-D', name: 'Fluphenazine Depot 25mg', price: 4200 },
];

export const PsychOpcPrescriptions = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const all = db.orders.list().filter(o => o.kind === 'drug').slice().reverse();
  const pending = all.filter(o => !isDone(o.status));
  const completed = all.filter(o => isDone(o.status));
  const rows = tab === 'pending' ? pending : tab === 'completed' ? completed : all;

  const toggle = (code: string) => setSelected(s => ({ ...s, [code]: !s[code] }));
  const send = () => {
    const drugs = PSYCH_DRUGS.filter(d => selected[d.code]);
    if (!pid) { notify.error('rx', 'Select a patient'); return; }
    if (drugs.length === 0) { notify.error('rx', 'Select at least one medication'); return; }
    run('rx', 'Sending prescription to pharmacy…', async () => {
      if (isPrescriptionsApiEnabled()) {
        const personId = await resolveApiPersonId(pid);
        const catalog = await listDrugs({ q: '', limit: 200 });
        await createPrescription({
          personId,
          clinic: 'Psychiatric OPC',
          diagnosis: 'Psychiatric follow-up',
          notes: 'Created from Psychiatric OPC',
          items: drugs.map((d) => {
            const matched = catalog.items.find((it) =>
              it.name.toLowerCase().includes(d.name.split(' ')[0].toLowerCase()),
            );
            if (!matched) {
              throw new ApiError(`Drug "${d.name}" not found in Pharmacy catalog`, 400);
            }
            return {
              drugId: matched.drugId,
              dose: 'As prescribed',
              frequency: 'Daily',
              quantity: 1,
              source: d.code,
              instructions: d.name,
            };
          }),
        });
        return { ok: true as const, message: `Prescription sent to Pharmacy (${drugs.length} item(s)).` };
      }
      return opc.prescribe(pid, drugs, staff);
    }, r => r.message, r => r.message ?? 'Failed')
      .then(r => { if (r?.ok) { setSelected({}); setOpen(false); } });
  };
  const nameFor = (patientId: string) => db.patients.get(patientId)?.name ?? patientId;

  return (
    <Shell title="Prescriptions">
      <Section icon={<PillIcon className="h-5 w-5" />} title="Prescription & Medication Management" desc="Prescribe psychiatric medications, including depot injections — routed straight to Pharmacy and the Nursing MAR."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Prescription</Button>} />
      <StatRow>
        <MiniStat label="All Prescriptions" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Pending / At Pharmacy" value={pending.length} tone="amber" active={tab === 'pending'} onClick={() => setTab('pending')} />
        <MiniStat label="Dispensed / Completed" value={completed.length} tone="green" active={tab === 'completed'} onClick={() => setTab('completed')} />
      </StatRow>
      <Card>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(['all', 'pending', 'completed'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${tab === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'}`}>{t} ({t === 'all' ? all.length : t === 'pending' ? pending.length : completed.length})</button>
          ))}
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Patient</TableHead><TableHead>Medications</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No prescriptions in this view.</TableCell></TableRow> : rows.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id}</TableCell>
                <TableCell className="font-medium text-sm">{nameFor(o.patientId)}</TableCell>
                <TableCell className="text-xs">{o.items.map(i => i.name).join(', ')}</TableCell>
                <TableCell><Pill tone={isDone(o.status) ? 'green' : 'amber'}>{statusLabel(o.status)}</Pill></TableCell>
                <TableCell className="text-xs">{(o.createdAt ?? '').slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="New Prescription" desc="Sent to Pharmacy for dispensing and mirrored in the Nursing MAR."
        footer={<LoadingButton loading={isBusy('rx')} loadingText="Sending…" onClick={send}><Send className="h-4 w-4 mr-1.5" />Send Prescription</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div className="border rounded-lg divide-y max-h-72 overflow-auto">
          {PSYCH_DRUGS.map(d => (
            <label key={d.code} className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-muted/40">
              <span className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!selected[d.code]} onChange={() => toggle(d.code)} />{d.name}</span>
              <span className="text-xs text-muted-foreground">{formatCurrency(d.price)}</span>
            </label>
          ))}
        </div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   8. LAB / INVESTIGATIONS
   ===================================================================== */
const LAB_TESTS = [
  { code: 'FBC', name: 'Full Blood Count', price: 3500 },
  { code: 'LFT', name: 'Liver Function Test', price: 6000 },
  { code: 'RFT', name: 'Renal Function Test', price: 6000 },
  { code: 'TFT', name: 'Thyroid Function Test', price: 8000 },
  { code: 'LI', name: 'Serum Lithium Level', price: 5000 },
  { code: 'UDS', name: 'Urine Drug Screen', price: 4500 },
  { code: 'TOX', name: 'Toxicology Screen', price: 9000 },
];
const IMAGING = [
  { code: 'CT-BR', name: 'CT Brain', price: 45000 },
  { code: 'MRI-BR', name: 'MRI Brain', price: 90000 },
  { code: 'ECG', name: 'ECG (12-lead)', price: 7000 },
  { code: 'EEG', name: 'EEG', price: 15000 },
];

export const PsychOpcInvestigations = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | 'lab' | 'imaging' | 'pending' | 'completed'>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [labs, setLabs] = useState<Record<string, boolean>>({});
  const [imgSel, setImgSel] = useState<Record<string, boolean>>({});
  const [apiImagingRows, setApiImagingRows] = useState<ApiImagingRequest[]>([]);

  const all = db.orders.list().filter(o => o.kind === 'lab' || o.kind === 'imaging').slice().reverse();
  useEffect(() => {
    if (!isImagingApiEnabled()) return;
    void listImagingRequests({ source: 'OPC', page: 1, limit: 100 })
      .then((res) => setApiImagingRows(res.items))
      .catch(() => setApiImagingRows([]));
  }, []);
  const rows = all.filter(o =>
    tab === 'all' ? true :
    tab === 'lab' ? o.kind === 'lab' :
    tab === 'imaging' ? o.kind === 'imaging' :
    tab === 'pending' ? !isDone(o.status) : isDone(o.status));
  const nameFor = (patientId: string) => db.patients.get(patientId)?.name ?? patientId;

  const submit = () => {
    if (!pid) { notify.error('inv', 'Select a patient'); return; }
    const tests = LAB_TESTS.filter(t => labs[t.code]);
    const imgs = IMAGING.filter(t => imgSel[t.code]);
    if (tests.length === 0 && imgs.length === 0) { notify.error('inv', 'Select at least one investigation'); return; }
    run('inv', 'Sending investigation requests…',
      async () => {
        if (tests.length) {
          if (isLaboratoryApiEnabled()) {
            const personId = await resolveApiPersonId(pid);
            const catalog = await listLabTests({ q: '', limit: 200 });
            const items = tests.map((t) => {
              const matched = catalog.items.find((it) =>
                it.testCode.toUpperCase() === t.code || it.name.toLowerCase().includes(t.name.toLowerCase()),
              );
              if (!matched) throw new ApiError(`Lab test "${t.name}" not found in Lab catalog`, 400);
              return { labTestId: matched.labTestId, lineNotes: 'Requested from Psychiatric OPC' };
            });
            await createLabRequest({
              personId,
              source: 'Doctor',
              priority: 'Routine',
              clinicalIndication: 'Psychiatric OPC investigation',
              items,
            });
          } else {
            opc.requestLab(pid, tests, staff);
          }
        }
        if (imgs.length && isImagingApiEnabled()) {
          const personId = await resolveApiPersonId(pid);
          const items = await resolveImagingStudyItems(imgs);
          if (items.length === 0) throw new ApiError('No matching imaging studies in catalog', 400);
          await createImagingRequest({
            personId,
            priority: 'Routine',
            clinicalIndication: 'Psychiatric OPC investigation',
            source: 'OPC',
            items,
          });
        } else {
          imgs.forEach(s => opc.requestImaging(pid, s, staff));
        }
        return { ok: true as const, message: `${tests.length} lab + ${imgs.length} imaging request(s) sent.` };
      },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setLabs({}); setImgSel({}); setOpen(false); } });
  };

  return (
    <Shell title="Lab / Investigations">
      <Section icon={<FlaskConical className="h-5 w-5" />} title="Lab & Investigation Requests" desc="Request labs, imaging, ECG/EEG and drug screening — routed to Laboratory and Radiology with result tracking."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Request</Button>} />
      <StatRow>
        <MiniStat label="All Requests" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Lab" value={all.filter(o => o.kind === 'lab').length} tone="purple" active={tab === 'lab'} onClick={() => setTab('lab')} />
        <MiniStat label="Imaging / ECG" value={all.filter(o => o.kind === 'imaging').length} tone="sky" active={tab === 'imaging'} onClick={() => setTab('imaging')} />
        <MiniStat label="Pending" value={all.filter(o => !isDone(o.status)).length} tone="amber" active={tab === 'pending'} onClick={() => setTab('pending')} />
        <MiniStat label="Completed" value={all.filter(o => isDone(o.status)).length} tone="green" active={tab === 'completed'} onClick={() => setTab('completed')} />
      </StatRow>
      <Card>
        {isImagingApiEnabled() && (tab === 'all' || tab === 'imaging' || tab === 'pending' || tab === 'completed') && (
          <div className="mb-4 border rounded-lg p-3">
            <div className="text-xs font-semibold text-muted-foreground mb-2">Live OPC Imaging Requests</div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {apiImagingRows.length === 0 ? (
                <div className="text-xs text-muted-foreground">No API imaging requests found yet.</div>
              ) : apiImagingRows.map((r) => (
                <div key={r.imagingRequestId} className="text-xs flex items-center justify-between gap-3 border rounded px-2 py-1">
                  <span>{r.requestNo} · {imagingPatientName(r.person)} · {r.items.map((i) => i.studyCode).join(', ')}</span>
                  <Pill tone={isDone(r.status) ? 'green' : 'amber'}>{r.status}</Pill>
                </div>
              ))}
            </div>
          </div>
        )}
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Patient</TableHead><TableHead>Kind</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No requests in this view.</TableCell></TableRow> : rows.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-xs">{o.id}</TableCell>
                <TableCell className="font-medium text-sm">{nameFor(o.patientId)}</TableCell>
                <TableCell className="text-xs uppercase">{o.kind}</TableCell>
                <TableCell className="text-xs">{o.items.map(i => i.name).join(', ')}</TableCell>
                <TableCell><Pill tone={isDone(o.status) ? 'green' : 'amber'}>{statusLabel(o.status)}</Pill></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="New Investigation Request" desc="Labs go to Laboratory; imaging / ECG / EEG go to Radiology."
        footer={<LoadingButton loading={isBusy('inv')} loadingText="Sending…" onClick={submit}><Send className="h-4 w-4 mr-1.5" />Send Requests</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Laboratory</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-auto mt-1">
              {LAB_TESTS.map(t => (
                <label key={t.code} className="flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-muted/40"><input type="checkbox" checked={!!labs[t.code]} onChange={() => setLabs(s => ({ ...s, [t.code]: !s[t.code] }))} />{t.name}</label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Imaging / ECG / EEG</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-auto mt-1">
              {IMAGING.map(t => (
                <label key={t.code} className="flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-muted/40"><input type="checkbox" checked={!!imgSel[t.code]} onChange={() => setImgSel(s => ({ ...s, [t.code]: !s[t.code] }))} />{t.name}</label>
              ))}
            </div>
          </div>
        </div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   9. RISK ASSESSMENT
   ===================================================================== */
export const PsychOpcRisk = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | 'crisis'>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [selfHarm, setSelfHarm] = useState<OpcRiskLevel>('None');
  const [harmOthers, setHarmOthers] = useState<OpcRiskLevel>('None');
  const [absconding, setAbsconding] = useState<OpcRiskLevel>('None');
  const [neglect, setNeglect] = useState<OpcRiskLevel>('None');
  const [substance, setSubstance] = useState<OpcRiskLevel>('None');
  const [vulnerable, setVulnerable] = useState(false);
  const [plan, setPlan] = useState('');

  const all = db.opcRiskAssessments.list().slice().reverse();
  const crisis = all.filter(r => r.crisisAlert);
  const rows = tab === 'crisis' ? crisis : all;
  const levelSel = (v: OpcRiskLevel, set: (v: OpcRiskLevel) => void, label: string) => (
    <div><Label className="text-xs">{label}</Label><Select value={v} onValueChange={x => set(x as OpcRiskLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RISK_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select></div>
  );

  const save = () => {
    if (!pid) { notify.error('risk', 'Select a patient'); return; }
    run('risk', 'Recording risk assessment…',
      () => { const r = opc.saveRiskAssessment({ patientId: pid, selfHarm, harmToOthers: harmOthers, absconding, neglect, substance, vulnerableFlag: vulnerable, safetyPlan: plan, by: staff }); return { ok: true as const, message: r.crisisAlert ? 'HIGH RISK — crisis alert raised and logged.' : 'Risk assessment recorded.' }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setPlan(''); setOpen(false); } });
  };

  return (
    <Shell title="Risk Assessment">
      <Section icon={<ShieldAlert className="h-5 w-5" />} title="Risk Assessment & Safety Management" desc="Screen risk to self and others, absconding, neglect and substance risk. High risk raises a crisis alert automatically."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Risk Assessment</Button>} />
      <StatRow>
        <MiniStat label="All Assessments" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Active Crisis Alerts" value={crisis.length} tone="red" active={tab === 'crisis'} onClick={() => setTab('crisis')} />
        <MiniStat label="Vulnerable Flags" value={all.filter(r => r.vulnerableFlag).length} tone="amber" />
        <MiniStat label="With Safety Plan" value={all.filter(r => r.safetyPlan).length} tone="green" />
      </StatRow>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Self</TableHead><TableHead>Others</TableHead><TableHead>Absconding</TableHead><TableHead>Flag</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No risk assessments in this view.</TableCell></TableRow> : rows.map(r => (
              <TableRow key={r.id} className={r.crisisAlert ? 'bg-rose-50' : ''}>
                <TableCell className="font-medium">{r.patientName}</TableCell>
                <TableCell><Pill tone={r.selfHarm === 'High' ? 'red' : r.selfHarm === 'Moderate' ? 'amber' : 'slate'}>{r.selfHarm}</Pill></TableCell>
                <TableCell><Pill tone={r.harmToOthers === 'High' ? 'red' : r.harmToOthers === 'Moderate' ? 'amber' : 'slate'}>{r.harmToOthers}</Pill></TableCell>
                <TableCell><Pill tone={r.absconding === 'High' ? 'red' : 'slate'}>{r.absconding}</Pill></TableCell>
                <TableCell>{r.crisisAlert ? <Pill tone="red">CRISIS</Pill> : r.vulnerableFlag ? <Pill tone="amber">Vulnerable</Pill> : '—'}</TableCell>
                <TableCell className="text-xs">{r.by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="New Risk Assessment" desc="Any 'High' dimension automatically raises a crisis alert."
        footer={<LoadingButton loading={isBusy('risk')} loadingText="Saving…" onClick={save}><ShieldAlert className="h-4 w-4 mr-1.5" />Record Risk Assessment</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div className="grid grid-cols-2 gap-2">
          {levelSel(selfHarm, setSelfHarm, 'Risk to Self')}
          {levelSel(harmOthers, setHarmOthers, 'Risk to Others')}
          {levelSel(absconding, setAbsconding, 'Absconding')}
          {levelSel(neglect, setNeglect, 'Self-neglect')}
          {levelSel(substance, setSubstance, 'Substance Abuse')}
          <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={vulnerable} onChange={e => setVulnerable(e.target.checked)} /> Vulnerable patient</label></div>
        </div>
        <div><Label className="text-xs">Safety Plan</Label><Textarea rows={3} value={plan} onChange={e => setPlan(e.target.value)} /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   10. ADMISSION REQUESTS
   ===================================================================== */
const ADM_STATUS_OPTS = ['PENDING', 'AWAITING_BILLING', 'AWAITING_BED', 'APPROVED', 'ADMITTED', 'DECLINED'] as const;
type AdmStatus = typeof ADM_STATUS_OPTS[number];

export const PsychOpcAdmission = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | AdmStatus>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [ward, setWard] = useState('Acute Male Ward');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<OpcPriority>('Normal');

  const wards = db.wards ? db.wards.list().map(w => w.name) : ['Acute Male Ward', 'Acute Female Ward', 'Rehabilitation Ward'];
  const all = db.opcAdmissionRequests.list().slice().reverse();
  const count = (s: AdmStatus) => all.filter(r => r.status === s).length;
  const rows = all.filter(r => tab === 'all' || r.status === tab);

  const request = () => {
    if (!pid || !reason) { notify.error('adm', 'Patient and reason are required'); return; }
    run('adm', 'Sending admission request…',
      async () => {
        if (isAdmissionRequestsApiEnabled()) {
          const personId = await resolveApiPersonId(pid);
          await createAdmissionRequest({
            personId,
            wardPreference: ward,
            priority: priority === 'Normal' ? 'Routine' : priority === 'Crisis' ? 'Emergency' : priority,
            clinicalIndication: reason,
            mentalHealthRisk: reason,
            clinicDepartment: 'Psychiatric OPC',
            doctorNote: `Requested by ${staff} from Psychiatric OPC`,
          });
          return { ok: true as const, message: 'Admission request sent to Records admission queue.' };
        }
        opc.requestAdmission({ patientId: pid, ward, reason, priority, by: staff });
        return { ok: true as const, message: 'Admission request sent to Records & Nursing.' };
      },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setReason(''); setOpen(false); } });
  };
  const setStatus = (id: string, status: AdmStatus) => run(`st-${id}`, 'Updating…', () => opc.setAdmissionStatus(id, status, staff), r => r.message, r => r.message ?? 'Failed');

  return (
    <Shell title="Admission Requests">
      <Section icon={<BedDouble className="h-5 w-5" />} title="Admission Request from OPC" desc="Recommend admission with ward, priority and reason. Track from pending through billing, bed allocation and admission."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Admission Request</Button>} />
      <StatRow>
        <MiniStat label="All" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Pending" value={count('PENDING')} tone="amber" active={tab === 'PENDING'} onClick={() => setTab('PENDING')} />
        <MiniStat label="Awaiting Bed" value={count('AWAITING_BED')} tone="sky" active={tab === 'AWAITING_BED'} onClick={() => setTab('AWAITING_BED')} />
        <MiniStat label="Approved" value={count('APPROVED')} tone="purple" active={tab === 'APPROVED'} onClick={() => setTab('APPROVED')} />
        <MiniStat label="Admitted" value={count('ADMITTED')} tone="green" active={tab === 'ADMITTED'} onClick={() => setTab('ADMITTED')} />
      </StatRow>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Ward</TableHead><TableHead>Priority</TableHead><TableHead>Next Step</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No admission requests in this view.</TableCell></TableRow> : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}<div className="text-xs text-muted-foreground">{r.reason}</div></TableCell>
                <TableCell className="text-sm">{r.ward}</TableCell>
                <TableCell><Pill tone={priorityTone(r.priority)}>{r.priority}</Pill></TableCell>
                <TableCell>
                  <Select value={r.status} onValueChange={v => setStatus(r.id, v as AdmStatus)} disabled={isBusy(`st-${r.id}`)}>
                    <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ADM_STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="New Admission Request" desc="Surfaced to Records/Admission and Nursing on the shared bed spine."
        footer={<LoadingButton loading={isBusy('adm')} loadingText="Sending…" onClick={request}><Send className="h-4 w-4 mr-1.5" />Request Admission</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div><Label className="text-xs">Ward / Unit</Label><Select value={ward} onValueChange={setWard}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{wards.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Priority</Label><Select value={priority} onValueChange={v => setPriority(v as OpcPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Reason</Label><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   11. FOLLOW-UP APPOINTMENTS
   ===================================================================== */
export const PsychOpcAppointments = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | 'SCHEDULED' | 'ATTENDED' | 'MISSED'>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const all = db.opcAppointments.list().slice().reverse();
  const count = (s: string) => all.filter(a => a.status === s).length;
  const rows = all.filter(a => tab === 'all' || a.status === tab);

  const book = () => {
    if (!pid || !date) { notify.error('appt', 'Patient and date are required'); return; }
    run('appt', 'Booking follow-up…',
      () => { const a = opc.bookAppointment({ patientId: pid, doctor: staff, date, reason }); return { ok: true as const, message: `Follow-up booked for ${a.patientName}.` }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setDate(''); setReason(''); setOpen(false); } });
  };
  const mark = (id: string, status: 'ATTENDED' | 'MISSED') => run(`mk-${id}`, 'Updating…', () => opc.setAppointmentStatus(id, status, staff), r => r.message, r => r.message ?? 'Failed');

  return (
    <Shell title="Follow-Up Appointments">
      <Section icon={<CalendarClock className="h-5 w-5" />} title="Follow-Up & Appointment Management" desc="Book, reschedule and track follow-up visits with missed-appointment monitoring."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Book Follow-Up</Button>} />
      <StatRow>
        <MiniStat label="All" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Scheduled" value={count('SCHEDULED')} tone="sky" active={tab === 'SCHEDULED'} onClick={() => setTab('SCHEDULED')} />
        <MiniStat label="Attended" value={count('ATTENDED')} tone="green" active={tab === 'ATTENDED'} onClick={() => setTab('ATTENDED')} />
        <MiniStat label="Missed" value={count('MISSED')} tone="red" active={tab === 'MISSED'} onClick={() => setTab('MISSED')} />
      </StatRow>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Doctor</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No appointments in this view.</TableCell></TableRow> : rows.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.patientName}</TableCell>
                <TableCell className="text-xs">{a.date.replace('T', ' ').slice(0, 16)}</TableCell>
                <TableCell className="text-sm">{a.doctor}</TableCell>
                <TableCell><Pill tone={a.status === 'ATTENDED' ? 'green' : a.status === 'MISSED' ? 'red' : 'sky'}>{a.status}</Pill></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isBusy(`mk-${a.id}`)} onClick={() => mark(a.id, 'ATTENDED')}>Attended</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isBusy(`mk-${a.id}`)} onClick={() => mark(a.id, 'MISSED')}>Missed</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="Book Follow-Up Appointment"
        footer={<LoadingButton loading={isBusy('appt')} loadingText="Booking…" onClick={book}><Plus className="h-4 w-4 mr-1.5" />Book Appointment</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div><Label className="text-xs">Date</Label><Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label className="text-xs">Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Depot review" /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   12 & 13. REFERRALS (Psychology / Social Welfare) — shared component
   ===================================================================== */
const ReferralPage = ({ target, categories, icon, title, desc }: { target: 'Psychology' | 'Social Welfare'; categories: string[]; icon: React.ReactNode; title: string; desc: string }) => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [tab, setTab] = useState<'all' | 'PENDING' | 'ACCEPTED' | 'COMPLETED'>('all');
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [reason, setReason] = useState('');

  const all = db.opcReferrals.list().filter(r => r.to === target).slice().reverse();
  const count = (s: string) => all.filter(r => r.status === s).length;
  const rows = all.filter(r => tab === 'all' || r.status === tab);

  const refer = () => {
    if (!pid || !reason) { notify.error('ref', 'Patient and reason are required'); return; }
    run('ref', `Referring to ${target}…`,
      async () => {
        if (isReferralsApiEnabled()) {
          const personId = await resolveApiPersonId(pid);
          await createClinicalReferral({
            personId,
            referralKind: 'Internal',
            careSetting: 'Outpatient',
            priority: 'Routine',
            fromDepartment: 'Psychiatric OPC',
            toDepartment: target === 'Psychology' ? 'Psychology' : 'Social Work',
            reason,
            clinicalSummary: category,
            specificQuestion: `Please review for ${category}`,
          });
          return { ok: true as const, message: `Referral sent to ${target} inbox.` };
        }
        opc.createReferral({ patientId: pid, to: target, category, reason, by: staff });
        return { ok: true as const, message: `Referral to ${target} created.` };
      },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setReason(''); setOpen(false); } });
  };
  const setStatus = (id: string, status: 'ACCEPTED' | 'COMPLETED') => run(`rs-${id}`, 'Updating…', () => opc.setReferralStatus(id, status, staff), r => r.message, r => r.message ?? 'Failed');

  return (
    <Shell title={title}>
      <Section icon={icon} title={title} desc={desc}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Referral</Button>} />
      <StatRow>
        <MiniStat label="All" value={all.length} tone="blue" active={tab === 'all'} onClick={() => setTab('all')} />
        <MiniStat label="Pending" value={count('PENDING')} tone="amber" active={tab === 'PENDING'} onClick={() => setTab('PENDING')} />
        <MiniStat label="Accepted" value={count('ACCEPTED')} tone="sky" active={tab === 'ACCEPTED'} onClick={() => setTab('ACCEPTED')} />
        <MiniStat label="Completed" value={count('COMPLETED')} tone="green" active={tab === 'COMPLETED'} onClick={() => setTab('COMPLETED')} />
      </StatRow>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Next Step</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No referrals in this view.</TableCell></TableRow> : rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.patientName}<div className="text-xs text-muted-foreground">{r.reason}</div></TableCell>
                <TableCell className="text-sm">{r.category}</TableCell>
                <TableCell><Pill tone={r.status === 'COMPLETED' ? 'green' : r.status === 'ACCEPTED' ? 'blue' : 'amber'}>{r.status}</Pill></TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isBusy(`rs-${r.id}`) || r.status !== 'PENDING'} onClick={() => setStatus(r.id, 'ACCEPTED')}>Accept</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isBusy(`rs-${r.id}`) || r.status === 'COMPLETED'} onClick={() => setStatus(r.id, 'COMPLETED')}>Complete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title={`New ${target} Referral`}
        footer={<LoadingButton loading={isBusy('ref')} loadingText="Referring…" onClick={refer}><Send className="h-4 w-4 mr-1.5" />Create Referral</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div><Label className="text-xs">Type</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div><Label className="text-xs">Reason</Label><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} /></div>
      </NewDialog>
    </Shell>
  );
};

export const PsychOpcPsychology = () => (
  <ReferralPage target="Psychology" icon={<HeartHandshake className="h-5 w-5" />} title="Psychology Referrals"
    desc="Refer for psychotherapy, CBT, behaviour therapy, family therapy and psychological testing."
    categories={['CBT', 'Behaviour Therapy', 'Anger Management', 'Family Therapy', 'Couple Therapy', 'Psychological Testing', 'IQ/Personality Assessment']} />
);
export const PsychOpcWelfare = () => (
  <ReferralPage target="Social Welfare" icon={<LifeBuoy className="h-5 w-5" />} title="Social Welfare Referrals"
    desc="Refer for social support, family tracing, financial assistance, abuse/neglect concerns and rehabilitation."
    categories={['Family Tracing', 'Financial Support', 'Abuse/Neglect Concern', 'Rehabilitation', 'Community Follow-up', 'Case Support']} />
);

/* =====================================================================
   14. EMERGENCY PSYCHIATRIC CASES
   ===================================================================== */
export const PsychOpcEmergency = () => {
  useDbTick();
  const staff = useStaffName();
  const { run, isBusy } = useAsyncAction();
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState('');
  const [reason, setReason] = useState('');

  const all = db.opcVisits.list().filter(v => v.priority === 'Emergency' || v.priority === 'Crisis').slice().reverse();
  const activeN = all.filter(v => v.status !== 'COMPLETED').length;
  const intake = () => {
    if (!pid) { notify.error('emg', 'Select a patient'); return; }
    run('emg', 'Raising emergency intake…',
      () => { const v = opc.checkInVisit({ patientId: pid, visitType: 'Emergency', payer: 'Cash', priority: 'Emergency', reason, by: staff }); opc.setVisitStatus(v.id, 'WITH_DOCTOR', staff); return { ok: true as const, message: `Emergency intake created for ${v.patientName} — doctor & nurse notified.` }; },
      r => r.message, () => 'Failed',
    ).then(r => { if (r?.ok) { setPid(''); setReason(''); setOpen(false); } });
  };

  return (
    <Shell title="Emergency Cases">
      <Section icon={<Siren className="h-5 w-5" />} title="Emergency Psychiatric Workflow" desc="Rapid intake and crisis tagging for urgent psychiatric presentations — bypasses the normal queue."
        action={<Button variant="destructive" onClick={() => setOpen(true)}><Siren className="h-4 w-4 mr-1.5" />Raise Emergency</Button>} />
      <StatRow>
        <MiniStat label="Active Emergencies" value={activeN} tone="red" />
        <MiniStat label="Total Emergency/Crisis" value={all.length} tone="amber" />
        <MiniStat label="High-Risk Alerts" value={db.opcRiskAssessments.list().filter(r => r.crisisAlert).length} tone="red" />
        <MiniStat label="Resolved" value={all.filter(v => v.status === 'COMPLETED').length} tone="green" />
      </StatRow>
      <Card>
        <h3 className="font-semibold mb-3">Emergency / Crisis Cases</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
          <TableBody>
            {all.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No active emergencies.</TableCell></TableRow> : all.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.patientName}<div className="text-xs text-muted-foreground">{v.hospitalId}</div></TableCell>
                <TableCell><Pill tone="red">{v.priority}</Pill></TableCell>
                <TableCell><Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill></TableCell>
                <TableCell className="text-xs">{v.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <NewDialog open={open} onOpenChange={setOpen} title="Raise Emergency Intake" desc="Creates a crisis-priority visit and routes straight to the doctor."
        footer={<LoadingButton variant="destructive" loading={isBusy('emg')} loadingText="Raising…" onClick={intake}><Siren className="h-4 w-4 mr-1.5" />Raise Emergency</LoadingButton>}>
        <div><Label className="text-xs">Patient</Label><PatientPicker value={pid} onChange={setPid} /></div>
        <div><Label className="text-xs">Presentation</Label><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Acute agitation, suicidal crisis…" /></div>
      </NewDialog>
    </Shell>
  );
};

/* =====================================================================
   15. REPORTS & ANALYTICS
   ===================================================================== */
export const PsychOpcReports = () => {
  useDbTick();
  const { user } = useAuth();
  const visits = db.opcVisits.list();
  const dx = db.psychDiagnoses.list();
  const appts = db.opcAppointments.list();
  const orders = db.orders.list();
  const dxByCat = DX_CATEGORIES.map(c => ({ c, n: dx.filter(d => d.category === c).length })).filter(x => x.n > 0);
  const cards = [
    { t: 'Total OPC Attendance', v: visits.length },
    { t: 'New Psychiatric Cases', v: visits.filter(v => v.visitType === 'New').length },
    { t: 'Follow-up Cases', v: visits.filter(v => v.visitType === 'Follow-up').length },
    { t: 'Emergency Cases', v: visits.filter(v => v.priority === 'Emergency' || v.priority === 'Crisis').length },
    { t: 'Admissions from OPC', v: db.opcAdmissionRequests.list().length },
    { t: 'Missed Appointments', v: appts.filter(a => a.status === 'MISSED').length },
    { t: 'Lab Requests', v: orders.filter(o => o.kind === 'lab').length },
    { t: 'Prescriptions', v: orders.filter(o => o.kind === 'drug').length },
  ];
  const exportCsv = () => {
    if (!canExportOpcCsv(user?.role)) {
      notify.error('csv', 'You do not have permission to export OPC CSV.');
      return;
    }
    const rows = [['Patient', 'HospitalID', 'Type', 'Priority', 'Status', 'CheckIn'], ...visits.map(v => [v.patientName, v.hospitalId, v.visitType, v.priority, v.status, v.checkInAt])];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'psych-opc-attendance.csv'; a.click(); URL.revokeObjectURL(url);
    notify.success('csv', 'Attendance exported to CSV.');
  };
  return (
    <Shell title="Reports & Analytics">
      <Section icon={<BarChart3 className="h-5 w-5" />} title="Reports & Analytics" desc="Attendance, diagnosis distribution, emergencies, admissions and requests — with CSV export for research/statistics."
        action={<Button variant="outline" onClick={exportCsv} disabled={!canExportOpcCsv(user?.role)}><ScrollText className="h-4 w-4 mr-1.5" />Export CSV</Button>} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(c => <SummaryCard key={c.t} title={c.t} value={String(c.v)} icon={BarChart3} />)}
      </div>
      <Card>
        <h3 className="font-semibold mb-3">Diagnosis Distribution</h3>
        {dxByCat.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No diagnoses recorded yet.</div> : (
          <div className="space-y-2">
            {dxByCat.map(x => (
              <div key={x.c} className="flex items-center gap-3">
                <div className="w-56 text-sm">{x.c}</div>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden"><div className="bg-primary h-full" style={{ width: `${Math.min(100, x.n / dx.length * 100)}%` }} /></div>
                <div className="w-8 text-right text-sm font-semibold">{x.n}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
};

/* =====================================================================
   16. SETTINGS & TEMPLATES
   ===================================================================== */
export const PsychOpcSettings = () => {
  useDbTick();
  return (
    <Shell title="Settings & Templates">
      <Section icon={<Settings2 className="h-5 w-5" />} title="Settings & Templates" desc="Clinic configuration, note templates and role-based access for the Psychiatric OPC module." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold mb-3">Assessment Forms</h3>
          <div className="space-y-1 text-sm">
            {ASSESSMENT_TYPES.map(t => <div key={t} className="flex items-center justify-between p-2 border rounded-lg"><span>{t}</span><Pill tone="green">Enabled</Pill></div>)}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-3">Access & Privacy</h3>
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Role-based access (superadmin, admin, cmd, doctor, psychopc)</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Confidential case flag on clinical notes</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Full audit trail — every view/edit is logged</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No hard deletes — records are status-tracked</li>
          </ul>
          <div className="mt-4 p-3 border rounded-lg bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
            <ArrowRight className="h-4 w-4" /> Templates are shared with Records, Nursing, Pharmacy, Laboratory, Radiology, Psychology, Social Welfare and Billing.
          </div>
        </Card>
      </div>
    </Shell>
  );
};
