import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import {
  Calendar, CalendarDays, Clock, Printer, Download, RefreshCw, Plus, Video,
  UserX, Filter, CheckCircle2, Users,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · My Schedule">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const ComingSoon = () => (
  <Card className="text-center text-muted-foreground py-16 text-sm">Coming soon</Card>
);

const soon = () => toast.info('Coming soon');

export const DoctorMySchedule = () => (
  <Shell>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-display font-bold">My Schedule</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          Daily, weekly, and monthly view of doctor appointments, reviews, follow-ups, and telemedicine sessions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled onClick={soon}><CalendarDays className="h-4 w-4 mr-1" />Today</Button>
        <Button variant="outline" size="sm" disabled onClick={soon}><Plus className="h-4 w-4 mr-1" />New Appointment</Button>
        <Button variant="outline" size="sm" disabled onClick={soon}><Printer className="h-4 w-4 mr-1" />Print</Button>
        <Button variant="outline" size="sm" disabled onClick={soon}><Download className="h-4 w-4 mr-1" />Export</Button>
        <Button variant="outline" size="sm" disabled onClick={soon}><RefreshCw className="h-4 w-4 mr-1" />Sync Calendar</Button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <SummaryCard title="Today's Appointments" value="0" subtitle="—" icon={Calendar} tone="blue" />
      <SummaryCard title="Waiting Patients" value="0" subtitle="In queue" icon={Clock} tone="amber" />
      <SummaryCard title="Confirmed" value="0" subtitle="Ready to see" icon={CheckCircle2} tone="teal" />
      <SummaryCard title="Telemedicine" value="0" subtitle="Virtual sessions" icon={Video} tone="purple" />
      <SummaryCard title="Completed" value="0" subtitle="Seen today" icon={Users} tone="green" />
      <SummaryCard title="No-Shows" value="0" subtitle="Missed today" icon={UserX} tone="rose" />
    </div>

    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1"><Filter className="h-4 w-4" />Filters</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-2 opacity-60 pointer-events-none">
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Clinic" /></SelectTrigger><SelectContent><SelectItem value="all">All clinics</SelectItem></SelectContent></Select>
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem></SelectContent></Select>
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Visit type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem></SelectContent></Select>
        <Input disabled type="date" />
        <Input disabled type="date" />
        <Input disabled placeholder="Patient search" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled onClick={soon}>Apply Filters</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}>Reset</Button>
      </div>
    </Card>

    <Tabs defaultValue="daily">
      <TabsList className="mb-4">
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="weekly">Weekly</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
      </TabsList>
      <TabsContent value="daily"><ComingSoon /></TabsContent>
      <TabsContent value="weekly"><ComingSoon /></TabsContent>
      <TabsContent value="monthly"><ComingSoon /></TabsContent>
    </Tabs>
  </Shell>
);

export default DoctorMySchedule;
