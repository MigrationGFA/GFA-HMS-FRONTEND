import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, servicePackages } from '@/data/dummyData';
import { updatedAiInsights } from '@/data/invoiceData';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminNav } from './admin/nav';
import { Panel, StatCards, tableHead } from './admin/ui';

export { AdminOverview } from './admin/AdminCommandCenter';
export { AdminStaff } from './admin/AdminPeople';
export { AdminFinance as AdminRevenue } from './admin/AdminFinance';

export const AdminPackages = () => {
  const [viewPkg, setViewPkg] = useState<typeof servicePackages[0] | null>(null);
  const activePkgs = servicePackages.filter(p => p.status === 'Active').length;

  return (
    <DashboardLayout navItems={adminNav} title="Service Bundling">
      <StatCards items={[
        { label: 'Packages', value: String(servicePackages.length), sub: 'Hospital service bundles' },
        { label: 'Active', value: String(activePkgs), sub: 'Available to request' },
        { label: 'Inactive', value: String(servicePackages.length - activePkgs), sub: 'Not offered right now' },
      ]} />
      <Panel className="p-4">
        <Table>
          <TableHeader><TableRow className={tableHead}><TableHead>Package</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Requests</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {servicePackages.map(p => (
              <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{formatCurrency(p.price)}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell><TableCell>{p.requests}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => setViewPkg(p)}>View Details</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Dialog open={!!viewPkg} onOpenChange={() => setViewPkg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{viewPkg?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Price: {viewPkg && formatCurrency(viewPkg.price)}</p>
            <p className="text-sm font-medium text-foreground">Included Services:</p>
            <ul className="space-y-1">
              {viewPkg?.services.map((s, i) => <li key={i} className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="h-3 w-3 text-primary" />{s}</li>)}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const AdminInsights = () => (
  <DashboardLayout navItems={adminNav} title="AI Insights">
    <StatCards items={[
      { label: 'Insights', value: String(updatedAiInsights.length), sub: 'Demonstration notices' },
      { label: 'Warnings', value: String(updatedAiInsights.filter((row) => row.type === 'warning' || row.type === 'danger').length), sub: 'Need a look' },
      { label: 'Clear', value: String(updatedAiInsights.filter((row) => row.type === 'success' || row.type === 'info').length), sub: 'Informational' },
    ]} />
    <div className="space-y-4">
      {updatedAiInsights.map((insight, i) => {
        const iconMap = { warning: AlertTriangle, success: CheckCircle, danger: AlertTriangle, info: Info };
        const colorMap = { warning: 'text-warning', success: 'text-success', danger: 'text-danger', info: 'text-primary' };
        const bgMap = { warning: 'bg-yellow-50 border-yellow-200', success: 'bg-green-50 border-green-200', danger: 'bg-red-50 border-red-200', info: 'bg-blue-50 border-blue-200' };
        const Icon = iconMap[insight.type];
        return (
          <div key={i} className={`rounded-xl border p-5 ${bgMap[insight.type]}`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 mt-0.5 ${colorMap[insight.type]}`} />
              <div>
                <p className="font-medium text-foreground">{insight.message}</p>
                <p className="text-sm text-muted-foreground mt-1">{insight.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </DashboardLayout>
);
