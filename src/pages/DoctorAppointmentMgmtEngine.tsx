import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import {
  Calendar, Printer, Download, Send, ArrowRightLeft, Plus, UserX, XCircle, Filter,
  Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Appointment Management">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const soon = () => toast.info('Coming soon');

const HEADERS = ['Time', 'Patient', 'Hospital No.', 'Age/Sex', 'Clinic', 'Type', 'Doctor', 'Payment', 'Vitals', 'Status', 'Action'];

export const DoctorAppointmentMgmt = () => (
  <Shell>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-display font-bold">Appointment Management</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          Manage appointments, queues, bulk movement, patient notifications, and consultation start workflow.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled onClick={soon}><Plus className="h-4 w-4 mr-1" />New Appointment</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><Printer className="h-4 w-4 mr-1" />Print List</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><Download className="h-4 w-4 mr-1" />Export</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><Send className="h-4 w-4 mr-1" />Notify Patients</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><ArrowRightLeft className="h-4 w-4 mr-1" />Move Appointments</Button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <SummaryCard title="Today" value="0" subtitle="—" icon={Calendar} tone="blue" />
      <SummaryCard title="Upcoming" value="0" subtitle="Future slots" icon={Clock} tone="teal" />
      <SummaryCard title="Completed" value="0" subtitle="Seen" icon={CheckCircle2} tone="green" />
      <SummaryCard title="Cancelled" value="0" subtitle="Cancelled" icon={XCircle} tone="rose" />
      <SummaryCard title="Missed" value="0" subtitle="No-shows" icon={UserX} tone="amber" />
      <SummaryCard title="Waiting" value="0" subtitle="In queue" icon={AlertTriangle} tone="purple" />
    </div>

    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1"><Filter className="h-4 w-4" />Filters</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-2 opacity-60 pointer-events-none">
        <Input disabled type="date" />
        <Input disabled type="date" />
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Clinic" /></SelectTrigger><SelectContent><SelectItem value="all">All clinics</SelectItem></SelectContent></Select>
        <Input disabled placeholder="Doctor" />
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem></SelectContent></Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled onClick={soon}>Apply</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}>Reset</Button>
      </div>
    </Card>

    <Tabs defaultValue="today">
      <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
        {['today', 'upcoming', 'completed', 'cancelled', 'missed', 'waiting', 'telemedicine'].map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize">{t === 'telemedicine' ? 'Telemedicine' : t}</TabsTrigger>
        ))}
      </TabsList>
      {['today', 'upcoming', 'completed', 'cancelled', 'missed', 'waiting', 'telemedicine'].map((t) => (
        <TabsContent key={t} value={t}>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 border-b w-10"><Checkbox disabled /></th>
                  {HEADERS.map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={HEADERS.length + 1} className="px-3 py-16 text-center text-sm text-muted-foreground">
                    Coming soon
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  </Shell>
);

export default DoctorAppointmentMgmt;
