import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initialSystemFeatures, initialAlerts, SystemFeature, SystemStatus } from '@/data/hospitalData';
import { Activity, ServerCrash, ShieldCheck, AlertTriangle, ScrollText, Bell, Eye, Wrench, RefreshCw, Inbox, Cpu, Network, FileWarning, GitBranch, Link2 } from 'lucide-react';

const itNav = [
  { label: 'Overview', path: '/dashboard/it', icon: <Activity className="h-4 w-4" /> },
  { label: 'System Status', path: '/dashboard/it/status', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Logs', path: '/dashboard/it/logs', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Alerts', path: '/dashboard/it/alerts', icon: <Bell className="h-4 w-4" /> },
  { label: 'EMR Sync Overview', path: '/sync', icon: <RefreshCw className="h-4 w-4" /> },
  { label: 'Sync Queue', path: '/sync/queue', icon: <Inbox className="h-4 w-4" /> },
  { label: 'Workers', path: '/sync/workers', icon: <Cpu className="h-4 w-4" /> },
  { label: 'EMR Adapter', path: '/sync/adapter', icon: <GitBranch className="h-4 w-4" /> },
  { label: 'ID Mappings', path: '/sync/mappings', icon: <Link2 className="h-4 w-4" /> },
  { label: 'Channel Health', path: '/sync/channels', icon: <Network className="h-4 w-4" /> },
  { label: 'Dead Letter', path: '/sync/dead-letter', icon: <FileWarning className="h-4 w-4" /> },
  { label: 'Sync Audit', path: '/sync/audit', icon: <ScrollText className="h-4 w-4" /> },
];

// Module-level mutable state for cross-page demo simulation.
const state = {
  features: [...initialSystemFeatures] as SystemFeature[],
  listeners: new Set<() => void>(),
};
const useFeatureState = () => {
  const [, force] = useState(0);
  const setFeatures = (next: SystemFeature[]) => {
    state.features = next;
    state.listeners.forEach(l => l());
  };
  useEffect(() => {
    const l = () => force(x => x + 1);
    state.listeners.add(l);
    return () => { state.listeners.delete(l); };
  }, []);
  return [state.features, setFeatures] as const;
};

const counts = (features: SystemFeature[]) => ({
  active: features.filter(f => f.status === 'Active').length,
  warning: features.filter(f => f.status === 'Warning').length,
  down: features.filter(f => f.status === 'Down').length,
});

export const ItOverview = () => {
  const [features] = useFeatureState();
  const c = counts(features);
  return (
    <DashboardLayout navItems={itNav} title="IT / System Status">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total Systems Monitored" value={String(features.length)} icon={ShieldCheck} />
        <SummaryCard title="Systems Active" value={String(c.active)} icon={ShieldCheck} />
        <SummaryCard title="Systems Down" value={String(c.down)} icon={ServerCrash} />
        <SummaryCard title="Warnings" value={String(c.warning)} icon={AlertTriangle} />
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h2 className="font-display font-semibold text-foreground mb-4">Health Snapshot</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map(f => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.lastChecked}</p>
              </div>
              <StatusBadge status={f.status} />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export const ItSystemStatus = () => {
  const [features, setFeatures] = useFeatureState();
  const [view, setView] = useState<SystemFeature | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simFeatureId, setSimFeatureId] = useState(features[0]?.id || '');
  const [simStatus, setSimStatus] = useState<SystemStatus>('Active');
  const c = counts(features);

  const applySim = () => {
    setFeatures(features.map(f => f.id === simFeatureId ? { ...f, status: simStatus, lastChecked: 'just now' } : f));
    setSimOpen(false);
  };

  return (
    <DashboardLayout navItems={itNav} title="System Status">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard title="Total" value={String(features.length)} icon={ShieldCheck} />
        <SummaryCard title="Active" value={String(c.active)} icon={ShieldCheck} />
        <SummaryCard title="Warning" value={String(c.warning)} icon={AlertTriangle} />
        <SummaryCard title="Down" value={String(c.down)} icon={ServerCrash} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground">Monitored Features</h2>
          <Button size="sm" onClick={() => setSimOpen(true)}><Wrench className="h-4 w-4 mr-1" /> Simulate Issue</Button>
        </div>
        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger><TabsTrigger value="warning">Warning</TabsTrigger><TabsTrigger value="down">Down</TabsTrigger></TabsList>
          {['all', 'active', 'warning', 'down'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Status</TableHead><TableHead>Last Checked</TableHead><TableHead>Description</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {features.filter(f => tab === 'all' || f.status.toLowerCase() === tab).map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.name}</TableCell>
                        <TableCell><StatusBadge status={f.status} /></TableCell>
                        <TableCell>{f.lastChecked}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs">{f.description}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => setView(f)}><Eye className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{view?.name}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><span className="text-muted-foreground">Current Status:</span> <StatusBadge status={view.status} /></div>
              <p><span className="text-muted-foreground">Last Downtime:</span> {view.lastDowntime}</p>
              <div>
                <p className="text-muted-foreground mb-1">Affected Modules:</p>
                <div className="flex flex-wrap gap-2">
                  {view.affectedModules.map(m => <span key={m} className="text-xs bg-muted px-2 py-1 rounded-full">{m}</span>)}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Logs:</p>
                <div className="rounded-lg bg-muted p-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
                  {view.logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Simulate Issue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Feature</Label>
              <Select value={simFeatureId} onValueChange={setSimFeatureId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {features.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={simStatus} onValueChange={v => setSimStatus(v as SystemStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Down">Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={applySim}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export const ItLogs = () => {
  const [features] = useFeatureState();
  return (
    <DashboardLayout navItems={itNav} title="System Logs">
      <div className="space-y-4">
        {features.map(f => (
          <div key={f.id} className="bg-card rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">{f.name}</h3>
              <StatusBadge status={f.status} />
            </div>
            <div className="rounded-lg bg-muted p-3 font-mono text-xs space-y-1">
              {f.logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export const ItAlerts = () => {
  const critical = initialAlerts.filter(a => a.severity === 'Critical').length;
  const warning = initialAlerts.filter(a => a.severity === 'Warning').length;
  return (
    <DashboardLayout navItems={itNav} title="System Alerts">
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard title="Critical Issues" value={String(critical)} icon={ServerCrash} />
        <SummaryCard title="Warnings" value={String(warning)} icon={AlertTriangle} />
      </div>
      <div className="bg-card rounded-xl border p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Issue</TableHead><TableHead>Affected Feature</TableHead><TableHead>Severity</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
          <TableBody>
            {initialAlerts.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.issue}</TableCell>
                <TableCell>{a.feature}</TableCell>
                <TableCell><StatusBadge status={a.severity === 'Critical' ? 'Down' : a.severity} /></TableCell>
                <TableCell>{a.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </DashboardLayout>
  );
};