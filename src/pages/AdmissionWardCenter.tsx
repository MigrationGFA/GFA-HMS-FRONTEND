// PHASE 10 — Admission, Ward, Bed, Movement, Accommodation, Discharge, Trial Leave,
// DAMA, Referral, Care Team, Ward Round, Analytics, Reporting, Mobile.
// Frontend-only enterprise prototype for GFA HMS. Role-aware via `?role=` querystring
// so the shared sidebar matches doctor / nurse / records / finance / superadmin.

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { useDbTick } from '@/contexts/DatabaseProvider';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  createWard,
  isAdmissionsApiEnabled,
  listWards,
  type WardRecord,
} from '@/lib/api/admissions';
import { isTransfersApiEnabled } from '@/lib/api/transfers';
import {
  LayoutDashboard, BedDouble, Users, ArrowRightLeft, ClipboardCheck, ClipboardList,
  Plane, AlertTriangle, Send, UsersRound, Stethoscope, BarChart3, ScrollText,
  Smartphone, MessageSquare, Settings2, Wallet, Building2, MapPin, ShieldAlert,
  Calendar, CheckCircle2, Eye, Plus, Search, Save, Printer, Phone, Heart,
  Activity, FileText, Clock, ChevronRight, Hospital, Baby, Brain,
} from 'lucide-react';

const base = '/dashboard/admission';

