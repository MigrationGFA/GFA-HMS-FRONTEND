import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { doctorAppointments, DoctorAppointment } from '@/data/hospitalData';
import { formatCurrency } from '@/data/dummyData';
import { doctorPerformance } from '@/data/workflowData';
import AttendancePanel from '@/components/workflow/AttendancePanel';
import ProfilePanel from '@/components/workflow/ProfilePanel';
import { Activity, Calendar, CheckCircle, DollarSign, Stethoscope, Clock, Video, Award, UserCircle, Users, Star, Play, ListChecks, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InpatientWardBoard } from '@/components/inpatient/InpatientDemoPanels';

const doctorNav = [
  { label: 'Overview', path: '/dashboard/doctor', icon: <Activity className="h-4 w-4" /> },
  { label: 'Clinical Workstation', path: '/dashboard/doctor/clinical', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Unified EMR Core', path: '/dashboard/doctor/emr', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Admission & Ward Center', path: '/dashboard/admission', icon: <Activity className="h-4 w-4" /> },
  { label: 'Laboratory Center', path: '/dashboard/laboratory', icon: <Activity className="h-4 w-4" /> },
  { label: 'Lab — All Results', path: '/dashboard/laboratory/all-results', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Lab — New Request', path: '/dashboard/laboratory/requests', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Patient Queue', path: '/consultation/queue', icon: <ListChecks className="h-4 w-4" /> },
  { label: 'Active Consultations', path: '/consultation/active', icon: <Stethoscope className="h-4 w-4" /> },
  { label: 'Completed Today', path: '/consultation/completed', icon: <CheckCircle className="h-4 w-4" /> },
  { label: 'EMR Sync', path: '/consultation/sync', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Appointments', path: '/dashboard/doctor/appointments', icon: <Calendar className="h-4 w-4" /> },
  { label: 'E-Health', path: '/dashboard/doctor/ehealth', icon: <Video className="h-4 w-4" /> },
  { label: 'Performance', path: '/dashboard/doctor/performance', icon: <Award className="h-4 w-4" /> },
  { label: 'Schedule', path: '/dashboard/doctor/schedule', icon: <Clock className="h-4 w-4" /> },
  { label: 'Attendance', path: '/dashboard/doctor/attendance', icon: <CheckCircle className="h-4 w-4" /> },
  { label: 'Profile', path: '/dashboard/doctor/profile', icon: <UserCircle className="h-4 w-4" /> },
];

const total = doctorAppointments.length;
const completed = doctorAppointments.filter(a => a.status === 'Completed').length;
const pending = doctorAppointments.filter(a => a.status === 'Scheduled').length;
const earnings = doctorAppointments.filter(a => a.status === 'Completed').reduce((s, a) => s + a.amount, 0);

const docCards = (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <SummaryCard title="Appointments Today" value={String(total)} icon={Calendar} />
    <SummaryCard title="Completed" value={String(completed)} icon={CheckCircle} />
    <SummaryCard title="Pending" value={String(pending)} subtitle="Scheduled" icon={Clock} />
    <SummaryCard title="Earnings" value={formatCurrency(earnings)} subtitle="Today" icon={DollarSign} />
  </div>
);

export const DoctorOverview = () => (
  <DashboardLayout navItems={doctorNav} title="Doctor Dashboard">
    <InpatientWardBoard />
    {docCards}
    <div className="bg-card rounded-xl border p-4">
      <h2 className="font-display font-semibold mb-4">Today's Appointments</h2>
      <Table>
        <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Mode</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>
          {doctorAppointments.slice(0, 5).map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.patient}</TableCell>
              <TableCell>{a.type}</TableCell>
              <TableCell>{a.mode}</TableCell>
              <TableCell>{a.time}</TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export const DoctorAppointments = () => {
  const [active, setActive] = useState<DoctorAppointment | null>(null);
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={doctorNav} title="Appointments">
      {docCards}
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="scheduled">Scheduled</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger><TabsTrigger value="cancelled">Cancelled</TabsTrigger></TabsList>
          {['all', 'scheduled', 'completed', 'cancelled'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Mode</TableHead><TableHead>Time</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {doctorAppointments.filter(a => tab === 'all' || a.status.toLowerCase() === tab).map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.patient}</TableCell>
                      <TableCell>{a.type}</TableCell>
                      <TableCell>{a.mode}</TableCell>
                      <TableCell>{a.time}</TableCell>
                      <TableCell>{formatCurrency(a.amount)}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setActive(a)}><Stethoscope className="h-3 w-3 mr-1" /> Open</Button></TableCell>
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
          <DialogHeader><DialogTitle className="font-display">Consultation — {active?.patient}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">Type:</span> {active.type}</p>
                <p><span className="text-muted-foreground">Mode:</span> {active.mode}</p>
                <p><span className="text-muted-foreground">Time:</span> {active.time}</p>
                <p><span className="text-muted-foreground">Fee:</span> {formatCurrency(active.amount)}</p>
              </div>
              <div><Label>Notes</Label><Textarea defaultValue="Patient presents with low-grade fever and headache for 3 days." /></div>
              <div><Label>Diagnosis</Label><Textarea defaultValue="Suspected uncomplicated malaria — pending RDT confirmation." /></div>
              <div><Label>Prescription</Label><Textarea defaultValue="Artemether/Lumefantrine 80/480mg BD x 3 days. Paracetamol 1g TDS prn." /></div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => { setActive(null); toast({ title: 'Consultation started' }); }}>Start Consultation</Button>
                <Button className="flex-1" onClick={() => { setActive(null); toast({ title: 'Marked as completed' }); }}>Complete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const DoctorEHealth = () => {
  const online = doctorAppointments.filter(a => a.mode === 'Online');
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={doctorNav} title="E-Health Consultations">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Online Today" value={String(online.length)} icon={Video} />
        <SummaryCard title="Awaiting" value={String(online.filter(a => a.status === 'Scheduled').length)} icon={Clock} />
        <SummaryCard title="Completed" value={String(online.filter(a => a.status === 'Completed').length)} icon={CheckCircle} />
        <SummaryCard title="E-Health Earnings" value={formatCurrency(online.reduce((s, a) => s + a.amount, 0))} icon={DollarSign} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Online Consultation Queue</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Type</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {online.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.patient}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.time}</TableCell>
                <TableCell><StatusBadge status={a.status} /></TableCell>
                <TableCell>
                  <Button size="sm" disabled={a.status !== 'Scheduled'} onClick={() => toast({ title: 'Starting video call...', description: `Connecting to ${a.patient}` })}>
                    <Play className="h-3 w-3 mr-1" /> Start Video
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export const DoctorPerformancePage = () => (
  <DashboardLayout navItems={doctorNav} title="My Performance">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <SummaryCard title="Patients Seen" value={String(doctorPerformance.patientsSeen)} subtitle="This quarter" icon={Users} />
      <SummaryCard title="Revenue Generated" value={formatCurrency(doctorPerformance.revenueGenerated)} icon={DollarSign} />
      <SummaryCard title="Rating" value={`${doctorPerformance.rating} / 5`} subtitle="Patient feedback" icon={Star} />
      <SummaryCard title="Completion Rate" value={`${doctorPerformance.completionRate}%`} icon={Award} />
    </div>
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-display font-semibold mb-4">Highlights</h3>
      <div className="space-y-3 text-sm">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <p className="font-medium text-foreground">⭐ Top performer in your department</p>
          <p className="text-muted-foreground text-xs mt-1">You are in the top 10% of doctors by patient satisfaction this quarter.</p>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p className="font-medium text-foreground">📈 Consultation volume up 18%</p>
          <p className="text-muted-foreground text-xs mt-1">Compared to last quarter — driven by e-health adoption.</p>
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export const DoctorAttendance = () => (
  <DashboardLayout navItems={doctorNav} title="My Attendance">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Days Present" value="22" subtitle="April" icon={CheckCircle} />
      <SummaryCard title="Days Absent" value="1" icon={Activity} />
      <SummaryCard title="Punctuality" value="93%" icon={Award} />
    </div>
    <AttendancePanel />
  </DashboardLayout>
);

export const DoctorProfile = () => (
  <DashboardLayout navItems={doctorNav} title="My Profile">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Specialization" value="Internal Medicine" icon={Stethoscope} />
      <SummaryCard title="Years of Practice" value="14 yrs" icon={Activity} />
      <SummaryCard title="Active Patients" value="312" icon={Users} />
    </div>
    <ProfilePanel />
  </DashboardLayout>
);

export const DoctorSchedule = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = ['9:00 AM', '10:30 AM', '12:00 PM', '2:00 PM', '3:30 PM'];
  return (
    <DashboardLayout navItems={doctorNav} title="My Schedule">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Available Slots" value="11" icon={Clock} />
        <SummaryCard title="Booked Slots" value="9" icon={Calendar} />
        <SummaryCard title="Days Scheduled" value="5" icon={Activity} />
      </div>
      <div className="bg-card rounded-xl border p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="p-2">Slot</th>
              {days.map(d => <th key={d} className="p-2">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, i) => (
              <tr key={slot} className="border-t">
                <td className="p-2 font-medium">{slot}</td>
                {days.map((d, j) => {
                  const idx = (i + j) % 4;
                  const labels = ['Available', 'Booked', 'Available', 'On Leave'];
                  const cls = ['badge-success', 'badge-warning', 'badge-success', 'badge-danger'];
                  return <td key={d} className="p-2"><span className={cls[idx]}>{labels[idx]}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};
