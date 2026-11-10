import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { CheckCircle, LogOut } from 'lucide-react';
import { myAttendanceHistory } from '@/data/workflowData';

const AttendancePanel = () => {
  const [state, setState] = useState<'out' | 'in'>('out');
  const [time, setTime] = useState<string>('—');

  const toggle = () => {
    const now = new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    setTime(now);
    setState(state === 'out' ? 'in' : 'out');
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Today's Status</p>
          <p className="text-xl font-display font-semibold">{state === 'in' ? 'Checked In' : 'Not Checked In'}</p>
          <p className="text-xs text-muted-foreground mt-1">Last action: {time}</p>
        </div>
        <Button onClick={toggle} className={state === 'in' ? 'bg-destructive hover:bg-destructive/90' : ''}>
          {state === 'in' ? (<><LogOut className="h-4 w-4 mr-2" /> Check Out</>) : (<><CheckCircle className="h-4 w-4 mr-2" /> Check In</>)}
        </Button>
      </div>
      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-display font-semibold mb-3">Attendance History</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {myAttendanceHistory.map(r => (
              <TableRow key={r.date}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.checkIn}</TableCell>
                <TableCell>{r.checkOut}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AttendancePanel;