// ---------- Role-aware nav ----------
const fullNav = [
  { label: 'Admission Command Center', path: `${base}`, icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Admission Wizard', path: `${base}/wizard`, icon: <Plus className="h-4 w-4" /> },
  { label: 'Ward Management', path: `${base}/wards`, icon: <Building2 className="h-4 w-4" /> },
  { label: 'Bed Management', path: `${base}/beds`, icon: <BedDouble className="h-4 w-4" /> },
  { label: 'Patient Movement', path: `${base}/movement`, icon: <Activity className="h-4 w-4" /> },
  { label: 'GMPC ↔ OPC Transfer', path: `${base}/transfer`, icon: <ArrowRightLeft className="h-4 w-4" /> },
  { label: 'Accommodation', path: `${base}/accommodation`, icon: <Wallet className="h-4 w-4" /> },
  { label: 'Discharge Workspace', path: `${base}/discharge`, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Trial Leave', path: `${base}/trial-leave`, icon: <Plane className="h-4 w-4" /> },
  { label: 'DAMA', path: `${base}/dama`, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Referrals', path: `${base}/referrals`, icon: <Send className="h-4 w-4" /> },
  { label: 'Care Team', path: `${base}/care-team`, icon: <UsersRound className="h-4 w-4" /> },
  { label: 'Ward Round', path: `${base}/ward-round`, icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Reporting Center', path: `${base}/reports`, icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Analytics', path: `${base}/analytics`, icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Communications', path: `${base}/comms`, icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Bedside (Mobile/PWA)', path: `${base}/mobile`, icon: <Smartphone className="h-4 w-4" /> },
  { label: 'Ward & Bed Config', path: `${base}/config`, icon: <Settings2 className="h-4 w-4" /> },
];

export const admissionNav = fullNav;

const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={fullNav} title={`Admission · ${title}`}>{children}</DashboardLayout>
);

// ---------- Atoms ----------
const tone = (t: string) => ({
  green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  red: 'bg-rose-100 text-rose-700 border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}[t] || 'bg-muted text-foreground border-border');

const Pill = ({ tone: t = 'blue', children }: { tone?: string; children: React.ReactNode }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full border ${tone(t)}`}>{children}</span>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-5 ${className}`}>{children}</div>
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

// ---------- Mock data (Nigerian, GFA HMS) ----------
const admissions = [
  { id: 'ADM-2026-0481', p: 'Tope Adeyemi (M, 34)', ward: 'Male Psych 3B', bed: '12', adm: '14 Apr 2026', days: 49, dx: 'Schizophrenia — acute relapse', team: 'Dr. Akinwale', wallet: 18500, acc: 245000, paid: 180000, type: 'Psychiatric', t: 'purple' },
  { id: 'ADM-2026-0492', p: 'Yusuf Kabiru (M, 28)', ward: 'Male Psych 2A', bed: '04', adm: '20 May 2026', days: 13, dx: 'Bipolar I — manic', team: 'Dr. Eze', wallet: 42000, acc: 65000, paid: 65000, type: 'Psychiatric', t: 'purple' },
  { id: 'ADM-2026-0501', p: 'Ngozi Ibekwe (F, 41)', ward: 'ICU', bed: '02', adm: '28 May 2026', days: 5, dx: 'Catatonia — ICU obs', team: 'Dr. Okafor', wallet: 0, acc: 375000, paid: 200000, type: 'ICU', t: 'red' },
  { id: 'ADM-2026-0508', p: 'Bisi Olamide (F, 22)', ward: 'Female Psych 1C', bed: '07', adm: '10 May 2026', days: 23, dx: 'MDD with SI', team: 'Dr. Adebayo', wallet: 75000, acc: 115000, paid: 115000, type: 'Psychiatric', t: 'purple' },
  { id: 'ADM-2026-0515', p: 'Femi Okoro (M, 19)', ward: 'C&A Ward', bed: '03', adm: '25 May 2026', days: 8, dx: 'Adolescent psychosis', team: 'Dr. Ojo', wallet: 9000, acc: 40000, paid: 25000, type: 'Child', t: 'sky' },
  { id: 'ADM-2026-0517', p: 'Mama Aisha (F, 72)', ward: 'Psychogeriatric', bed: '09', adm: '02 May 2026', days: 31, dx: 'Dementia — wandering', team: 'Dr. Salami', wallet: 0, acc: 155000, paid: 100000, type: 'Psychogeriatric', t: 'amber' },
  { id: 'ADM-2026-0520', p: 'Chinedu Obi (M, 47)', ward: 'Rehab Ward', bed: '15', adm: '01 Jun 2026', days: 1, dx: 'Alcohol detox', team: 'Dr. Hassan', wallet: 12000, acc: 8000, paid: 8000, type: 'Addiction', t: 'orange' },
  { id: 'ADM-2026-0521', p: 'Halima Abdullahi (F, 38)', ward: 'GMPC Medical', bed: 'B-01', adm: '24 May 2026', days: 9, dx: 'Severe malaria + anaemia', team: 'Dr. Ikedife', wallet: 5000, acc: 72000, paid: 60000, type: 'General', t: 'blue' },
];

const wards = [
  { name: 'Male Psych Ward 2A', cap: 18, occ: 16, avail: 2, type: 'Acute Psych', icon: <Brain className="h-4 w-4" />, head: 'NO Adaeze' },
  { name: 'Male Psych Ward 3B', cap: 20, occ: 18, avail: 2, type: 'Acute Psych', icon: <Brain className="h-4 w-4" />, head: 'NO Ibrahim' },
  { name: 'Female Psych Ward 1C', cap: 20, occ: 14, avail: 6, type: 'Acute Psych', icon: <Brain className="h-4 w-4" />, head: 'NO Funmi' },
  { name: 'Child & Adolescent', cap: 12, occ: 9, avail: 3, type: 'Child Psych', icon: <Baby className="h-4 w-4" />, head: 'NO Blessing' },
  { name: 'Psychogeriatric Ward', cap: 14, occ: 11, avail: 3, type: 'Geriatric', icon: <Heart className="h-4 w-4" />, head: 'NO Tola' },
  { name: 'Addiction Rehab', cap: 16, occ: 13, avail: 3, type: 'Rehab', icon: <Activity className="h-4 w-4" />, head: 'NO Musa' },
  { name: 'ICU', cap: 6, occ: 5, avail: 1, type: 'Critical', icon: <ShieldAlert className="h-4 w-4" />, head: 'NO Grace' },
  { name: 'Observation Unit', cap: 10, occ: 6, avail: 4, type: 'Observation', icon: <Eye className="h-4 w-4" />, head: 'NO Patience' },
  { name: 'GMPC Medical', cap: 24, occ: 17, avail: 7, type: 'General', icon: <Hospital className="h-4 w-4" />, head: 'NO Sade' },
];

const movements = [
  { ts: '08:42', p: 'Tope Adeyemi', from: 'GMPC Medical · B-04', to: 'Male Psych 3B · 12', reason: 'Acute psychosis confirmed', by: 'Dr. Ikedife', kind: 'Transfer' },
  { ts: '09:15', p: 'Halima Abdullahi', from: 'A&E', to: 'GMPC Medical · B-01', reason: 'New admission', by: 'Dr. Adewale', kind: 'Admit' },
  { ts: '10:02', p: 'Bisi Olamide', from: 'Female Psych 1C · 07', to: 'Trial Leave (7d)', reason: 'Family reintegration', by: 'Dr. Adebayo', kind: 'Trial Leave' },
  { ts: '11:20', p: 'Mama Aisha', from: 'Psychogeriatric · 09', to: 'Psychogeriatric · 09', reason: 'Bed swap (closer to monitor)', by: 'NO Tola', kind: 'Bed Swap' },
  { ts: '12:30', p: 'Femi Okoro', from: 'C&A Ward · 03', to: 'External — LUTH Paeds', reason: 'Specialist referral', by: 'Dr. Ojo', kind: 'Referral' },
  { ts: '13:55', p: 'Chinedu Obi', from: 'A&E', to: 'Rehab Ward · 15', reason: 'Detox admit', by: 'Dr. Hassan', kind: 'Admit' },
];

// ============= 1. ADMISSION COMMAND CENTER =============
export const AdmissionDashboard = () => {
  const totalCap = wards.reduce((s, w) => s + w.cap, 0);
  const totalOcc = wards.reduce((s, w) => s + w.occ, 0);
  const occRate = Math.round((totalOcc / totalCap) * 100);
  return (
    <Shell title="Command Center">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <SummaryCard title="Current Admissions" value={String(totalOcc)} subtitle={`Across ${wards.length} wards`} icon={Users} />
        <SummaryCard title="New Today" value="6" subtitle="2 psych · 1 ICU · 3 general" icon={Plus} />
        <SummaryCard title="Pending Admissions" value="4" subtitle="Awaiting bed allocation" icon={Clock} />
        <SummaryCard title="Bed Occupancy" value={`${occRate}%`} subtitle={`${totalOcc}/${totalCap} beds`} icon={BedDouble} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Transfers" value="9" subtitle="5 internal · 4 external" icon={ArrowRightLeft} />
        <SummaryCard title="Trial Leave" value="7" subtitle="2 return today" icon={Plane} />
        <SummaryCard title="DAMA" value="1" subtitle="Awaiting clearance" icon={AlertTriangle} />
        <SummaryCard title="Referrals (open)" value="3" subtitle="1 LUTH · 1 FMC · 1 OAUTHC" icon={Send} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="lg:col-span-2">
          <Section icon={<LayoutDashboard className="h-5 w-5" />} title="Active Admissions" desc="Live snapshot — click a row to open the patient workspace." />
          <Table>
            <TableHeader><TableRow>
              <TableHead>Patient</TableHead><TableHead>Ward / Bed</TableHead><TableHead>Days</TableHead>
              <TableHead>Type</TableHead><TableHead>Outstanding</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {admissions.slice(0, 6).map(a => {
                const outstanding = Math.max(a.acc - a.paid - a.wallet, 0);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.p}<div className="text-xs text-muted-foreground">{a.id}</div></TableCell>
                    <TableCell>{a.ward}<div className="text-xs text-muted-foreground">Bed {a.bed}</div></TableCell>
                    <TableCell>{a.days}d</TableCell>
                    <TableCell><Pill tone={a.t}>{a.type}</Pill></TableCell>
                    <TableCell className={outstanding > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>₦{outstanding.toLocaleString()}</TableCell>
                    <TableCell><Link to={`${base}/movement`} className="text-primary text-xs hover:underline">Timeline →</Link></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
        <Card>
          <Section icon={<Plus className="h-5 w-5" />} title="Quick Actions" desc="One-tap entry to common admission tasks." />
          <div className="space-y-2">
            {[
              { l: 'Admit Patient', p: `${base}/wizard`, i: <Plus className="h-4 w-4" /> },
              { l: 'Allocate Bed', p: `${base}/beds`, i: <BedDouble className="h-4 w-4" /> },
              { l: 'Transfer Patient', p: `${base}/transfer`, i: <ArrowRightLeft className="h-4 w-4" /> },
              { l: 'Prepare Discharge', p: `${base}/discharge`, i: <ClipboardCheck className="h-4 w-4" /> },
              { l: 'Refer Patient', p: `${base}/referrals`, i: <Send className="h-4 w-4" /> },
              { l: 'Trial Leave', p: `${base}/trial-leave`, i: <Plane className="h-4 w-4" /> },
              { l: 'DAMA Request', p: `${base}/dama`, i: <AlertTriangle className="h-4 w-4" /> },
            ].map(q => (
              <Link key={q.l} to={q.p} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/50">
                <span className="flex items-center gap-2 text-sm">{q.i}{q.l}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <Section icon={<Activity className="h-5 w-5" />} title="Today's Patient Movement" desc="Real-time movement events across all wards & departments." />
        <div className="space-y-2">
          {movements.map((m, i) => (
            <div key={i} className="flex items-center gap-3 border rounded-lg p-3 text-sm">
              <span className="text-xs font-mono text-muted-foreground w-12">{m.ts}</span>
              <Pill tone={m.kind === 'Admit' ? 'green' : m.kind === 'Referral' ? 'sky' : m.kind === 'Trial Leave' ? 'purple' : 'amber'}>{m.kind}</Pill>
              <span className="font-medium">{m.p}</span>
              <span className="text-muted-foreground">{m.from} → <span className="text-foreground">{m.to}</span></span>
              <span className="ml-auto text-xs text-muted-foreground">{m.reason} · {m.by}</span>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
};

// ============= 2. ADMISSION WIZARD =============
export const AdmissionWizard = () => {
  const [step, setStep] = useState(1);
  const steps = ['Patient', 'Type', 'Reason', 'Clinic', 'Ward', 'Bed', 'Consultant', 'Care Team', 'Review'];
  return (
    <Shell title="Admission Wizard">
      <Card>
        <Section icon={<Plus className="h-5 w-5" />} title={`Step ${step} of ${steps.length} — ${steps[step - 1]}`} desc="Guided admission workflow. All steps validate before confirmation." />
        <div className="flex flex-wrap items-center gap-1 mb-6">
          {steps.map((s, i) => (
            <div key={s} className={`text-xs px-2 py-1 rounded-full border ${i + 1 === step ? 'bg-primary text-primary-foreground border-primary' : i + 1 < step ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>{i + 1}. {s}</div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {step === 1 && (<>
            <div><Label>MPI Search</Label><div className="flex gap-2"><Input placeholder="MPI / NIN / phone / name" /><Button variant="outline"><Search className="h-4 w-4" /></Button></div></div>
            <div><Label>Selected Patient</Label><Input defaultValue="Tope Adeyemi · MPI GFA/2026/004812 · M, 34" /></div>
          </>)}
          {step === 2 && (<>
            <div><Label>Admission Type</Label>
              <Select defaultValue="psych"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Medical</SelectItem>
                  <SelectItem value="psych">Psychiatric (Acute)</SelectItem>
                  <SelectItem value="emerg">Emergency</SelectItem>
                  <SelectItem value="icu">ICU</SelectItem>
                  <SelectItem value="obs">Observation</SelectItem>
                  <SelectItem value="child">Child & Adolescent</SelectItem>
                  <SelectItem value="addict">Addiction / Rehab</SelectItem>
                  <SelectItem value="geri">Psychogeriatric</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Section</Label>
              <Select defaultValue="vol"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vol">Voluntary</SelectItem>
                  <SelectItem value="invol">Involuntary (MHA)</SelectItem>
                  <SelectItem value="court">Court Order</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>)}
          {step === 3 && (
            <div className="md:col-span-2"><Label>Admission Reason</Label>
              <Textarea rows={4} defaultValue="Acute psychotic relapse — auditory hallucinations, agitation, non-compliance with depot. Risk to self & others." />
            </div>
          )}
          {step === 4 && (
            <div><Label>Originating Clinic</Label>
              <Select defaultValue="opc"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmpc">GMPC</SelectItem>
                  <SelectItem value="opc">OPC / Psychiatry</SelectItem>
                  <SelectItem value="ae">A&E</SelectItem>
                  <SelectItem value="child">Child & Adolescent</SelectItem>
                  <SelectItem value="addict">Addiction Clinic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {step === 5 && (<>
            <div><Label>Ward</Label>
              <Select defaultValue="m3b"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{wards.map(w => <SelectItem key={w.name} value={w.name}>{w.name} · {w.avail} free</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Overflow Approval</Label><Input placeholder="Auto — primary ward available" /></div>
          </>)}
          {step === 6 && (
            <div className="md:col-span-2">
              <Label>Bed Selection</Label>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 mt-2">
                {Array.from({ length: 20 }).map((_, i) => {
                  const occupied = [0, 1, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 16, 18].includes(i);
                  const selected = i === 12;
                  return (
                    <button key={i} className={`h-12 rounded-lg border text-xs font-mono ${selected ? 'bg-primary text-primary-foreground border-primary' : occupied ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>B{(i + 1).toString().padStart(2, '0')}</button>
                  );
                })}
              </div>
              <div className="flex gap-3 text-xs mt-3 text-muted-foreground"><Pill tone="green">Available</Pill><Pill tone="red">Occupied</Pill><Pill tone="blue">Selected</Pill></div>
            </div>
          )}
          {step === 7 && (
            <div><Label>Consultant Psychiatrist</Label>
              <Select defaultValue="ak"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ak">Dr. Akinwale Ogundipe</SelectItem>
                  <SelectItem value="ez">Dr. Chika Eze</SelectItem>
                  <SelectItem value="ok">Dr. Funmi Okafor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {step === 8 && (
            <div className="md:col-span-2">
              <Label>Care Team</Label>
              <div className="grid sm:grid-cols-2 gap-2 mt-1 text-sm">
                {['Resident · Dr. Bola Adekunle', 'Charge Nurse · NO Adaeze Igwe', 'Psychologist · Mr. Tunde Bakare', 'Social Worker · Ms. Aisha Mohammed', 'OT · Mrs. Yewande Ojo', 'Physio · Mr. Sola Adebanjo'].map(m => (
                  <div key={m} className="border rounded-lg p-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{m}</div>
                ))}
              </div>
            </div>
          )}
          {step === 9 && (
            <div className="md:col-span-2 border rounded-lg p-4 bg-muted/30 text-sm space-y-1">
              <div><b>Patient:</b> Tope Adeyemi · MPI GFA/2026/004812</div>
              <div><b>Type:</b> Psychiatric (Acute) — Voluntary</div>
              <div><b>Ward / Bed:</b> Male Psych 3B · B-13</div>
              <div><b>Consultant:</b> Dr. Akinwale Ogundipe</div>
              <div><b>Care Team:</b> 6 members assigned</div>
              <div className="text-amber-700"><b>Note:</b> Wallet ₦18,500 — initial accommodation deposit (₦25,000/day × 3d = ₦75,000) requires payment before confirmation.</div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>
          {step < steps.length
            ? <Button onClick={() => setStep(step + 1)}>Continue</Button>
            : <Button onClick={() => toast.success('Admission confirmed — bed allocated, EMR + Billing synced')}><CheckCircle2 className="h-4 w-4 mr-1" /> Confirm Admission</Button>}
        </div>
      </Card>
    </Shell>
  );
};

// ============= 3. WARD MANAGEMENT CENTER =============
export const WardManagement = () => (
  <Shell title="Ward Management Center">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Total Wards" value={String(wards.length)} icon={Building2} />
      <SummaryCard title="Total Capacity" value={String(wards.reduce((s, w) => s + w.cap, 0))} icon={BedDouble} />
      <SummaryCard title="Occupied" value={String(wards.reduce((s, w) => s + w.occ, 0))} icon={Users} />
      <SummaryCard title="Available" value={String(wards.reduce((s, w) => s + w.avail, 0))} icon={CheckCircle2} />
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {wards.map(w => {
        const pct = Math.round((w.occ / w.cap) * 100);
        return (
          <Card key={w.name}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{w.icon}</div>
                <div>
                  <div className="font-semibold text-sm">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.type} · {w.head}</div>
                </div>
              </div>
              <Pill tone={pct >= 90 ? 'red' : pct >= 70 ? 'amber' : 'green'}>{pct}%</Pill>
            </div>
            <Progress value={pct} className="h-2 mb-3" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="border rounded p-2"><div className="font-semibold text-rose-600">{w.occ}</div>Occupied</div>
              <div className="border rounded p-2"><div className="font-semibold text-emerald-600">{w.avail}</div>Free</div>
              <div className="border rounded p-2"><div className="font-semibold">{w.cap}</div>Total</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Link to={`${base}/beds`} className="flex-1"><Button size="sm" variant="outline" className="w-full">View Beds</Button></Link>
              <Link to={`${base}/ward-round`} className="flex-1"><Button size="sm" variant="outline" className="w-full">Ward Round</Button></Link>
            </div>
          </Card>
        );
      })}
    </div>
  </Shell>
);

// ============= 4. BED MANAGEMENT CENTER =============
export const BedManagement = () => {
  useDbTick();
  const statuses = ['Occupied', 'Available', 'Reserved', 'Cleaning', 'Maintenance', 'Isolation'] as const;
  const colorOf = (s: string) => s === 'Occupied' ? 'bg-rose-100 text-rose-700 border-rose-300'
    : s === 'Available' ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
    : s === 'Reserved' ? 'bg-blue-100 text-blue-700 border-blue-300'
    : s === 'Cleaning' ? 'bg-sky-100 text-sky-700 border-sky-300'
    : s === 'Isolation' ? 'bg-purple-100 text-purple-700 border-purple-300'
    : 'bg-slate-200 text-slate-700 border-slate-300';
  // Shared source of truth — same db.beds the Nursing module reads/writes.
  const statusLabel: Record<string, typeof statuses[number]> = {
    OCCUPIED: 'Occupied', AVAILABLE: 'Available', RESERVED: 'Reserved',
    CLEANING: 'Cleaning', OUT_OF_SERVICE: 'Maintenance', ISOLATION: 'Isolation',
  };
  const beds = db.beds.list().map(b => ({
    id: b.id, n: b.label, ward: b.wardName, s: statusLabel[b.status] ?? 'Available',
    patient: b.patientId ? db.patients.get(b.patientId)?.name : undefined,
  }));
  const occ = beds.filter(b => b.s === 'Occupied').length;
  return (
    <Shell title="Bed Management Center">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total Beds" value={String(beds.length)} icon={BedDouble} />
        <SummaryCard title="Occupied" value={String(occ)} icon={Users} />
        <SummaryCard title="Available" value={String(beds.filter(b => b.s === 'Available').length)} icon={CheckCircle2} />
        <SummaryCard title="Cleaning / Other" value={String(beds.filter(b => b.s !== 'Available' && b.s !== 'Occupied').length)} icon={Activity} />
      </div>
      <Tabs defaultValue="grid">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="grid">Bed Grid</TabsTrigger>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="list">Bed List</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">{statuses.map(s => <span key={s} className={`text-xs px-2 py-0.5 rounded border ${colorOf(s)}`}>{s}</span>)}</div>
        </div>
        <TabsContent value="grid">
          <Card>
            <Section icon={<BedDouble className="h-5 w-5" />} title="Live Bed Grid" desc="Shared with Nursing — reflects real-time transfers and discharges." />
            {beds.length === 0 ? <div className="text-sm text-muted-foreground py-8 text-center">No beds configured.</div> : (
            <div className="grid grid-cols-6 sm:grid-cols-10 lg:grid-cols-12 gap-2">
              {beds.map(b => (
                <button key={b.id} onClick={() => toast(`${b.n} · ${b.ward}`, { description: b.patient ? `${b.s} · ${b.patient}` : `Status: ${b.s}` })} className={`h-14 rounded-lg border text-[10px] font-mono flex flex-col items-center justify-center gap-0.5 ${colorOf(b.s)}`}>
                  <span className="font-semibold">{b.n}</span><span className="opacity-70">{b.s.slice(0, 4)}</span>
                </button>
              ))}
            </div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="floor">
          <Card>
            <Section icon={<MapPin className="h-5 w-5" />} title="Floor Plan View" desc="Schematic — Block A (Psychiatric), Block B (Medical/ICU)." />
            <div className="grid md:grid-cols-2 gap-4">
              {['Block A — Psychiatric (Ground)', 'Block B — Medical/ICU (1st Floor)'].map(b => (
                <div key={b} className="border-2 border-dashed rounded-xl p-4">
                  <div className="text-sm font-semibold mb-3">{b}</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`h-10 rounded border text-[10px] flex items-center justify-center ${colorOf(statuses[i % 6])}`}>{i + 1}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Bed</TableHead><TableHead>Ward</TableHead><TableHead>Status</TableHead><TableHead>Occupant</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {beds.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono">{b.n}</TableCell>
                    <TableCell>{b.ward}</TableCell>
                    <TableCell><span className={`text-xs px-2 py-0.5 rounded border ${colorOf(b.s)}`}>{b.s}</span></TableCell>
                    <TableCell className="text-xs">{b.patient ?? '—'}</TableCell>
                    <TableCell>
                      {b.s === 'Cleaning'
                        ? <Button size="sm" variant="outline" onClick={() => { db.beds.update(b.id, { status: 'AVAILABLE', updatedAt: new Date().toISOString() }); toast.success(`${b.n} marked available.`); }}>Mark Available</Button>
                        : b.s === 'Available'
                          ? <Button size="sm" variant="outline" onClick={() => { db.beds.update(b.id, { status: 'CLEANING', updatedAt: new Date().toISOString() }); toast.success(`${b.n} sent for cleaning.`); }}>Send to Cleaning</Button>
                          : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </Shell>
  );
};

// ============= 5. PATIENT MOVEMENT CENTER =============
export const PatientMovementCenter = () => (
  <Shell title="Patient Movement Center">
    <Card className="mb-5">
      <Section icon={<Activity className="h-5 w-5" />} title="Movement Timeline — Tope Adeyemi" desc="Registration → Admission → Bed → Transfers → Trial Leave → Discharge." />
      <div className="relative pl-6 space-y-4">
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
        {[
          { t: '12 Apr · 14:02', l: 'Registration', d: 'Walk-in via OPC. MPI created.', tone: 'sky' },
          { t: '14 Apr · 09:30', l: 'Admission', d: 'Psychiatric — Acute. Consultant: Dr. Akinwale.', tone: 'green' },
          { t: '14 Apr · 09:45', l: 'Bed Assigned', d: 'Male Psych 3B · B-12.', tone: 'blue' },
          { t: '02 May · 11:20', l: 'Internal Transfer', d: 'ICU → Male Psych 3B (de-escalated).', tone: 'amber' },
          { t: '18 May · 10:00', l: 'Trial Leave', d: '5 days with NOK (Mr. Adeyemi Sr.).', tone: 'purple' },
          { t: '23 May · 17:30', l: 'Returned', d: 'Stable, resumed inpatient care.', tone: 'green' },
          { t: '01 Jun · 09:00', l: 'Discharge Draft', d: 'Doctor prepared discharge summary (pending Accounts).', tone: 'orange' },
        ].map((e, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-4 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            <div className="flex items-center gap-2 mb-0.5"><Pill tone={e.tone}>{e.l}</Pill><span className="text-xs text-muted-foreground">{e.t}</span></div>
            <div className="text-sm">{e.d}</div>
          </div>
        ))}
      </div>
    </Card>
    <Card>
      <Section icon={<ScrollText className="h-5 w-5" />} title="All Movements Today" desc="Hospital-wide live log." />
      <Table>
        <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Type</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
        <TableBody>{movements.map((m, i) => (
          <TableRow key={i}><TableCell className="font-mono text-xs">{m.ts}</TableCell><TableCell>{m.p}</TableCell><TableCell className="text-xs">{m.from}</TableCell><TableCell className="text-xs">{m.to}</TableCell><TableCell><Pill tone="blue">{m.kind}</Pill></TableCell><TableCell className="text-xs">{m.by}</TableCell></TableRow>
        ))}</TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============= 6. GMPC ↔ OPC TRANSFER =============
export const TransferCenter = () => {
  if (isTransfersApiEnabled()) {
    return (
      <Shell title="Patient Transfer Center">
        <Card className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Live transfer workflow is available on Records and Nursing queues. Mock transfer forms are disabled while the API is on.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/records/transfers">Records · Patient Transfers</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/nurse/transfers">Nursing · Transfer Queue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/doctor/clinical/transfers">Doctor · Request Transfer</Link>
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  const transfers = [
    { id: 'TRF-201', p: 'Halima Abdullahi', from: 'GMPC Medical · B-01', to: 'OPC Acute · 2A-05', reason: 'Underlying psych co-morbidity', status: 'Approved', by: 'Dr. Ikedife', t: 'green' },
    { id: 'TRF-202', p: 'Yusuf Kabiru', from: 'OPC Acute · 2A-04', to: 'GMPC Medical · B-08', reason: 'Pneumonia — needs medical care', status: 'Awaiting Bed', by: 'Dr. Eze', t: 'amber' },
    { id: 'TRF-203', p: 'Ngozi Ibekwe', from: 'OPC Acute · 1C-12', to: 'ICU · 02', reason: 'Catatonic — deteriorating', status: 'Approved', by: 'Dr. Okafor', t: 'red' },
    { id: 'TRF-204', p: 'Bisi Olamide (recovering)', from: 'ICU · 04', to: 'Female Psych 1C', reason: 'Stable for step-down', status: 'In Progress', by: 'Dr. Adebayo', t: 'sky' },
    { id: 'TRF-205', p: 'Femi Okoro', from: 'C&A Ward', to: 'LUTH Paediatric (External)', reason: 'Specialist neuro eval', status: 'Pending Approval', by: 'Dr. Ojo', t: 'amber' },
  ];
  return (
    <Shell title="GMPC ↔ OPC Transfer Center">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <SummaryCard title="Today's Transfers" value={String(transfers.length)} icon={ArrowRightLeft} />
        <SummaryCard title="Approved" value="3" icon={CheckCircle2} />
        <SummaryCard title="Pending Approval" value="1" icon={Clock} />
        <SummaryCard title="External Referrals" value="1" icon={Send} />
      </div>
      <Card className="mb-5">
        <Section icon={<ArrowRightLeft className="h-5 w-5" />} title="New Transfer Request" desc="GMPC → OPC, OPC → GMPC, Ward → Ward, Ward → ICU, Ward → External."
          action={<Button onClick={() => toast.success('Transfer request submitted')}><Save className="h-4 w-4 mr-1" /> Submit</Button>} />
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Patient</Label><Input defaultValue="Yusuf Kabiru — MPI GFA/2026/004920" /></div>
          <div><Label>From</Label>
            <Select defaultValue="opc"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="gmpc">GMPC Medical</SelectItem><SelectItem value="opc">OPC Acute Psych</SelectItem><SelectItem value="icu">ICU</SelectItem><SelectItem value="child">C&A</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>To</Label>
            <Select defaultValue="gmpc"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="gmpc">GMPC Medical</SelectItem><SelectItem value="opc">OPC Acute Psych</SelectItem><SelectItem value="icu">ICU</SelectItem><SelectItem value="ext">External Facility</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3"><Label>Clinical Reason</Label><Textarea rows={2} defaultValue="Pneumonia with hypoxia. Requires medical care; psych stable on depot." /></div>
        </div>
      </Card>
      <Card>
        <Section icon={<ScrollText className="h-5 w-5" />} title="Transfer History" desc="All approvals, in-progress and pending movements." />
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>From → To</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{transfers.map(t => (
            <TableRow key={t.id}><TableCell className="font-mono text-xs">{t.id}</TableCell><TableCell>{t.p}</TableCell><TableCell className="text-xs">{t.from} → <b>{t.to}</b></TableCell><TableCell className="text-xs">{t.reason}</TableCell><TableCell className="text-xs">{t.by}</TableCell><TableCell><Pill tone={t.t}>{t.status}</Pill></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============= 7. ACCOMMODATION DASHBOARD =============
export const AccommodationCenter = () => {
  const totalOutstanding = admissions.reduce((s, a) => s + Math.max(a.acc - a.paid - a.wallet, 0), 0);
  return (
    <Shell title="Accommodation Management">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <SummaryCard title="Inpatients" value={String(admissions.length)} icon={Users} />
        <SummaryCard title="Avg Daily Charge" value="₦18,400" subtitle="Across all wards" icon={Wallet} />
        <SummaryCard title="Total Outstanding" value={`₦${totalOutstanding.toLocaleString()}`} subtitle="Accommodation balances" icon={AlertTriangle} />
        <SummaryCard title="Discharge-Blocked" value="2" subtitle="Awaiting payment" icon={ShieldAlert} />
      </div>
      <Card>
        <Section icon={<Wallet className="h-5 w-5" />} title="Patient Accommodation Ledger" desc="Visible to Doctors, Nurses, Accounts & Medical Records — resolves ARO complaint #1." />
        <Table>
          <TableHeader><TableRow>
            <TableHead>Patient</TableHead><TableHead>Ward / Bed</TableHead><TableHead>Admitted</TableHead>
            <TableHead>Days</TableHead><TableHead>Charges</TableHead><TableHead>Paid + Wallet</TableHead>
            <TableHead>Balance</TableHead><TableHead>Days Left</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {admissions.map(a => {
              const dailyRate = a.type === 'ICU' ? 75000 : a.type === 'Child' ? 5000 : a.type === 'Addiction' ? 8000 : 15000;
              const balance = Math.max(a.acc - a.paid - a.wallet, 0);
              const daysLeft = Math.max(Math.floor((a.wallet + a.paid - a.acc + dailyRate * 1) / dailyRate), 0);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.p}</TableCell>
                  <TableCell className="text-xs">{a.ward}<br /><span className="text-muted-foreground">Bed {a.bed}</span></TableCell>
                  <TableCell className="text-xs">{a.adm}</TableCell>
                  <TableCell>{a.days}d</TableCell>
                  <TableCell>₦{a.acc.toLocaleString()}<div className="text-xs text-muted-foreground">₦{dailyRate.toLocaleString()}/d</div></TableCell>
                  <TableCell>₦{(a.paid + a.wallet).toLocaleString()}<div className="text-xs text-muted-foreground">Wallet ₦{a.wallet.toLocaleString()}</div></TableCell>
                  <TableCell className={balance > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}>₦{balance.toLocaleString()}</TableCell>
                  <TableCell><Pill tone={daysLeft > 3 ? 'green' : daysLeft > 0 ? 'amber' : 'red'}>{daysLeft}d</Pill></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// Reusable financial widget (used by Doctor & Nurse workspaces — exported for reuse).
export const PatientFinancialWidget = ({ p = admissions[0] }: { p?: typeof admissions[number] }) => {
  const dailyRate = 15000;
  const balance = Math.max(p.acc - p.paid - p.wallet, 0);
  const daysLeft = Math.max(Math.floor((p.wallet + p.paid - p.acc) / dailyRate) + 1, 0);
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-primary" /> Financial & Accommodation</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border rounded p-2"><div className="text-muted-foreground">Admitted</div><div className="font-medium">{p.adm}</div></div>
        <div className="border rounded p-2"><div className="text-muted-foreground">Days</div><div className="font-medium">{p.days}d</div></div>
        <div className="border rounded p-2"><div className="text-muted-foreground">Charges</div><div className="font-medium">₦{p.acc.toLocaleString()}</div></div>
        <div className="border rounded p-2"><div className="text-muted-foreground">Wallet</div><div className="font-medium">₦{p.wallet.toLocaleString()}</div></div>
        <div className="border rounded p-2"><div className="text-muted-foreground">Outstanding</div><div className={`font-semibold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₦{balance.toLocaleString()}</div></div>
        <div className="border rounded p-2"><div className="text-muted-foreground">Est. Days Left</div><div className="font-semibold">{daysLeft}d</div></div>
      </div>
    </div>
  );
};

// ============= 8. DISCHARGE WORKSPACE =============
export const DischargeWorkspace = () => (
  <Shell title="Draft Discharge Workspace">
    <Card className="mb-5">
      <Section icon={<ClipboardCheck className="h-5 w-5" />} title="Draft Discharge Summary — Bisi Olamide" desc="Resolves ARO complaint #2: doctors can prepare & save drafts BEFORE Accounts clearance. Patient remains admitted until Accounts releases."
        action={<div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success('Draft saved')}><Save className="h-4 w-4 mr-1" /> Save Draft</Button>
          <Button onClick={() => toast.success('Submitted for clearance — Nursing → Accounts → Final')}><Send className="h-4 w-4 mr-1" /> Submit for Review</Button>
        </div>} />
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div><Label>Admission Diagnosis</Label><Input defaultValue="Major Depressive Disorder with Suicidal Ideation (F33.2)" /></div>
        <div><Label>Discharge Diagnosis</Label><Input defaultValue="MDD — in partial remission" /></div>
        <div><Label>Course of Treatment</Label><Textarea rows={3} defaultValue="Admitted 10 May with SI. Started on Sertraline 100mg + CBT. Suicidal ideation resolved by Day 14. Family meeting held 22 May." /></div>
        <div><Label>Discharge Medications</Label><Textarea rows={3} defaultValue="Sertraline 100mg OD x 3 months\nZopiclone 7.5mg ON x 14 days PRN" /></div>
        <div><Label>Follow-up Plan</Label><Input defaultValue="OPC follow-up in 2 weeks. Telephone check at 1 week." /></div>
        <div><Label>Outcome</Label>
          <Select defaultValue="improved"><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="recovered">Recovered</SelectItem><SelectItem value="improved">Improved</SelectItem><SelectItem value="referred">Referred</SelectItem><SelectItem value="dama">DAMA</SelectItem><SelectItem value="mort">Mortality</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
    </Card>

    <Card>
      <Section icon={<CheckCircle2 className="h-5 w-5" />} title="Clearance Pipeline" desc="Each stage must be cleared before the patient is released and bed is freed." />
      <div className="grid md:grid-cols-4 gap-3">
        {[
          { l: 'Medical Clearance', s: 'Cleared', by: 'Dr. Adebayo · 01 Jun 09:12', t: 'green' },
          { l: 'Nursing Clearance', s: 'Cleared', by: 'NO Funmi · 01 Jun 10:30', t: 'green' },
          { l: 'Finance Clearance', s: 'Blocked', by: 'Balance ₦65,000', t: 'red' },
          { l: 'Final Discharge', s: 'Awaiting', by: 'After Finance', t: 'slate' },
        ].map(s => (
          <div key={s.l} className="border rounded-lg p-3">
            <div className="text-xs text-muted-foreground">{s.l}</div>
            <div className="mt-1"><Pill tone={s.t}>{s.s}</Pill></div>
            <div className="text-xs mt-2">{s.by}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline"><Printer className="h-4 w-4 mr-1" /> Print Discharge Letter</Button>
        <Button variant="outline"><Printer className="h-4 w-4 mr-1" /> Print Prescription</Button>
        <Button variant="outline"><FileText className="h-4 w-4 mr-1" /> Print Follow-up Card</Button>
      </div>
    </Card>
  </Shell>
);

// ============= 9. TRIAL LEAVE =============
export const TrialLeaveModule = () => {
  const leaves = [
    { p: 'Bisi Olamide', start: '28 May', end: '02 Jun', rel: 'Mr. Olamide (Father)', phone: '0803 555 0142', status: 'Returned', t: 'green' },
    { p: 'Yusuf Kabiru', start: '30 May', end: '06 Jun', rel: 'Mrs. Kabiru (Mother)', phone: '0805 555 9982', status: 'On Leave', t: 'purple' },
    { p: 'Mama Aisha', start: '01 Jun', end: '08 Jun', rel: 'Mr. Adekunle (Son)', phone: '0809 555 4471', status: 'On Leave', t: 'purple' },
    { p: 'Adeola Smith', start: '31 May', end: '01 Jun', rel: 'Mrs. Smith (Wife)', phone: '0806 555 7128', status: 'Returning Today', t: 'amber' },
  ];
  return (
    <Shell title="Trial Leave Module">
      <Card className="mb-5">
        <Section icon={<Plane className="h-5 w-5" />} title="Request Trial Leave" desc="Psychiatric trial leave with responsible NOK and return date tracking."
          action={<Button onClick={() => toast.success('Trial leave request submitted to consultant')}><Save className="h-4 w-4 mr-1" /> Submit</Button>} />
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Patient</Label><Input defaultValue="Yusuf Kabiru" /></div>
          <div><Label>Start Date</Label><Input type="date" defaultValue="2026-05-30" /></div>
          <div><Label>Return Date</Label><Input type="date" defaultValue="2026-06-06" /></div>
          <div><Label>Responsible Relative</Label><Input defaultValue="Mrs. Aisha Kabiru (Mother)" /></div>
          <div><Label>Phone</Label><Input defaultValue="0805 555 9982" /></div>
          <div><Label>Address During Leave</Label><Input defaultValue="No 14, Owu St, Abeokuta" /></div>
          <div className="md:col-span-3"><Label>Clinical Notes</Label><Textarea rows={2} defaultValue="Stable on Olanzapine 10mg ON. Family reintegration. Crisis plan provided." /></div>
        </div>
      </Card>
      <Card>
        <Section icon={<ScrollText className="h-5 w-5" />} title="Active Trial Leave Register" desc="Track returns and overdue patients." />
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Start → Return</TableHead><TableHead>Responsible Relative</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{leaves.map(l => (
            <TableRow key={l.p}><TableCell className="font-medium">{l.p}</TableCell><TableCell>{l.start} → {l.end}</TableCell><TableCell>{l.rel}</TableCell><TableCell className="font-mono text-xs">{l.phone}</TableCell><TableCell><Pill tone={l.t}>{l.status}</Pill></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============= 10. DAMA =============
export const DamaModule = () => (
  <Shell title="DAMA — Discharge Against Medical Advice">
    <Card>
      <Section icon={<AlertTriangle className="h-5 w-5" />} title="DAMA Consent & Workflow" desc="Captures consent, relative ack, doctor approval, nursing sign-off and audit trail."
        action={<Button onClick={() => toast.success('DAMA recorded · all parties notified')}><Save className="h-4 w-4 mr-1" /> Record DAMA</Button>} />
      <div className="grid md:grid-cols-2 gap-3">
        <div><Label>Patient</Label><Input defaultValue="Chinedu Obi (MPI GFA/2026/005112)" /></div>
        <div><Label>Reason for DAMA</Label><Input defaultValue="Patient & family insist — financial constraints" /></div>
        <div><Label>Responsible Relative</Label><Input defaultValue="Mr. Obi (Brother)" /></div>
        <div><Label>Relative Phone / NIN</Label><Input defaultValue="0802 555 4471 / 12345678901" /></div>
        <div className="md:col-span-2"><Label>Doctor Counselling Notes</Label><Textarea rows={3} defaultValue="Risk of relapse explained in Igbo language. Patient & brother fully understand consequences of leaving against advice during detox." /></div>
      </div>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        {[
          { l: 'Patient Consent', s: 'Signed', t: 'green' },
          { l: 'Relative Ack', s: 'Signed', t: 'green' },
          { l: 'Doctor Approval', s: 'Dr. Hassan · Approved', t: 'green' },
          { l: 'Nursing Sign-off', s: 'NO Musa · Confirmed', t: 'green' },
          { l: 'Finance Note', s: 'Balance ₦12k flagged', t: 'amber' },
          { l: 'EMR + Audit', s: 'Logged', t: 'sky' },
        ].map(x => <div key={x.l} className="border rounded-lg p-3"><div className="text-xs text-muted-foreground">{x.l}</div><div className="mt-1"><Pill tone={x.t}>{x.s}</Pill></div></div>)}
      </div>
    </Card>
  </Shell>
);

// ============= 11. REFERRALS =============
export const ReferralCenter = () => {
  const refs = [
    { id: 'REF-301', p: 'Femi Okoro', kind: 'External', from: 'C&A Ward', to: 'LUTH Paediatric Neuro', reason: 'EEG + specialist eval', status: 'Awaiting Acceptance', t: 'amber' },
    { id: 'REF-302', p: 'Mama Aisha', kind: 'Internal', from: 'Psychogeriatric', to: 'Neurology Clinic', reason: 'Vascular dementia workup', status: 'Accepted', t: 'green' },
    { id: 'REF-303', p: 'Halima Abdullahi', kind: 'Internal', from: 'GMPC', to: 'OPC Psychiatry', reason: 'Comorbid anxiety', status: 'Accepted', t: 'green' },
    { id: 'REF-304', p: 'Chinedu Obi', kind: 'External', from: 'Rehab', to: 'FMC Abeokuta — Internal Med', reason: 'Liver workup', status: 'Pending', t: 'amber' },
  ];
  return (
    <Shell title="Referral Management">
      <Card className="mb-5">
        <Section icon={<Send className="h-5 w-5" />} title="New Referral" desc="Internal (department) or external (facility) referral."
          action={<Button onClick={() => toast.success('Referral letter generated & dispatched')}><Send className="h-4 w-4 mr-1" /> Send Referral</Button>} />
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Patient</Label><Input defaultValue="Femi Okoro" /></div>
          <div><Label>Type</Label>
            <Select defaultValue="ext"><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="int">Internal Department</SelectItem><SelectItem value="ext">External Facility</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Receiving Department / Facility</Label><Input defaultValue="LUTH Paediatric Neurology" /></div>
          <div className="md:col-span-3"><Label>Clinical Summary & Reason</Label><Textarea rows={3} defaultValue="14yo, first-episode psychosis with focal neuro signs. Requires EEG, MRI brain and paediatric neuro review." /></div>
        </div>
      </Card>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>From → To</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{refs.map(r => (
            <TableRow key={r.id}><TableCell className="font-mono text-xs">{r.id}</TableCell><TableCell>{r.p}</TableCell><TableCell><Pill tone={r.kind === 'Internal' ? 'blue' : 'purple'}>{r.kind}</Pill></TableCell><TableCell className="text-xs">{r.from} → <b>{r.to}</b></TableCell><TableCell className="text-xs">{r.reason}</TableCell><TableCell><Pill tone={r.t}>{r.status}</Pill></TableCell></TableRow>
          ))}</TableBody>
        </Table>
      </Card>
    </Shell>
  );
};

// ============= 12. CARE TEAM =============
export const CareTeamCenter = () => (
  <Shell title="Care Team Management">
    <Card>
      <Section icon={<UsersRound className="h-5 w-5" />} title="Tope Adeyemi — Assigned Care Team" desc="Multi-disciplinary team for inpatient psychiatric care." />
      <div className="grid md:grid-cols-2 gap-3">
        {[
          { r: 'Consultant Psychiatrist', n: 'Dr. Akinwale Ogundipe', ph: '0803 555 0011', t: 'purple' },
          { r: 'Resident Doctor', n: 'Dr. Bola Adekunle', ph: '0803 555 0022', t: 'blue' },
          { r: 'Charge Nurse', n: 'NO Adaeze Igwe', ph: '0803 555 0033', t: 'green' },
          { r: 'Psychologist', n: 'Mr. Tunde Bakare', ph: '0803 555 0044', t: 'sky' },
          { r: 'Social Worker', n: 'Ms. Aisha Mohammed', ph: '0803 555 0055', t: 'amber' },
          { r: 'Occupational Therapist', n: 'Mrs. Yewande Ojo', ph: '0803 555 0066', t: 'orange' },
          { r: 'Physiotherapist', n: 'Mr. Sola Adebanjo', ph: '0803 555 0077', t: 'blue' },
          { r: 'Pharmacist', n: 'Pharm. Halima Yusuf', ph: '0803 555 0088', t: 'green' },
        ].map(m => (
          <div key={m.r} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <Pill tone={m.t}>{m.r}</Pill>
              <div className="text-sm font-medium mt-1">{m.n}</div>
              <div className="text-xs text-muted-foreground font-mono">{m.ph}</div>
            </div>
            <Button size="sm" variant="outline"><Phone className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </Card>
  </Shell>
);

// ============= 13. WARD ROUND =============
export const WardRoundCenter = () => (
  <Shell title="Ward Round Dashboard">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Today's Patients" value="18" subtitle="Male Psych 3B" icon={Users} />
      <SummaryCard title="Seen" value="11" subtitle="61%" icon={CheckCircle2} />
      <SummaryCard title="Pending" value="7" subtitle="Awaiting consultant" icon={Clock} />
      <SummaryCard title="Round Lead" value="Dr. Akinwale" subtitle="09:00 – 12:00" icon={Stethoscope} />
    </div>
    <Card>
      <Section icon={<Stethoscope className="h-5 w-5" />} title="Round Board" desc="Tap patient to open consultation tab; capture doctor, nursing & observation notes." />
      <Table>
        <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Patient</TableHead><TableHead>Bed</TableHead><TableHead>Diagnosis</TableHead><TableHead>Doctor Notes</TableHead><TableHead>Nursing Notes</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{admissions.slice(0, 7).map((a, i) => (
          <TableRow key={a.id}>
            <TableCell className="font-mono">{i + 1}</TableCell>
            <TableCell className="font-medium">{a.p}</TableCell>
            <TableCell>{a.bed}</TableCell>
            <TableCell className="text-xs">{a.dx}</TableCell>
            <TableCell className="text-xs">{i < 4 ? '✓ Captured' : '—'}</TableCell>
            <TableCell className="text-xs">{i < 5 ? '✓ Stable shift' : '—'}</TableCell>
            <TableCell><Pill tone={i < 4 ? 'green' : 'amber'}>{i < 4 ? 'Seen' : 'Pending'}</Pill></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table>
    </Card>
  </Shell>
);

// ============= 14. REPORTING =============
export const ReportingCenter = () => (
  <Shell title="Reporting Center">
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { l: 'Admission Reports', d: 'Monthly admissions by ward/type', i: <BedDouble className="h-4 w-4" /> },
        { l: 'Discharge Reports', d: 'Outcomes, LOS, mortality', i: <ClipboardCheck className="h-4 w-4" /> },
        { l: 'Transfer Reports', d: 'Internal & external', i: <ArrowRightLeft className="h-4 w-4" /> },
        { l: 'Referral Reports', d: 'Internal / external referrals', i: <Send className="h-4 w-4" /> },
        { l: 'Trial Leave Reports', d: 'Compliance & returns', i: <Plane className="h-4 w-4" /> },
        { l: 'DAMA Reports', d: 'Reasons & trends', i: <AlertTriangle className="h-4 w-4" /> },
        { l: 'Ward Reports', d: 'Occupancy & census', i: <Building2 className="h-4 w-4" /> },
        { l: 'Bed Utilization', d: 'Turnover rate & idle beds', i: <BarChart3 className="h-4 w-4" /> },
      ].map(r => (
        <Card key={r.l}>
          <div className="flex items-center gap-2 mb-2"><div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{r.i}</div><div><div className="font-semibold text-sm">{r.l}</div><div className="text-xs text-muted-foreground">{r.d}</div></div></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success(`${r.l} generated`)}><FileText className="h-4 w-4 mr-1" /> PDF</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => toast.success(`${r.l} exported`)}>Excel</Button></div>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============= 15. ANALYTICS =============
export const AnalyticsCenter = () => (
  <Shell title="Admission Analytics">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <SummaryCard title="Occupancy Rate" value="82%" subtitle="Last 30 days" icon={BarChart3} />
      <SummaryCard title="Avg Length of Stay" value="18.4d" subtitle="Psych · 24d" icon={Clock} />
      <SummaryCard title="Transfer Rate" value="6.2%" subtitle="Of admissions" icon={ArrowRightLeft} />
      <SummaryCard title="Readmission (30d)" value="9.1%" subtitle="↓ 1.4% MoM" icon={Activity} />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <Section icon={<BarChart3 className="h-5 w-5" />} title="Bed Utilization by Ward" desc="Last 30 days." />
        <div className="space-y-2">{wards.map(w => {
          const pct = Math.round((w.occ / w.cap) * 100);
          return <div key={w.name}><div className="flex justify-between text-xs mb-1"><span>{w.name}</span><span className="font-mono">{pct}%</span></div><Progress value={pct} className="h-2" /></div>;
        })}</div>
      </Card>
      <Card>
        <Section icon={<BarChart3 className="h-5 w-5" />} title="Ward Performance" desc="Avg LOS · readmission · DAMA rate." />
        <Table><TableHeader><TableRow><TableHead>Ward</TableHead><TableHead>LOS</TableHead><TableHead>Readmit</TableHead><TableHead>DAMA</TableHead></TableRow></TableHeader>
          <TableBody>
            {[['Male Psych 3B', '24d', '11%', '3%'], ['Female Psych 1C', '21d', '8%', '2%'], ['ICU', '4d', '4%', '0%'], ['Rehab', '32d', '14%', '7%'], ['C&A', '18d', '6%', '1%'], ['Psychogeriatric', '36d', '5%', '1%']].map(r => (
              <TableRow key={r[0]}><TableCell>{r[0]}</TableCell><TableCell>{r[1]}</TableCell><TableCell>{r[2]}</TableCell><TableCell>{r[3]}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  </Shell>
);

// ============= 16. COMMUNICATIONS =============
export const CommsCenter = () => (
  <Shell title="Admission Communications">
    <div className="grid md:grid-cols-3 gap-4">
      {[
        { l: 'Ward 3B Group', last: 'NO Adaeze: Bed 12 settled, vitals stable.', n: 3 },
        { l: 'Admission Team', last: 'Records: 6 new admits processed today.', n: 1 },
        { l: 'Discharge Coordination', last: 'Accounts: 2 patients blocked for balance.', n: 5 },
        { l: 'Doctor ↔ Nurse — Bisi', last: 'Dr. Adebayo: SI resolved, discharge drafted.', n: 0 },
        { l: 'Transfer Notifications', last: 'TRF-203 approved → ICU.', n: 2 },
        { l: 'Trial Leave Alerts', last: 'Adeola Smith returning today 14:00.', n: 1 },
      ].map(c => (
        <Card key={c.l}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><span className="font-semibold text-sm">{c.l}</span></div>
            {c.n > 0 && <Badge className="bg-rose-500">{c.n}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-2 mb-3">{c.last}</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => toast('Chat opened')}>Open Chat</Button>
        </Card>
      ))}
    </div>
  </Shell>
);

// ============= 17. MOBILE / BEDSIDE PWA =============
export const MobileBedside = () => (
  <Shell title="Bedside Mobile / Tablet PWA">
    <div className="max-w-sm mx-auto bg-card border-2 rounded-3xl shadow-xl p-4">
      <div className="text-center mb-3"><Pill tone="blue">Bedside Mode · Tablet/Phone</Pill></div>
      <div className="border rounded-xl p-3 mb-3">
        <div className="font-semibold">Tope Adeyemi · 34M</div>
        <div className="text-xs text-muted-foreground">Male Psych 3B · Bed 12 · Day 49</div>
      </div>
      <PatientFinancialWidget />
      <div className="grid grid-cols-2 gap-2 mt-3">
        {[
          { l: 'Admit', i: <Plus className="h-4 w-4" />, p: `${base}/wizard` },
          { l: 'Transfer', i: <ArrowRightLeft className="h-4 w-4" />, p: `${base}/transfer` },
          { l: 'Trial Leave', i: <Plane className="h-4 w-4" />, p: `${base}/trial-leave` },
          { l: 'Discharge', i: <ClipboardCheck className="h-4 w-4" />, p: `${base}/discharge` },
          { l: 'Vitals', i: <Activity className="h-4 w-4" />, p: '/dashboard/nurse/vitals' },
          { l: 'Round Note', i: <FileText className="h-4 w-4" />, p: `${base}/ward-round` },
        ].map(b => (
          <Link key={b.l} to={b.p} className="border rounded-xl p-3 flex flex-col items-center gap-1 text-xs hover:bg-muted/50">{b.i}{b.l}</Link>
        ))}
      </div>
    </div>
  </Shell>
);

// ============= 18. CONFIG (Super Admin) =============
export const WardBedConfig = () => {
  const apiOn = isAdmissionsApiEnabled();
  const [rows, setRows] = useState<WardRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    wardClass: 'General',
    gender: 'Mixed',
    dailyBedRate: '5000',
    bedCount: '20',
  });

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listWards({ status: 'Active' });
      setRows(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load wards');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [apiOn]);

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setCreating(true);
    try {
      await createWard({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        wardClass: form.wardClass,
        gender: form.gender,
        dailyBedRate: Number(form.dailyBedRate) || 0,
        bedCount: Number(form.bedCount) || 0,
      });
      toast.success(`Ward ${form.code.toUpperCase()} created`);
      setOpen(false);
      setForm({ code: '', name: '', wardClass: 'General', gender: 'Mixed', dailyBedRate: '5000', bedCount: '20' });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Shell title="Ward & Bed Configuration">
      <Tabs defaultValue="wards">
        <TabsList>
          <TabsTrigger value="wards">Wards</TabsTrigger>
          <TabsTrigger value="beds">Beds & Capacity</TabsTrigger>
          <TabsTrigger value="rules">Admission Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="wards">
          <Card>
            <Section
              icon={<Building2 className="h-5 w-5" />}
              title="Wards (live)"
              desc="Gender-aware wards from the API. Create with bed inventory (default 20)."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void load()}>Refresh</Button>
                  <Button onClick={() => setOpen(true)} disabled={!apiOn}>
                    <Plus className="h-4 w-4 mr-1" /> New Ward
                  </Button>
                </div>
              }
            />
            {loading ? (
              <p className="text-sm text-muted-foreground py-6">Loading wards…</p>
            ) : error ? (
              <p className="text-sm text-rose-600 py-6">{error}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Free / Total</TableHead>
                    <TableHead>Rate/day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No wards</TableCell>
                    </TableRow>
                  ) : rows.map((w) => (
                    <TableRow key={w.wardId}>
                      <TableCell className="font-mono text-xs">{w.code}</TableCell>
                      <TableCell>{w.name}</TableCell>
                      <TableCell>{w.wardClass || w.wardType || '—'}</TableCell>
                      <TableCell>{w.gender || 'Mixed'}</TableCell>
                      <TableCell>{w.availableBeds ?? 0} / {w.totalBeds ?? 0}</TableCell>
                      <TableCell>₦{(w.dailyBedRate ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="beds">
          <Card>
            <Section icon={<BedDouble className="h-5 w-5" />} title="Capacity summary" desc="Free beds by ward from live inventory." />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Occupied</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => (
                  <TableRow key={w.wardId}>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.gender || 'Mixed'}</TableCell>
                    <TableCell className="text-emerald-700 font-medium">{w.availableBeds ?? 0}</TableCell>
                    <TableCell>{w.occupiedBeds ?? 0}</TableCell>
                    <TableCell>{w.totalBeds ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="rules">
          <Card>
            <Section icon={<Settings2 className="h-5 w-5" />} title="Admission Rules" desc="Operational rules (configuration reference)." />
            <div className="space-y-3 text-sm">
              {[
                'Proposed ward on doctor request is a preference; Records allocates the bed.',
                'Ward gender Male/Female filters lists for matching patients; Mixed is always eligible.',
                'ICU admissions require consultant approval + configured deposit.',
                'Admission package invoice posts Unpaid on admit; cashier collects afterward.',
              ].map((r, i) => (
                <div key={i} className="border rounded p-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  {r}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create ward</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MGEN2" /></div>
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>Class</Label>
              <Select value={form.wardClass} onValueChange={(v) => setForm((f) => ({ ...f, wardClass: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General', 'SemiPrivate', 'Private', 'VIP', 'ICU'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Male', 'Female', 'Mixed'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Daily bed rate (₦)</Label><Input value={form.dailyBedRate} onChange={(e) => setForm((f) => ({ ...f, dailyBedRate: e.target.value }))} /></div>
            <div><Label>Beds to create</Label><Input value={form.bedCount} onChange={(e) => setForm((f) => ({ ...f, bedCount: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={creating} onClick={() => void create()}>{creating ? 'Creating…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};
