import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LifeBuoy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api/client';
import {
  createSupportRequest,
  isSupportApiEnabled,
  supportModuleFromPath,
  type SupportIssueType,
  type SupportModule,
} from '@/lib/api/support';

type Props = {
  /** Override module derived from the current route */
  module?: SupportModule;
};

const SupportButton = ({ module }: Props) => {
  const [open, setOpen] = useState(false);
  const [issueType, setIssueType] = useState<SupportIssueType>('Technical Issue');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const resolvedModule = module ?? supportModuleFromPath(location.pathname);

  const resetForm = () => {
    setIssueType('Technical Issue');
    setDescription('');
  };

  const onSubmit = async () => {
    const text = description.trim();
    if (text.length < 5) {
      toast({
        title: 'Description required',
        description: 'Please describe the issue (at least 5 characters).',
        variant: 'destructive',
      });
      return;
    }

    if (!isSupportApiEnabled()) {
      toast({
        title: 'API unavailable',
        description: 'Support requests require a live API connection.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSupportRequest({
        issueType,
        description: text,
        module: resolvedModule,
      });
      toast({
        title: 'Support request sent',
        description: `${created.requestNo} — HR will review your request shortly.`,
      });
      resetForm();
      setOpen(false);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to submit support request';
      toast({ title: 'Submit failed', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
        <LifeBuoy className="h-4 w-4" /> Support
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (submitting) return;
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Create Support Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Issue Type</Label>
              <Select
                value={issueType}
                onValueChange={(v) => setIssueType(v as SupportIssueType)}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Profile Change">Profile Change</SelectItem>
                  <SelectItem value="Complaint">Complaint</SelectItem>
                  <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={4}
                disabled={submitting}
              />
            </div>
            <Button className="w-full" onClick={onSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupportButton;
