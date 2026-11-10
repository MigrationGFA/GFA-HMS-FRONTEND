import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import SimpleBarChart from '@/components/workflow/SimpleBarChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { staffMembers, departments, formatCurrency } from '@/data/dummyData';
import { attendanceRecords, leaveRequests, payrollRows, retirementRows, LeaveRequest } from '@/data/workflowData';
import {
  isSupportApiEnabled,
  listSupportRequests,
  updateSupportRequest,
  type SupportRequest,
  type SupportStatus,
} from '@/lib/api/support';
import { ApiError } from '@/lib/api/client';
import {
  staffProfiles, staffKpis, departmentKpis, shiftRoster, recruitmentJobs, onboardingTasks,
  trainingItems, disciplinaryCases, exitRecords, hrAlerts, attendanceTrend, payrollVsRevenue, hrTotals,
} from '@/data/hrData';
import { useToast } from '@/hooks/use-toast';
import {
  Activity, Users, CheckCircle, AlertTriangle, UserPlus, Calendar, CalendarDays, Award,
  Wallet, Clock, ClipboardList, LifeBuoy, Download, Briefcase, GraduationCap, ShieldCheck,
  LogOut, Gauge, TrendingUp, AlertOctagon, Zap, Stethoscope, Building2, FileWarning, Loader2,
} from 'lucide-react';

const hrNav = [
  { label: 'Command Center', path: '/dashboard/hr', icon: <Activity className="h-4 w-4" /> },
  { label: 'KPI Engine', path: '/dashboard/hr/kpis', icon: <Gauge className="h-4 w-4" /> },
  { label: 'Staff Records', path: '/dashboard/hr/staff', icon: <Users className="h-4 w-4" /> },
  { label: 'Recruitment', path: '/dashboard/hr/recruitment', icon: <Briefcase className="h-4 w-4" /> },
  { label: 'Onboarding', path: '/dashboard/hr/onboarding', icon: <UserPlus className="h-4 w-4" /> },
  { label: 'Attendance & Shifts', path: '/dashboard/hr/attendance', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Leave Management', path: '/dashboard/hr/leave', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Performance', path: '/dashboard/hr/performance', icon: <Award className="h-4 w-4" /> },
  { label: 'Payroll', path: '/dashboard/hr/payroll', icon: <Wallet className="h-4 w-4" /> },
  { label: 'Training & Licenses', path: '/dashboard/hr/training', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Compliance', path: '/dashboard/hr/compliance', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Exit Management', path: '/dashboard/hr/exit', icon: <LogOut className="h-4 w-4" /> },
  { label: 'Retirement', path: '/dashboard/hr/retirement', icon: <Clock className="h-4 w-4" /> },
  { label: 'Alerts', path: '/dashboard/hr/alerts', icon: <AlertOctagon className="h-4 w-4" /> },
  { label: 'Support Requests', path: '/dashboard/hr/support', icon: <LifeBuoy className="h-4 w-4" /> },
  { label: 'Reports', path: '/dashboard/hr/reports', icon: <ClipboardList className="h-4 w-4" /> },
];

const scoreColor = (s: number) =>
  s >= 80 ? 'text-emerald-600' : s >= 50 ? 'text-amber-600' : 'text-rose-600';
const scoreBg = (s: number) =>
  s >= 80 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : 'bg-rose-500';
const bandPill = (b: 'High' | 'Average' | 'Needs Attention') =>
  b === 'High' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
    : b === 'Average' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
    : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';

