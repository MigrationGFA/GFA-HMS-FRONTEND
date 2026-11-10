import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { studentCourses, studentPayments, formatCurrency } from '@/data/dummyData';
import { BookOpen, CreditCard, AlertCircle, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const studentNav = [
  { label: 'Dashboard', path: '/dashboard/student', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Courses', path: '/dashboard/student/courses', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Payments', path: '/dashboard/student/payments', icon: <CreditCard className="h-4 w-4" /> },
];

const myPayments = studentPayments.filter(p => p.studentName === 'Chioma Okafor');
const paidTotal = myPayments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
const pendingTotal = myPayments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

export const StudentDashboard = () => (
  <DashboardLayout navItems={studentNav} title="Student Dashboard">
    <div className="grid sm:grid-cols-3 gap-4 mb-6">
      <SummaryCard title="Courses" value={String(studentCourses.length)} icon={BookOpen} />
      <SummaryCard title="Paid Fees" value={formatCurrency(paidTotal)} icon={CreditCard} />
      <SummaryCard title="Pending Fees" value={formatCurrency(pendingTotal)} icon={AlertCircle} />
    </div>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Current Courses</h3>
        <div className="space-y-2">
          {studentCourses.filter(c => c.status === 'Enrolled').map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div><p className="text-sm font-medium text-foreground">{c.name}</p><p className="text-xs text-muted-foreground">{c.code} • {c.semester}</p></div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Pending Payments</h3>
        <div className="space-y-2">
          {myPayments.filter(p => p.status === 'Pending').map(p => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div><p className="text-sm font-medium text-foreground">{p.description}</p><p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p></div>
              <StatusBadge status={p.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  </DashboardLayout>
);

export const StudentCourses = () => (
  <DashboardLayout navItems={studentNav} title="My Courses">
    <div className="bg-card rounded-xl border p-4">
      <Tabs defaultValue="all">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="enrolled">Enrolled</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>
        {['all', 'enrolled', 'completed'].map(tab => (
          <TabsContent key={tab} value={tab}>
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Course</TableHead><TableHead>Semester</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {studentCourses.filter(c => tab === 'all' || c.status.toLowerCase() === tab).map(c => (
                  <TableRow key={c.id}><TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.semester}</TableCell><TableCell><StatusBadge status={c.status} /></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </DashboardLayout>
);

export const StudentPayments = () => {
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState('card');

  return (
    <DashboardLayout navItems={studentNav} title="Fee Payments">
      <div className="bg-card rounded-xl border p-4">
        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="paid">Paid</TabsTrigger><TabsTrigger value="pending">Pending</TabsTrigger></TabsList>
          {['all', 'paid', 'pending'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myPayments.filter(p => tab === 'all' || p.status.toLowerCase() === tab).map(p => (
                    <TableRow key={p.id}><TableCell className="font-medium">{p.description}</TableCell><TableCell>{formatCurrency(p.amount)}</TableCell><TableCell>{p.date}</TableCell><TableCell>{p.method || '-'}</TableCell><TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell>{p.status === 'Pending' && <Button size="sm" onClick={() => setPayOpen(true)}>Pay Now</Button>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Pay Fees</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Description</Label><Input defaultValue="Tuition Fee - 2nd Semester" readOnly /></div>
            <div><Label>Amount</Label><Input defaultValue="₦250,000" readOnly /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="remita">Remita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {payMethod === 'card' && <div><Label>Card Number</Label><Input defaultValue="4242 4242 4242 4242" /></div>}
            {payMethod === 'transfer' && (
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">Transfer to:</p>
                <p className="text-sm text-muted-foreground">Bank: GTBank • Account: 0123456789</p>
              </div>
            )}
            {payMethod === 'remita' && <div><Label>RRR</Label><Input defaultValue="123456789012" /></div>}
            <Button className="w-full" onClick={() => setPayOpen(false)}>Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
