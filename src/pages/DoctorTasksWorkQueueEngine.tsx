import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import {
  RefreshCw, UserPlus, Download, Printer, Plus, Eye, FileSignature,
  AlertTriangle, CheckCircle2, Send, Stethoscope, Clock, ArrowUpRight, Filter, BedDouble,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Tasks & Work Queue">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

const soon = () => toast.info('Coming soon');

const HEADERS = ['Priority', 'Patient', 'Hospital No.', 'Task', 'Type', 'Assigned By', 'Department', 'Due', 'Status', 'Action'];
const TABS = ['all', 'reviews', 'signatures', 'critical', 'discharges', 'referrals', 'consults', 'overdue', 'escalated', 'completed'] as const;

export const DoctorTasks = () => (
  <Shell>
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-display font-bold">Tasks & Work Queue</h1>
        <p className="text-sm text-muted-foreground max-w-2xl mt-1">
          Pending reviews, signatures, results, discharges, referrals, consults, and escalations assigned to you.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled onClick={soon}><Plus className="h-4 w-4 mr-1" />New Task</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><RefreshCw className="h-4 w-4 mr-1" />Refresh Queue</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><UserPlus className="h-4 w-4 mr-1" />Assign Task</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><Download className="h-4 w-4 mr-1" />Export</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}><Printer className="h-4 w-4 mr-1" />Print</Button>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
      <SummaryCard title="Pending Reviews" value="0" icon={Eye} tone="blue" />
      <SummaryCard title="Pending Signatures" value="0" icon={FileSignature} tone="amber" />
      <SummaryCard title="Critical Results" value="0" icon={AlertTriangle} tone="rose" />
      <SummaryCard title="Pending Discharges" value="0" icon={BedDouble} tone="teal" />
      <SummaryCard title="Pending Referrals" value="0" icon={Send} tone="purple" />
      <SummaryCard title="Pending Consults" value="0" icon={Stethoscope} tone="indigo" />
      <SummaryCard title="Overdue Tasks" value="0" icon={Clock} tone="rose" />
      <SummaryCard title="Escalated Tasks" value="0" icon={ArrowUpRight} tone="amber" />
      <SummaryCard title="Completed Today" value="0" icon={CheckCircle2} tone="green" />
    </div>

    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium flex items-center gap-1"><Filter className="h-4 w-4" />Filters</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-2 opacity-60 pointer-events-none">
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value="all">All priority</SelectItem></SelectContent></Select>
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem></SelectContent></Select>
        <Input disabled placeholder="Assigned by" />
        <Input disabled placeholder="Patient" />
        <Input disabled type="date" />
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem></SelectContent></Select>
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Dept" /></SelectTrigger><SelectContent><SelectItem value="all">All depts</SelectItem></SelectContent></Select>
        <Select disabled value="all"><SelectTrigger><SelectValue placeholder="Clinic" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem></SelectContent></Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled onClick={soon}>Apply</Button>
        <Button size="sm" variant="outline" disabled onClick={soon}>Reset</Button>
      </div>
    </Card>

    <Tabs defaultValue="all">
      <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
        {TABS.map((t) => (
          <TabsTrigger key={t} value={t} className="capitalize">{t === 'critical' ? 'Critical Results' : t}</TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((t) => (
        <TabsContent key={t} value={t}>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {HEADERS.map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={HEADERS.length} className="px-3 py-16 text-center text-sm text-muted-foreground">
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

export default DoctorTasks;
