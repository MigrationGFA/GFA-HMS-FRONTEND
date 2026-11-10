import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Settings2,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  createLabTest,
  isLaboratoryApiEnabled,
  listLabTests,
  updateLabTest,
  type ApiLabTest,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

type Form = {
  testCode: string;
  name: string;
  category: string;
  specimenType: string;
  turnaround: string;
  unitPrice: string;
  container: string;
  loincCode: string;
  lisCode: string;
  department: string;
  description: string;
  status: string;
  isPanel: boolean;
};

const emptyForm = (): Form => ({
  testCode: '',
  name: '',
  category: 'Chemistry',
  specimenType: 'Serum',
  turnaround: '2 hrs',
  unitPrice: '0',
  container: '',
  loincCode: '',
  lisCode: '',
  department: '',
  description: '',
  status: 'Active',
  isPanel: false,
});

export const LabConfig = () => {
  const apiOn = isLaboratoryApiEnabled();
  const [items, setItems] = useState<ApiLabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLabTest | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabTests({ q: q.trim() || undefined, limit: 200 });
      setItems(data.items);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load lab tests';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn, q]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (t: ApiLabTest) => {
    setEditing(t);
    setForm({
      testCode: t.testCode,
      name: t.name,
      category: t.category,
      specimenType: t.specimenType,
      turnaround: t.turnaround,
      unitPrice: String(t.unitPrice),
      container: t.container || '',
      loincCode: t.loincCode || '',
      lisCode: t.lisCode || '',
      department: t.department || '',
      description: t.description || '',
      status: t.status,
      isPanel: t.isPanel,
    });
    setOpen(true);
  };

  const onSave = async () => {
    const price = Number(form.unitPrice);
    if (!form.name.trim() || !form.category.trim() || !form.specimenType.trim() || !form.turnaround.trim()) {
      toast.error('Name, category, specimen type, and turnaround are required');
      return;
    }
    if (!editing && !form.testCode.trim()) {
      toast.error('Test code is required');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      toast.error('Invalid unit price');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateLabTest(editing.labTestId, {
          name: form.name.trim(),
          category: form.category.trim(),
          specimenType: form.specimenType.trim(),
          turnaround: form.turnaround.trim(),
          unitPrice: price,
          container: form.container.trim() || undefined,
          loincCode: form.loincCode.trim() || undefined,
          lisCode: form.lisCode.trim() || undefined,
          department: form.department.trim() || undefined,
          description: form.description.trim() || undefined,
          status: form.status,
          isPanel: form.isPanel,
        });
        toast.success('Test updated');
      } else {
        await createLabTest({
          testCode: form.testCode.trim().toUpperCase(),
          name: form.name.trim(),
          category: form.category.trim(),
          specimenType: form.specimenType.trim(),
          turnaround: form.turnaround.trim(),
          unitPrice: price,
          container: form.container.trim() || undefined,
          loincCode: form.loincCode.trim() || undefined,
          lisCode: form.lisCode.trim() || undefined,
          department: form.department.trim() || undefined,
          description: form.description.trim() || undefined,
          status: form.status,
          isPanel: form.isPanel,
        });
        toast.success('Test created');
      }
      setOpen(false);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LabShell title="Laboratory · Configuration">
      <LabSection
        icon={<Settings2 className="h-5 w-5" />}
        title="Lab test catalog"
        desc="Manage laboratory tests used by walk-in, doctor requests, and billing. Soft-deactivate with Inactive status."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate} disabled={!apiOn}>
              <Plus className="h-3 w-3 mr-1" />Add test
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      <LabCard className="mb-4">
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Search code or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={() => void load()}>Search</Button>
        </div>
      </LabCard>

      <LabCard>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No tests found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>LIS</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Specimen</TableHead>
                <TableHead>TAT</TableHead>
                <TableHead>Price (₦)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((t) => (
                <TableRow key={t.labTestId}>
                  <TableCell className="font-medium">{t.testCode}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.lisCode || t.loincCode || '—'}</TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-xs">{t.department || '—'}</TableCell>
                  <TableCell>{t.specimenType}</TableCell>
                  <TableCell>{t.turnaround}</TableCell>
                  <TableCell>{t.unitPrice.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={t.status === 'Active' ? labTone('green') : labTone('')}
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.testCode}` : 'Create lab test'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update catalog metadata. Test code cannot be changed.' : 'Add a new test to the laboratory catalog.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {!editing && (
              <div className="space-y-1.5"><Label>Code</Label>
                <Input value={form.testCode} onChange={(e) => setForm((f) => ({ ...f, testCode: e.target.value }))} />
              </div>
            )}
            <div className={`space-y-1.5 ${editing ? 'col-span-2' : ''}`}><Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Specimen type</Label>
              <Input value={form.specimenType} onChange={(e) => setForm((f) => ({ ...f, specimenType: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Turnaround</Label>
              <Input value={form.turnaround} onChange={(e) => setForm((f) => ({ ...f, turnaround: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Unit price (₦)</Label>
              <Input type="number" min={0} value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Container</Label>
              <Input value={form.container} onChange={(e) => setForm((f) => ({ ...f, container: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>LOINC</Label>
              <Input value={form.loincCode} onChange={(e) => setForm((f) => ({ ...f, loincCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>LIS code</Label>
              <Input value={form.lisCode} onChange={(e) => setForm((f) => ({ ...f, lisCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="space-y-1.5 col-span-2"><Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onSave()}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabConfig;