// ---------------- COMMAND CENTER (Overview) ----------------
export const HrOverview = () => {
  const critical = hrAlerts.filter(a => a.level === 'critical');
  const warnings = hrAlerts.filter(a => a.level === 'warning');
  return (
    <DashboardLayout navItems={hrNav} title="HR Workforce Command Center">
      {/* Hero KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-teal-600 to-teal-500 shadow">
          <div className="flex items-center justify-between"><Users className="h-5 w-5 opacity-90" /><span className="text-xs opacity-80">Workforce</span></div>
          <p className="text-3xl font-display font-bold mt-3">{hrTotals.totalStaff}</p>
          <p className="text-xs opacity-90 mt-1">Active {hrTotals.activeStaff} • Leave {hrTotals.onLeave} • Inactive {hrTotals.inactive}</p>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-sky-600 to-sky-500 shadow">
          <div className="flex items-center justify-between"><Calendar className="h-5 w-5 opacity-90" /><span className="text-xs opacity-80">Today</span></div>
          <p className="text-3xl font-display font-bold mt-3">{hrTotals.attendanceRate}%</p>
          <p className="text-xs opacity-90 mt-1">Attendance rate (7-day avg)</p>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-emerald-600 to-emerald-500 shadow">
          <div className="flex items-center justify-between"><Gauge className="h-5 w-5 opacity-90" /><span className="text-xs opacity-80">KPI</span></div>
          <p className="text-3xl font-display font-bold mt-3">{hrTotals.avgPerformance}</p>
          <p className="text-xs opacity-90 mt-1">Avg performance score</p>
        </div>
        <div className="rounded-xl p-5 text-white bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow">
          <div className="flex items-center justify-between"><Wallet className="h-5 w-5 opacity-90" /><span className="text-xs opacity-80">This month</span></div>
          <p className="text-3xl font-display font-bold mt-3">{formatCurrency(hrTotals.monthlyPayroll)}</p>
          <p className="text-xs opacity-90 mt-1">Payroll • {hrTotals.payrollRevenueRatio}% of revenue</p>
        </div>
      </div>

      {/* Quick stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3"><div className="rounded-md bg-orange-100 text-orange-700 p-2"><Briefcase className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">Open positions</p><p className="font-semibold">{hrTotals.openPositions}</p></div></div>
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3"><div className="rounded-md bg-rose-100 text-rose-700 p-2"><FileWarning className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">Expiring licenses</p><p className="font-semibold">{hrTotals.expiringLicenses}</p></div></div>
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3"><div className="rounded-md bg-amber-100 text-amber-700 p-2"><GraduationCap className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">Overdue training</p><p className="font-semibold">{hrTotals.overdueTraining}</p></div></div>
        <div className="rounded-lg border bg-card p-3 flex items-center gap-3"><div className="rounded-md bg-fuchsia-100 text-fuchsia-700 p-2"><Zap className="h-4 w-4" /></div><div><p className="text-xs text-muted-foreground">Burnout risk</p><p className="font-semibold">{hrTotals.burnoutRisk}</p></div></div>
      </div>

      {/* Risk & Alerts Panel */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-card rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2"><AlertOctagon className="h-5 w-5 text-rose-600" /> Risk & Alert Panel</h3>
            <Badge variant="outline">{hrAlerts.length} signals</Badge>
          </div>
          <div className="space-y-2">
            {[...critical, ...warnings].slice(0, 5).map(a => (
              <div key={a.id} className={`rounded-lg p-3 flex items-start gap-3 border ${a.level === 'critical' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`mt-0.5 rounded-md p-1.5 ${a.level === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}><AlertTriangle className="h-4 w-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.category} • {a.time}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">Action</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-teal-600" /> Attendance trend</h3>
          <SimpleBarChart data={attendanceTrend.map(p => ({ label: p.label, amount: p.rate }))} height={150} />
          <p className="text-xs text-muted-foreground mt-2">7-day attendance % across all departments</p>
        </div>
      </div>

      {/* Department productivity */}
      <div className="bg-card rounded-xl border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-600" /> Department Productivity & Efficiency</h3>
          <Badge variant="outline">{departmentKpis.length} departments</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Staff</TableHead><TableHead>Attendance</TableHead><TableHead>Productivity</TableHead><TableHead>Efficiency</TableHead><TableHead>Revenue</TableHead><TableHead>Alerts</TableHead></TableRow></TableHeader>
            <TableBody>
              {departmentKpis.map(d => (
                <TableRow key={d.department}>
                  <TableCell className="font-medium">{d.department}</TableCell>
                  <TableCell>{d.totalStaff}</TableCell>
                  <TableCell><div className="flex items-center gap-2 min-w-[120px]"><Progress value={d.attendanceRate} className="h-2" /><span className={`text-xs font-medium ${scoreColor(d.attendanceRate)}`}>{d.attendanceRate}%</span></div></TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${d.productivity >= 100 ? 'bg-emerald-100 text-emerald-700' : d.productivity >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{d.productivity}%</span></TableCell>
                  <TableCell className={`font-medium ${scoreColor(d.efficiencyScore)}`}>{d.efficiencyScore}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(d.revenueContribution)}</TableCell>
                  <TableCell>{d.alerts > 0 ? <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-xs">{d.alerts}</span> : <span className="text-xs text-emerald-600">—</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Two-column: Today's roster + Pending leaves */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Stethoscope className="h-5 w-5 text-teal-600" /> Today's Shift Roster</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Dept</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {shiftRoster.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.staffName}</TableCell>
                  <TableCell className="text-sm">{s.department}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{s.shift}</Badge></TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-fuchsia-600" /> Pending Leave Approvals</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {leaveRequests.filter(l => l.status === 'Pending').map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium text-sm">{l.staffName}</TableCell>
                  <TableCell className="text-sm">{l.type}</TableCell>
                  <TableCell className="text-sm">{l.days}</TableCell>
                  <TableCell><StatusBadge status={l.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ---------------- KPI ENGINE ----------------
export const HrKpis = () => {
  const high = staffKpis.filter(s => s.band === 'High').length;
  const avg = staffKpis.filter(s => s.band === 'Average').length;
  const low = staffKpis.filter(s => s.band === 'Needs Attention').length;
  return (
    <DashboardLayout navItems={hrNav} title="KPI Engine — Workforce Intelligence">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl p-5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow"><p className="text-xs opacity-80">High performers</p><p className="text-3xl font-display font-bold mt-2">{high}</p><p className="text-xs opacity-90 mt-1">Score ≥ 80</p></div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow"><p className="text-xs opacity-80">Average</p><p className="text-3xl font-display font-bold mt-2">{avg}</p><p className="text-xs opacity-90 mt-1">Score 50–79</p></div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow"><p className="text-xs opacity-80">Needs attention</p><p className="text-3xl font-display font-bold mt-2">{low}</p><p className="text-xs opacity-90 mt-1">Score &lt; 50</p></div>
        <div className="rounded-xl p-5 bg-gradient-to-br from-teal-600 to-sky-600 text-white shadow"><p className="text-xs opacity-80">Payroll vs Revenue</p><p className="text-3xl font-display font-bold mt-2">{hrTotals.payrollRevenueRatio}%</p><p className="text-xs opacity-90 mt-1">Healthy &lt; 60%</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-4">Payroll vs Revenue (₦M)</h3>
          <div className="space-y-3">
            {payrollVsRevenue.map(p => (
              <div key={p.label}>
                <div className="flex items-center justify-between text-xs mb-1"><span className="font-medium">{p.label}</span><span className="text-muted-foreground">Payroll {(p.payroll/1e6).toFixed(0)}M • Revenue {(p.revenue/1e6).toFixed(0)}M</span></div>
                <div className="flex gap-1 h-2.5">
                  <div className="bg-violet-500 rounded-l" style={{ width: `${(p.payroll/p.revenue)*100}%` }} />
                  <div className="bg-emerald-500 rounded-r flex-1" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Payroll cost</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Revenue</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-4">KPI Scoring Formula</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 rounded bg-sky-50"><span>Attendance</span><span className="font-medium text-sky-700">× 20%</span></div>
            <div className="flex items-center justify-between p-2 rounded bg-emerald-50"><span>Productivity</span><span className="font-medium text-emerald-700">× 40%</span></div>
            <div className="flex items-center justify-between p-2 rounded bg-amber-50"><span>Efficiency</span><span className="font-medium text-amber-700">× 20%</span></div>
            <div className="flex items-center justify-between p-2 rounded bg-fuchsia-50"><span>Compliance</span><span className="font-medium text-fuchsia-700">× 20%</span></div>
            <div className="flex items-center justify-between p-3 mt-3 rounded-lg bg-gradient-to-r from-teal-600 to-sky-600 text-white">
              <span className="font-medium">Performance Score</span><span className="font-bold">0 – 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4 overflow-x-auto">
        <h3 className="font-display font-semibold mb-3">Staff KPI Scorecards</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Att</TableHead><TableHead>Prod</TableHead><TableHead>Eff</TableHead><TableHead>Comp</TableHead><TableHead>Score</TableHead><TableHead>Output</TableHead><TableHead>Band</TableHead></TableRow></TableHeader>
          <TableBody>
            {staffKpis.map(k => (
              <TableRow key={k.staffId}>
                <TableCell className="font-medium text-sm">{k.staffName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{k.role}</TableCell>
                <TableCell className="text-xs">{k.attendanceScore}</TableCell>
                <TableCell className="text-xs">{k.productivityScore}</TableCell>
                <TableCell className="text-xs">{k.efficiencyScore}</TableCell>
                <TableCell className="text-xs">{k.complianceScore}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${scoreBg(k.performanceScore)}`} style={{ width: `${k.performanceScore}%` }} /></div>
                    <span className={`text-xs font-bold ${scoreColor(k.performanceScore)}`}>{k.performanceScore}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {k.patientsHandled ? <span>{k.patientsHandled} pts</span> : null}
                  {k.revenueGenerated ? <span className="text-emerald-700"> • {formatCurrency(k.revenueGenerated)}</span> : null}
                </TableCell>
                <TableCell><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${bandPill(k.band)}`}>{k.band}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

// ---------------- STAFF RECORDS (full profiles) ----------------
const staffCardStrip = (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <SummaryCard title="Total Staff" value={String(hrTotals.totalStaff)} icon={Users} />
    <SummaryCard title="Active" value={String(hrTotals.activeStaff)} icon={CheckCircle} />
    <SummaryCard title="On Leave" value={String(hrTotals.onLeave)} icon={CalendarDays} />
    <SummaryCard title="Inactive" value={String(hrTotals.inactive)} icon={AlertTriangle} />
  </div>
);

export const HrStaff = () => {
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={hrNav} title="Staff Master Records">
      {staffCardStrip}
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Staff Directory</h2>
          <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Add Staff</Button>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="on leave">On Leave</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
          {['all', 'active', 'on leave', 'suspended'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Staff ID</TableHead><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Grade</TableHead><TableHead>Type</TableHead><TableHead>License Expiry</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {staffProfiles.filter(s => tab === 'all' || s.status.toLowerCase() === tab).map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.id}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-sm">{s.role}</TableCell>
                        <TableCell className="text-sm">{s.department}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{s.grade}</Badge></TableCell>
                        <TableCell className="text-xs">{s.employmentType}</TableCell>
                        <TableCell className="text-xs">{s.licenseExpiry || '—'}</TableCell>
                        <TableCell><StatusBadge status={s.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add New Staff</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input defaultValue="Dr. New Hire" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Role</Label><Input defaultValue="Resident Doctor" /></div>
              <div><Label>Grade</Label>
                <Select defaultValue="GL10">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['GL07','GL08','GL09','GL10','GL12','GL14','GL15'].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Department</Label>
              <Select defaultValue={departments[0]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select defaultValue="Full-time">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Full-time','Contract','NYSC','Locum','Resident'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => { setAddOpen(false); toast({ title: 'Staff record created', description: 'Onboarding workflow started.' }); }}>Save & Begin Onboarding</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ---------------- RECRUITMENT ----------------
export const HrRecruitment = () => {
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={hrNav} title="Recruitment & Hiring">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Open Positions" value={String(recruitmentJobs.length)} icon={Briefcase} />
        <SummaryCard title="Total Applicants" value={String(recruitmentJobs.reduce((s, j) => s + j.applicants, 0))} icon={Users} />
        <SummaryCard title="Shortlisted" value={String(recruitmentJobs.reduce((s, j) => s + j.shortlisted, 0))} icon={CheckCircle} />
        <SummaryCard title="In Interview" value={String(recruitmentJobs.filter(j => j.stage === 'Interview').length)} icon={Activity} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold">Active Job Postings</h3>
          <Button size="sm" onClick={() => toast({ title: 'New job posted', description: 'Awaiting CMD approval.' })}><Briefcase className="h-4 w-4 mr-1" /> Post Job</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Department</TableHead><TableHead>Applicants</TableHead><TableHead>Shortlisted</TableHead><TableHead>Stage</TableHead><TableHead>Posted</TableHead></TableRow></TableHeader>
          <TableBody>
            {recruitmentJobs.map(j => (
              <TableRow key={j.id}>
                <TableCell className="font-medium">{j.title}</TableCell>
                <TableCell>{j.department}</TableCell>
                <TableCell>{j.applicants}</TableCell>
                <TableCell>{j.shortlisted}</TableCell>
                <TableCell><Badge variant="outline">{j.stage}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{j.posted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

// ---------------- ONBOARDING ----------------
export const HrOnboarding = () => (
  <DashboardLayout navItems={hrNav} title="Onboarding Pipeline">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="In Onboarding" value={String(onboardingTasks.length)} icon={UserPlus} />
      <SummaryCard title="Avg Progress" value={`${Math.round(onboardingTasks.reduce((s,t)=>s+t.progress,0)/onboardingTasks.length)}%`} icon={Activity} />
      <SummaryCard title="Ready for Active" value={String(onboardingTasks.filter(t => t.progress >= 80).length)} icon={CheckCircle} />
      <SummaryCard title="Blocked" value="0" icon={AlertTriangle} />
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {onboardingTasks.map(t => (
        <div key={t.id} className="bg-card rounded-xl border p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display font-semibold">{t.hireName}</p>
              <p className="text-xs text-muted-foreground">{t.role} • {t.department}</p>
            </div>
            <Badge variant="outline" className="text-xs">{t.step}</Badge>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Progress</span><span className="font-medium">{t.progress}%</span></div>
            <Progress value={t.progress} className="h-2" />
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1 text-[10px] text-center">
            {(['Profile','Access','Roster','Orientation','Active'] as const).map((s, i) => {
              const stepIdx = ['Profile','Access','Roster','Orientation','Active'].indexOf(t.step);
              const done = i <= stepIdx;
              return <div key={s} className={`rounded px-1 py-1 ${done ? 'bg-teal-100 text-teal-700' : 'bg-muted text-muted-foreground'}`}>{s}</div>;
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Started: {t.startDate}</p>
        </div>
      ))}
    </div>
  </DashboardLayout>
);

// ---------------- ATTENDANCE & SHIFTS ----------------
const attCards = (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <SummaryCard title="Present Today" value={String(attendanceRecords.filter(a => a.status === 'Present' || a.status === 'Late').length)} icon={CheckCircle} />
    <SummaryCard title="Late" value={String(attendanceRecords.filter(a => a.status === 'Late').length)} icon={Clock} />
    <SummaryCard title="Absent" value={String(attendanceRecords.filter(a => a.status === 'Absent').length)} icon={AlertTriangle} />
    <SummaryCard title="On Leave" value={String(attendanceRecords.filter(a => a.status === 'On Leave').length)} icon={CalendarDays} />
  </div>
);

export const HrAttendance = () => (
  <DashboardLayout navItems={hrNav} title="Attendance & Shift Management">
    {attCards}
    <Tabs defaultValue="attendance">
      <TabsList className="mb-4">
        <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
        <TabsTrigger value="roster">Shift Roster</TabsTrigger>
        <TabsTrigger value="trend">Trend</TabsTrigger>
      </TabsList>
      <TabsContent value="attendance">
        <div className="bg-card rounded-xl border p-4">
          <Tabs defaultValue="all">
            <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="present">Present</TabsTrigger><TabsTrigger value="late">Late</TabsTrigger><TabsTrigger value="absent">Absent</TabsTrigger></TabsList>
            {['all', 'present', 'late', 'absent'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {attendanceRecords.filter(a => tab === 'all' || a.status.toLowerCase() === tab).map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.staffName}</TableCell>
                        <TableCell>{a.department}</TableCell>
                        <TableCell>{a.checkIn}</TableCell>
                        <TableCell>{a.checkOut}</TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </TabsContent>
      <TabsContent value="roster">
        <div className="bg-card rounded-xl border p-4">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Staff</TableHead><TableHead>Department</TableHead><TableHead>Shift</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {shiftRoster.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.date}</TableCell>
                  <TableCell className="font-medium">{s.staffName}</TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell><Badge variant="outline">{s.shift}</Badge></TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
      <TabsContent value="trend">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-3">7-Day Attendance Rate</h3>
          <SimpleBarChart data={attendanceTrend.map(p => ({ label: p.label, amount: p.rate }))} height={220} />
        </div>
      </TabsContent>
    </Tabs>
  </DashboardLayout>
);

// ---------------- LEAVE ----------------
export const HrLeave = () => {
  const [active, setActive] = useState<LeaveRequest | null>(null);
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={hrNav} title="Leave & Time-Off Management">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="All Requests" value={String(leaveRequests.length)} icon={CalendarDays} />
        <SummaryCard title="Pending" value={String(leaveRequests.filter(l => l.status === 'Pending').length)} icon={AlertTriangle} />
        <SummaryCard title="Approved" value={String(leaveRequests.filter(l => l.status === 'Approved').length)} icon={CheckCircle} />
        <SummaryCard title="Rejected" value={String(leaveRequests.filter(l => l.status === 'Rejected').length)} icon={AlertTriangle} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="pending">
          <TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="approved">Approved</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList>
          {(['pending', 'approved', 'rejected'] as const).map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {leaveRequests.filter(l => l.status.toLowerCase() === tab).map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.staffName}</TableCell>
                      <TableCell>{l.type}</TableCell>
                      <TableCell>{l.startDate}</TableCell>
                      <TableCell>{l.endDate}</TableCell>
                      <TableCell>{l.days}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setActive(l)}>Review</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Dialog open={!!active} onOpenChange={() => setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Review Leave Request</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Staff:</span> <span className="font-medium">{active.staffName}</span></p>
              <p><span className="text-muted-foreground">Type:</span> {active.type}</p>
              <p><span className="text-muted-foreground">Dates:</span> {active.startDate} → {active.endDate} ({active.days} days)</p>
              <p><span className="text-muted-foreground">Reason:</span> {active.reason}</p>
              <div className="flex gap-2 pt-3">
                <Button className="flex-1" onClick={() => { setActive(null); toast({ title: 'Leave approved' }); }}>Approve</Button>
                <Button className="flex-1" variant="destructive" onClick={() => { setActive(null); toast({ title: 'Leave rejected' }); }}>Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

// ---------------- PERFORMANCE ----------------
export const HrPerformance = () => (
  <DashboardLayout navItems={hrNav} title="Performance & Productivity">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Avg Score" value={`${Math.round(staffKpis.reduce((s,k)=>s+k.performanceScore,0)/staffKpis.length)}%`} icon={Award} />
      <SummaryCard title="Top Performer" value={staffKpis.reduce((a,b)=>a.performanceScore>b.performanceScore?a:b).staffName.split(' ').slice(0,2).join(' ')} subtitle={`${Math.max(...staffKpis.map(k=>k.performanceScore))}%`} icon={CheckCircle} />
      <SummaryCard title="Underperforming" value={String(staffKpis.filter(k=>k.performanceScore<70).length)} subtitle="< 70%" icon={AlertTriangle} />
      <SummaryCard title="Total Tracked" value={String(staffKpis.length)} icon={Users} />
    </div>
    <div className="bg-card rounded-xl border p-4 overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Patients</TableHead><TableHead>Revenue</TableHead><TableHead>Avg TAT</TableHead><TableHead>Score</TableHead><TableHead>Band</TableHead></TableRow></TableHeader>
        <TableBody>
          {staffKpis.map(k => (
            <TableRow key={k.staffId}>
              <TableCell className="font-medium">{k.staffName}</TableCell>
              <TableCell className="text-sm">{k.role}</TableCell>
              <TableCell className="text-sm">{k.patientsHandled ?? '—'}</TableCell>
              <TableCell className="text-sm">{k.revenueGenerated ? formatCurrency(k.revenueGenerated) : '—'}</TableCell>
              <TableCell className="text-sm">{k.avgTurnaroundMin ? `${k.avgTurnaroundMin} min` : '—'}</TableCell>
              <TableCell><span className={`font-bold ${scoreColor(k.performanceScore)}`}>{k.performanceScore}%</span></TableCell>
              <TableCell><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${bandPill(k.band)}`}>{k.band}</span></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

// ---------------- PAYROLL ----------------
export const HrPayroll = () => {
  const total = payrollRows.reduce((s, p) => s + p.netPay, 0);
  return (
    <DashboardLayout navItems={hrNav} title="Payroll & Compensation">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Monthly Payroll" value={formatCurrency(hrTotals.monthlyPayroll)} icon={Wallet} />
        <SummaryCard title="Paid" value={String(payrollRows.filter(p => p.status === 'Paid').length)} icon={CheckCircle} />
        <SummaryCard title="Pending" value={String(payrollRows.filter(p => p.status === 'Pending').length)} icon={AlertTriangle} />
        <SummaryCard title="Payroll/Revenue" value={`${hrTotals.payrollRevenueRatio}%`} icon={TrendingUp} />
      </div>
      <div className="bg-card rounded-xl border p-4 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Department</TableHead><TableHead>Basic</TableHead><TableHead>Allowance</TableHead><TableHead>Deductions</TableHead><TableHead>Net Pay</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {payrollRows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.staffName}</TableCell>
                <TableCell>{r.department}</TableCell>
                <TableCell>{formatCurrency(r.basic)}</TableCell>
                <TableCell>{formatCurrency(r.allowance)}</TableCell>
                <TableCell className="text-rose-600">-{formatCurrency(r.deductions)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(r.netPay)}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

// ---------------- TRAINING & LICENSES ----------------
export const HrTraining = () => {
  const expiring = staffProfiles.filter(s => s.licenseExpiry && new Date(s.licenseExpiry) < new Date('2026-12-31'));
  return (
    <DashboardLayout navItems={hrNav} title="Training & Certification">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Programs Tracked" value={String(trainingItems.length)} icon={GraduationCap} />
        <SummaryCard title="Overdue" value={String(trainingItems.filter(t => t.status === 'Overdue').length)} icon={AlertTriangle} />
        <SummaryCard title="In Progress" value={String(trainingItems.filter(t => t.status === 'In Progress').length)} icon={Activity} />
        <SummaryCard title="Expiring Licenses" value={String(expiring.length)} subtitle="within 12 months" icon={FileWarning} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-display font-semibold mb-3">Training & CPD Programs</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Program</TableHead><TableHead>Type</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {trainingItems.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-sm">{t.staffName}</TableCell>
                  <TableCell className="text-sm">{t.program}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{t.type}</Badge></TableCell>
                  <TableCell className="text-xs">{t.due}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-display font-semibold mb-3">Professional Licenses</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>License</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
            <TableBody>
              {staffProfiles.filter(s => s.licenseNo).map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.licenseNo}</TableCell>
                  <TableCell className="text-sm">
                    <span className={new Date(s.licenseExpiry!) < new Date('2026-08-01') ? 'text-rose-600 font-medium' : 'text-muted-foreground'}>
                      {s.licenseExpiry}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
};

// ---------------- COMPLIANCE & DISCIPLINARY ----------------
export const HrCompliance = () => (
  <DashboardLayout navItems={hrNav} title="Compliance & Disciplinary">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Audit Score" value="92%" subtitle="Govt. compliance" icon={ShieldCheck} />
      <SummaryCard title="Open Cases" value={String(disciplinaryCases.filter(d => d.status === 'Open').length)} icon={AlertTriangle} />
      <SummaryCard title="License Validity" value="97%" icon={CheckCircle} />
      <SummaryCard title="Training Completion" value="88%" icon={GraduationCap} />
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Disciplinary Cases</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {disciplinaryCases.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-medium text-sm">{d.staffName}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{d.type}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.reason}</TableCell>
                <TableCell className="text-xs">{d.date}</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Compliance Checklist</h3>
        <div className="space-y-3">
          {[
            { label: 'License validity rate', value: 97, color: 'bg-emerald-500' },
            { label: 'Mandatory training completion', value: 88, color: 'bg-teal-500' },
            { label: 'Attendance compliance', value: 89, color: 'bg-sky-500' },
            { label: 'Payroll audit accuracy', value: 96, color: 'bg-violet-500' },
            { label: 'Govt. HR standards', value: 92, color: 'bg-fuchsia-500' },
          ].map(c => (
            <div key={c.label}>
              <div className="flex items-center justify-between text-sm mb-1"><span>{c.label}</span><span className="font-medium">{c.value}%</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full ${c.color}`} style={{ width: `${c.value}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </DashboardLayout>
);

// ---------------- EXIT MANAGEMENT ----------------
export const HrExit = () => (
  <DashboardLayout navItems={hrNav} title="Exit Management">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Active Exits" value={String(exitRecords.length)} icon={LogOut} />
      <SummaryCard title="Clearance Pending" value={String(exitRecords.filter(e => e.clearance !== 'Completed').length)} icon={AlertTriangle} />
      <SummaryCard title="Final Pay (₦)" value={formatCurrency(exitRecords.reduce((s,e)=>s+e.finalPay,0))} icon={Wallet} />
      <SummaryCard title="Completed YTD" value="7" icon={CheckCircle} />
    </div>
    <div className="bg-card rounded-xl border p-4">
      <Table>
        <TableHeader><TableRow><TableHead>Staff</TableHead><TableHead>Type</TableHead><TableHead>Exit Date</TableHead><TableHead>Clearance</TableHead><TableHead>Final Pay</TableHead></TableRow></TableHeader>
        <TableBody>
          {exitRecords.map(e => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.staffName}</TableCell>
              <TableCell><Badge variant="outline">{e.type}</Badge></TableCell>
              <TableCell className="text-sm">{e.date}</TableCell>
              <TableCell><StatusBadge status={e.clearance} /></TableCell>
              <TableCell className="font-semibold">{formatCurrency(e.finalPay)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

// ---------------- RETIREMENT (kept) ----------------
export const HrRetirement = () => (
  <DashboardLayout navItems={hrNav} title="Retirement Tracking">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Tracked Staff" value={String(retirementRows.length)} icon={Users} />
      <SummaryCard title="Approaching" value={String(retirementRows.filter(r => r.status === 'Approaching').length)} subtitle="Within 5 yrs" icon={Clock} />
      <SummaryCard title="Due" value={String(retirementRows.filter(r => r.status === 'Due').length)} subtitle="This year" icon={AlertTriangle} />
      <SummaryCard title="Active" value={String(retirementRows.filter(r => r.status === 'Active').length)} icon={CheckCircle} />
    </div>
    <div className="bg-card rounded-xl border p-4">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Age</TableHead><TableHead>Years</TableHead><TableHead>Retirement</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {retirementRows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.staffName}</TableCell>
              <TableCell>{r.role}</TableCell>
              <TableCell>{r.age}</TableCell>
              <TableCell>{r.yearsOfService}</TableCell>
              <TableCell>{r.retirementDate}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

// ---------------- ALERTS ----------------
export const HrAlerts = () => (
  <DashboardLayout navItems={hrNav} title="HR Risk & Alert Center">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Critical" value={String(hrAlerts.filter(a => a.level === 'critical').length)} icon={AlertOctagon} />
      <SummaryCard title="Warning" value={String(hrAlerts.filter(a => a.level === 'warning').length)} icon={AlertTriangle} />
      <SummaryCard title="Info" value={String(hrAlerts.filter(a => a.level === 'info').length)} icon={Activity} />
      <SummaryCard title="Today" value={String(hrAlerts.filter(a => a.time === 'Today').length)} icon={Clock} />
    </div>
    <div className="space-y-3">
      {hrAlerts.map(a => (
        <div key={a.id} className={`rounded-xl p-4 flex items-start gap-3 border ${
          a.level === 'critical' ? 'bg-rose-50 border-rose-200'
          : a.level === 'warning' ? 'bg-amber-50 border-amber-200'
          : 'bg-sky-50 border-sky-200'
        }`}>
          <div className={`rounded-md p-2 ${
            a.level === 'critical' ? 'bg-rose-100 text-rose-700'
            : a.level === 'warning' ? 'bg-amber-100 text-amber-700'
            : 'bg-sky-100 text-sky-700'
          }`}><AlertTriangle className="h-4 w-4" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-2"><p className="font-medium">{a.message}</p><Badge variant="outline" className="text-xs">{a.category}</Badge></div>
            <p className="text-xs text-muted-foreground mt-1">{a.time}</p>
          </div>
          <Button size="sm" variant="outline">Resolve</Button>
        </div>
      ))}
    </div>
  </DashboardLayout>
);

// ---------------- SUPPORT (live API) ----------------
export const HrSupport = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SupportRequest[]>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const apiOn = isSupportApiEnabled();

  const load = useCallback(async () => {
    if (!apiOn) {
      setItems([]);
      setError('Support API is not enabled (set VITE_USE_API and VITE_API_BASE_URL).');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listSupportRequests({ mine: false, limit: 200 });
      setItems(res.items);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load support requests';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (row: SupportRequest, status: SupportStatus) => {
    setUpdatingId(row.requestId);
    try {
      const updated = await updateSupportRequest(row.requestId, { status });
      setItems((prev) => prev.map((r) => (r.requestId === updated.requestId ? updated : r)));
      toast({ title: 'Status updated', description: `${updated.requestNo} → ${updated.status}` });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to update status';
      toast({ title: 'Update failed', description: msg, variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openCount = items.filter((r) => r.status === 'Open').length;
  const inProgressCount = items.filter((r) => r.status === 'In Progress').length;
  const resolvedCount = items.filter((r) => r.status === 'Resolved' || r.status === 'Closed').length;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso.slice(0, 10);
    }
  };

  const nextAction = (status: string): { label: string; status: SupportStatus } | null => {
    if (status === 'Open') return { label: 'Start', status: 'In Progress' };
    if (status === 'In Progress') return { label: 'Resolve', status: 'Resolved' };
    return null;
  };

  return (
    <DashboardLayout navItems={hrNav} title="Staff Support Requests">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Requests" value={loading ? '…' : String(items.length)} icon={LifeBuoy} />
        <SummaryCard title="Open" value={loading ? '…' : String(openCount)} icon={AlertTriangle} />
        <SummaryCard title="In Progress" value={loading ? '…' : String(inProgressCount)} icon={Activity} />
        <SummaryCard title="Resolved" value={loading ? '…' : String(resolvedCount)} icon={CheckCircle} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading support requests…
        </div>
      )}

      {!loading && error && (
        <div className="bg-card rounded-xl border p-6 text-center space-y-3">
          <p className="text-destructive text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-card rounded-xl border p-4">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="in progress">In Progress</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
            {['all', 'open', 'in progress', 'resolved'].map((tab) => {
              const filtered = items.filter((r) => {
                if (tab === 'all') return true;
                if (tab === 'resolved') return r.status === 'Resolved' || r.status === 'Closed';
                return r.status.toLowerCase() === tab;
              });
              return (
                <TabsContent key={tab} value={tab}>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No support requests in this view.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Request ID</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Module</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((r) => {
                          const action = nextAction(r.status);
                          const busy = updatingId === r.requestId;
                          return (
                            <TableRow key={r.requestId}>
                              <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                              <TableCell className="font-medium">
                                {r.staffName}
                                {r.roleLabel ? (
                                  <span className="block text-xs text-muted-foreground">{r.roleLabel}</span>
                                ) : null}
                              </TableCell>
                              <TableCell>{r.issueType}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {r.module ?? '—'}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {r.description}
                              </TableCell>
                              <TableCell>{formatDate(r.createdAt)}</TableCell>
                              <TableCell>
                                <StatusBadge status={r.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                {action ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => void setStatus(r, action.status)}
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      action.label
                                    )}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}
    </DashboardLayout>
  );
};

// ---------------- REPORTS ----------------
export const HrReports = () => (
  <DashboardLayout navItems={hrNav} title="HR Analytics & Reports">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Available Reports" value="12" icon={ClipboardList} />
      <SummaryCard title="Total Staff" value={String(staffMembers.length)} icon={Users} />
      <SummaryCard title="Avg Attendance" value={`${hrTotals.attendanceRate}%`} icon={CheckCircle} />
      <SummaryCard title="Last Export" value="Today" icon={Download} />
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {[
        'Monthly Attendance Report', 'Leave Utilization', 'Payroll Summary',
        'Performance Scorecards', 'Department KPI Comparison', 'Payroll vs Revenue Analysis',
        'Recruitment Funnel Report', 'License Expiry Forecast', 'Training Compliance',
        'Disciplinary Cases Audit', 'Retirement Forecast', 'Workforce Headcount Trend',
      ].map(r => (
        <div key={r} className="bg-card rounded-xl border p-4 flex items-center justify-between">
          <p className="font-medium text-sm">{r}</p>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      ))}
    </div>
  </DashboardLayout>
);
