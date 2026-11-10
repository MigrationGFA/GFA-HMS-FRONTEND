import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { CalendarDays, Plus } from 'lucide-react';
import { leaveRequests } from '@/data/workflowData';
import { useToast } from '@/hooks/use-toast';

const LeaveRequestPanel = ({ staffName }: { staffName?: string }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const my = leaveRequests.filter(l => !staffName || l.staffName === staffName).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5"><CalendarDays className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="font-display font-semibold">Request Leave</p>
            <p className="text-xs text-muted-foreground">Submit a new leave application</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Request</Button>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">My Leave Requests</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {my.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">No leave requests yet.</TableCell></TableRow>
            ) : my.map(l => (
              <TableRow key={l.id}>
                <TableCell>{l.type}</TableCell>
                <TableCell>{l.startDate}</TableCell>
                <TableCell>{l.endDate}</TableCell>
                <TableCell>{l.days}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Leave Type</Label>
              <Select defaultValue="Casual">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="Study">Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" defaultValue="2026-05-05" /></div>
              <div><Label>End Date</Label><Input type="date" defaultValue="2026-05-09" /></div>
            </div>
            <div><Label>Reason</Label><Textarea defaultValue="Brief description of your leave reason..." /></div>
            <Button className="w-full" onClick={() => { setOpen(false); toast({ title: 'Leave request submitted', description: 'Sent to HR for review.' }); }}>Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveRequestPanel;
