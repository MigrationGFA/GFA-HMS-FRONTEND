import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, UserCog } from 'lucide-react';

const ProfilePanel = () => {
  const { user } = useAuth();
  const [pwOpen, setPwOpen] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-xl">
            {(user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="font-display font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground capitalize">{user?.role} • GFA HMS</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div>
            <Label className="text-muted-foreground">Full Name</Label>
            <Input value={user?.name || ''} disabled />
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
          <div>
            <Label className="text-muted-foreground">Role</Label>
            <Input value={user?.role || ''} disabled />
          </div>
          <div>
            <Label className="text-muted-foreground">Department</Label>
            <Input defaultValue="Assigned Department" disabled />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <Button variant="outline" onClick={() => setPwOpen(true)}><KeyRound className="h-4 w-4 mr-1" /> Change Password</Button>
          <Button onClick={() => setReqOpen(true)}><UserCog className="h-4 w-4 mr-1" /> Request Profile Change</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Note: name and core details cannot be edited directly. Submit a request to HR for approval.</p>
      </div>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Change Password</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Current Password</Label><Input type="password" defaultValue="********" /></div>
            <div><Label>New Password</Label><Input type="password" defaultValue="********" /></div>
            <div><Label>Confirm Password</Label><Input type="password" defaultValue="********" /></div>
            <Button className="w-full" onClick={() => { setPwOpen(false); toast({ title: 'Password updated' }); }}>Update Password</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Request Profile Change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Field to Change</Label>
              <Select defaultValue="Phone">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Name">Name</SelectItem>
                  <SelectItem value="Phone">Phone Number</SelectItem>
                  <SelectItem value="Address">Address</SelectItem>
                  <SelectItem value="Department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>New Value</Label><Input defaultValue="0809 234 5678" /></div>
            <div><Label>Reason</Label><Textarea defaultValue="Updated my contact number after switching telco." /></div>
            <Button className="w-full" onClick={() => { setReqOpen(false); toast({ title: 'Request submitted', description: 'Sent to HR for approval.' }); }}>Send to HR</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePanel;
