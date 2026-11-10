import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { appointments, formatCurrency } from '@/data/dummyData';
import { Users, ClipboardList, Calendar, CheckCircle, Search, Bell, BookOpen, FileText, CalendarDays, UserCircle, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { staffTasks } from '@/data/hospitalData';
import { hospitalServices, invoices } from '@/data/invoiceData';
import { bookingsToVerify } from '@/data/workflowData';
import AttendancePanel from '@/components/workflow/AttendancePanel';
import LeaveRequestPanel from '@/components/workflow/LeaveRequestPanel';
import ProfilePanel from '@/components/workflow/ProfilePanel';
import { useToast } from '@/hooks/use-toast';

const staffNav = [
  { label: 'Overview', path: '/dashboard/staff', icon: <ClipboardList className="h-4 w-4" /> },
  { label: 'Tasks', path: '/dashboard/staff/tasks', icon: <CheckCircle className="h-4 w-4" /> },
  { label: 'Invoices', path: '/dashboard/staff/invoices', icon: <FileText className="h-4 w-4" /> },
  { label: 'Bookings', path: '/dashboard/staff/bookings', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Appointments', path: '/dashboard/staff/appointments', icon: <Search className="h-4 w-4" /> },
  { label: 'Attendance', path: '/dashboard/staff/attendance', icon: <CheckCircle className="h-4 w-4" /> },
  { label: 'Leave Request', path: '/dashboard/staff/leave', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Profile', path: '/dashboard/staff/profile', icon: <UserCircle className="h-4 w-4" /> },
];

const tasksToday = staffTasks.length;
const pendingTasks = staffTasks.filter(t => t.status === 'Pending').length;
const inProgressTasks = staffTasks.filter(t => t.status === 'In Progress').length;
const assigned = 12;

const staffCards = (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <SummaryCard title="Tasks Today" value={String(tasksToday)} icon={ClipboardList} />
    <SummaryCard title="Patients Assigned" value={String(assigned)} icon={Users} />
    <SummaryCard title="Pending Actions" value={String(pendingTasks)} icon={AlertTriangle} />
    <SummaryCard title="In Progress" value={String(inProgressTasks)} icon={Calendar} />
  </div>
);

export const StaffDashboard = () => {
  const [checkedIn, setCheckedIn] = useState(false);
  return (
    <DashboardLayout navItems={staffNav} title="Staff Dashboard">
      {staffCards}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-4">Quick Actions</h3>
          <Button className="w-full mb-3" variant={checkedIn ? 'outline' : 'default'} onClick={() => setCheckedIn(!checkedIn)}>
            <CheckCircle className="h-4 w-4 mr-2" />{checkedIn ? 'Checked In ✓' : 'Check In'}
          </Button>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Bell className="h-4 w-4" /> Announcements</h3>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted"><p className="text-sm font-medium">Staff Meeting</p><p className="text-xs text-muted-foreground">Friday at 2:00 PM in the auditorium.</p></div>
            <div className="p-3 rounded-lg bg-muted"><p className="text-sm font-medium">Training: New EMR System</p><p className="text-xs text-muted-foreground">Mandatory training next Monday.</p></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 md:col-span-2">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4" /> Today's Schedule</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {appointments.slice(0, 4).map(a => (
                <TableRow key={a.id}><TableCell>{a.time}</TableCell><TableCell className="font-medium">{a.patientName}</TableCell><TableCell>{a.department}</TableCell><TableCell><StatusBadge status={a.status} /></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-card rounded-xl border p-5 md:col-span-2">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Upcoming Training</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div><p className="text-sm font-medium">Advanced Surgical Techniques</p><p className="text-xs text-muted-foreground">April 5, 2026 • Surgery Department</p></div>
              <span className="badge-warning">Upcoming</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div><p className="text-sm font-medium">Patient Safety Workshop</p><p className="text-xs text-muted-foreground">April 12, 2026 • All Departments</p></div>
              <span className="badge-warning">Upcoming</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const StaffTasks = () => (
  <DashboardLayout navItems={staffNav} title="My Tasks">
    {staffCards}
    <div className="bg-card rounded-xl border p-4">
      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="in progress">In Progress</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>
        {['all', 'pending', 'in progress', 'completed'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Table>
              <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Patient</TableHead><TableHead>Ward</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {staffTasks.filter(t => tab === 'all' || t.status.toLowerCase() === tab).map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.task}</TableCell>
                    <TableCell>{t.patient}</TableCell>
                    <TableCell>{t.ward}</TableCell>
                    <TableCell><StatusBadge status={t.priority} /></TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </DashboardLayout>
);

export const StaffInvoices = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();
  const total = selected.reduce((s, id) => {
    const svc = hospitalServices.find(x => x.id === id);
    return s + (svc?.price || 0);
  }, 0);
  return (
    <DashboardLayout navItems={staffNav} title="Invoices">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Created Today" value="6" icon={FileText} />
        <SummaryCard title="My Pending" value="2" icon={AlertTriangle} />
        <SummaryCard title="Total Generated" value={String(invoices.length)} icon={ClipboardList} />
        <SummaryCard title="Revenue (Mine)" value={formatCurrency(420_000)} icon={CheckCircle} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Recent Invoices</h3>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Create Invoice</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Patient</TableHead><TableHead>Department</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.slice(0, 6).map(inv => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium text-xs">{inv.invoiceId}</TableCell>
                <TableCell>{inv.patientName}</TableCell>
                <TableCell>{inv.department}</TableCell>
                <TableCell>{formatCurrency(inv.totalAmount)}</TableCell>
                <TableCell><StatusBadge status={inv.paymentStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient Name</Label><Input defaultValue="John Doe" /></div>
            <div><Label>Phone</Label><Input defaultValue="08012345678" /></div>
            <div>
              <Label>Services</Label>
              <div className="border rounded-lg p-2 max-h-44 overflow-y-auto space-y-1">
                {hospitalServices.slice(0, 10).map(svc => (
                  <label key={svc.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded text-sm">
                    <Checkbox
                      checked={selected.includes(svc.id)}
                      onCheckedChange={(c) => setSelected(c ? [...selected, svc.id] : selected.filter(x => x !== svc.id))}
                    />
                    <span className="flex-1">{svc.name}</span>
                    <span className="text-muted-foreground text-xs">{formatCurrency(svc.price)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
              <span className="text-sm font-medium">Total Amount</span>
              <span className="font-display font-bold text-lg">{formatCurrency(total)}</span>
            </div>
            <Button className="w-full" onClick={() => { setOpen(false); setSelected([]); toast({ title: 'Invoice created', description: `Total ${formatCurrency(total)}` }); }}>Generate Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const StaffBookings = () => {
  const { toast } = useToast();
  return (
    <DashboardLayout navItems={staffNav} title="Bookings Verification">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Today's Bookings" value={String(bookingsToVerify.length)} icon={Calendar} />
        <SummaryCard title="Pending" value={String(bookingsToVerify.filter(b => b.status === 'Pending').length)} icon={AlertTriangle} />
        <SummaryCard title="Verified" value={String(bookingsToVerify.filter(b => b.status === 'Verified').length)} icon={CheckCircle} />
        <SummaryCard title="Attended" value={String(bookingsToVerify.filter(b => b.status === 'Attended').length)} icon={Users} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Patient</TableHead><TableHead>Service</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {bookingsToVerify.map(b => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.bookingCode}</TableCell>
                <TableCell className="font-medium">{b.patient}</TableCell>
                <TableCell>{b.service}</TableCell>
                <TableCell>{b.time}</TableCell>
                <TableCell><StatusBadge status={b.status} /></TableCell>
                <TableCell>
                  {b.status !== 'Attended' && (
                    <Button size="sm" variant="outline" onClick={() => toast({ title: 'Marked as attended', description: b.patient })}>
                      Mark Attended
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export const StaffAppointments = () => {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<typeof appointments[0] | null>(null);
  const search = () => {
    const result = appointments.find(a => a.bookingCode === code.toUpperCase());
    setFound(result || null);
  };
  return (
    <DashboardLayout navItems={staffNav} title="Appointments">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard title="Total Appointments" value={String(appointments.length)} icon={Calendar} />
        <SummaryCard title="Confirmed" value={String(appointments.filter(a => a.status === 'Confirmed').length)} icon={CheckCircle} />
        <SummaryCard title="Pending" value={String(appointments.filter(a => a.status === 'Pending').length)} icon={AlertTriangle} />
      </div>
      <div className="bg-card rounded-xl border p-5 mb-6">
        <h3 className="font-display font-semibold mb-4">Look Up Appointment</h3>
        <div className="flex gap-3 max-w-md">
          <Input placeholder="Enter Booking Code (e.g. GFA HMS-12345)" value={code} onChange={e => setCode(e.target.value)} />
          <Button onClick={search}><Search className="h-4 w-4 mr-1" /> Search</Button>
        </div>
        {found && (
          <div className="mt-4 p-4 rounded-lg bg-muted space-y-1">
            <p className="text-sm"><span className="font-medium">Patient:</span> {found.patientName}</p>
            <p className="text-sm"><span className="font-medium">Phone:</span> {found.phone}</p>
            <p className="text-sm"><span className="font-medium">Doctor:</span> {found.doctor}</p>
            <p className="text-sm"><span className="font-medium">Date:</span> {found.date} at {found.time}</p>
          </div>
        )}
        {code && !found && <p className="mt-3 text-sm text-muted-foreground">No appointment found with that code.</p>}
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {appointments.map(a => (
              <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.bookingCode}</TableCell><TableCell className="font-medium">{a.patientName}</TableCell><TableCell>{a.doctor}</TableCell><TableCell>{a.date}</TableCell><TableCell>{a.time}</TableCell><TableCell><StatusBadge status={a.status} /></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};

export const StaffAttendance = () => (
  <DashboardLayout navItems={staffNav} title="My Attendance">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Days Present" value="22" subtitle="April" icon={CheckCircle} />
      <SummaryCard title="Days Absent" value="1" icon={AlertTriangle} />
      <SummaryCard title="Punctuality" value="95%" icon={Calendar} />
    </div>
    <AttendancePanel />
  </DashboardLayout>
);

export const StaffLeave = () => (
  <DashboardLayout navItems={staffNav} title="Leave Request">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Annual Balance" value="14 days" icon={CalendarDays} />
      <SummaryCard title="Pending" value="0" icon={AlertTriangle} />
      <SummaryCard title="Approved (YTD)" value="4 days" icon={CheckCircle} />
    </div>
    <LeaveRequestPanel />
  </DashboardLayout>
);

export const StaffProfile = () => (
  <DashboardLayout navItems={staffNav} title="My Profile">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Role" value="Surgeon" icon={UserCircle} />
      <SummaryCard title="Years of Service" value="18 yrs" icon={Calendar} />
      <SummaryCard title="Open Requests" value="0" icon={ClipboardList} />
    </div>
    <ProfilePanel />
  </DashboardLayout>
);
