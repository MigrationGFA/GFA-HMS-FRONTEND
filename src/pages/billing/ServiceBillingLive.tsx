import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/data/dummyData';
import {
  approveService,
  createMasterService,
  isBillingServicesApiEnabled,
  listMasterServices,
  listServiceCategories,
  listServiceDepartments,
  listServicePayers,
  rejectService,
  setServicePricing,
  updateMasterService,
  type MasterService,
  type ServiceCategory,
  type ServiceDepartment,
  type ServicePayer,
} from '@/lib/api/billing-services';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CREATE_ROLES: UserRole[] = [
  'superadmin',
  'admin',
  'cmd',
  'lab',
  'radiology',
];
const PRICE_ROLES: UserRole[] = ['superadmin', 'admin', 'cmd', 'finance'];
const APPROVE_ROLES: UserRole[] = ['superadmin', 'admin', 'cmd', 'it'];

function ngn(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return `₦${Number(n).toLocaleString()}`;
}

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'default' as const;
    case 'PENDING_APPROVAL':
      return 'secondary' as const;
    case 'PENDING_PRICING':
    case 'DRAFT':
      return 'outline' as const;
    case 'REJECTED':
    case 'INACTIVE':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

type Props = {
  Shell: React.ComponentType<{ title: string; children: React.ReactNode }>;
  Section: React.ComponentType<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    action?: React.ReactNode;
  }>;
  Card: React.ComponentType<{ children: React.ReactNode; className?: string }>;
  mockFallback: React.ReactNode;
};

export default function ServiceBillingLive({
  Shell,
  Section,
  Card,
  mockFallback,
}: Props) {
  const apiOn = isBillingServicesApiEnabled();
  const { user } = useAuth();
  const role = user?.role;

  const canCreate = !!role && CREATE_ROLES.includes(role);
  const canPrice = !!role && PRICE_ROLES.includes(role);
  const canApprove = !!role && APPROVE_ROLES.includes(role);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MasterService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [departments, setDepartments] = useState<ServiceDepartment[]>([]);
  const [payers, setPayers] = useState<ServicePayer[]>([]);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [capacityOpen, setCapacityOpen] = useState(false);
  const [selected, setSelected] = useState<MasterService | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    categoryId: '',
    departmentId: '',
    description: '',
    durationMinutes: '30',
    onlineBookable: false,
    deliveryMode: 'PHYSICAL' as 'PHYSICAL' | 'ONLINE' | 'BOTH',
    dayStart: '08:00',
    dayEnd: '17:00',
    staffPoolSize: '1',
    onlineSlotLimit: '1',
    appointmentRequired: true,
  });

  const [priceForm, setPriceForm] = useState({
    generalPrice: '',
    staffPrice: '',
    nhiaAmount: '',
    nhiaPayerId: '',
  });

  const [capacityForm, setCapacityForm] = useState({
    onlineBookable: true,
    deliveryMode: 'BOTH' as 'PHYSICAL' | 'ONLINE' | 'BOTH',
    durationMinutes: '30',
    dayStart: '08:00',
    dayEnd: '17:00',
    staffPoolSize: '1',
    onlineSlotLimit: '1',
  });

  const openCapacity = (svc: MasterService) => {
    setSelected(svc);
    setCapacityForm({
      onlineBookable: svc.onlineBookable,
      deliveryMode: (svc.bookingSettings?.deliveryMode as 'PHYSICAL' | 'ONLINE' | 'BOTH') || 'BOTH',
      durationMinutes: String(svc.bookingSettings?.durationMinutes ?? svc.durationMinutes ?? 30),
      dayStart: svc.bookingSettings?.dayStart ?? '08:00',
      dayEnd: svc.bookingSettings?.dayEnd ?? '17:00',
      staffPoolSize: String(svc.bookingSettings?.staffPoolSize ?? 1),
      onlineSlotLimit: String(svc.bookingSettings?.onlineSlotLimit ?? 1),
    });
    setCapacityOpen(true);
  };

  const handleCapacitySave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateMasterService(selected.serviceId, {
        onlineBookable: capacityForm.onlineBookable,
        deliveryMode: capacityForm.deliveryMode,
        durationMinutes: Number(capacityForm.durationMinutes) || 30,
        dayStart: capacityForm.dayStart,
        dayEnd: capacityForm.dayEnd,
        staffPoolSize: Math.max(1, Number(capacityForm.staffPoolSize) || 1),
        onlineSlotLimit: Math.max(1, Number(capacityForm.onlineSlotLimit) || 1),
      });
      toast.success('Online booking capacity updated');
      setCapacityOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    setError(null);
    try {
      const [svc, cats, depts] = await Promise.all([
        listMasterServices({
          status: statusFilter === 'all' ? undefined : statusFilter,
          categoryId:
            categoryFilter === 'all' ? undefined : Number(categoryFilter),
          departmentId: deptFilter === 'all' ? undefined : Number(deptFilter),
          q: q.trim() || undefined,
          page: 1,
          limit: 200,
        }),
        listServiceCategories(),
        listServiceDepartments({ status: 'Active' }),
      ]);
      setItems(svc.items);
      setCategories(cats.items);
      setDepartments(depts.items);

      if (canPrice) {
        try {
          const p = await listServicePayers({ status: 'Active' });
          setPayers(p.items);
        } catch {
          setPayers([]);
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : 'Failed to load service catalog';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiOn, statusFilter, categoryFilter, deptFilter, q, canPrice]);

  useEffect(() => {
    void load();
  }, [load]);

  const nhiaPayer = useMemo(
    () => payers.find((p) => p.payerType === 'NHIA') ?? payers[0],
    [payers],
  );

  if (!apiOn) {
    return <>{mockFallback}</>;
  }

  const openPrice = (svc: MasterService) => {
    setSelected(svc);
    const existingNhia = svc.payerPrices.find((p) => p.payerType === 'NHIA');
    setPriceForm({
      generalPrice:
        svc.generalPrice != null ? String(svc.generalPrice) : '',
      staffPrice: svc.staffPrice != null ? String(svc.staffPrice) : '',
      nhiaAmount:
        existingNhia != null ? String(existingNhia.amount) : '',
      nhiaPayerId: String(
        existingNhia?.payerId ?? nhiaPayer?.payerId ?? '',
      ),
    });
    setPriceOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.categoryId || !createForm.departmentId) {
      toast.error('Name, category and department are required');
      return;
    }
    setSaving(true);
    try {
      if (createForm.onlineBookable && !createForm.durationMinutes) {
        toast.error('Duration (minutes) is required for online-bookable services');
        setSaving(false);
        return;
      }
      await createMasterService({
        name: createForm.name.trim(),
        categoryId: Number(createForm.categoryId),
        departmentId: Number(createForm.departmentId),
        description: createForm.description.trim() || undefined,
        durationMinutes: createForm.durationMinutes
          ? Number(createForm.durationMinutes)
          : 30,
        onlineBookable: createForm.onlineBookable,
        deliveryMode: createForm.deliveryMode,
        dayStart: createForm.dayStart || '08:00',
        dayEnd: createForm.dayEnd || '17:00',
        staffPoolSize: Math.max(1, Number(createForm.staffPoolSize) || 1),
        onlineSlotLimit: Math.max(1, Number(createForm.onlineSlotLimit) || 1),
        appointmentRequired: createForm.appointmentRequired,
      });
      toast.success('Service created — awaiting finance pricing');
      setCreateOpen(false);
      setCreateForm({
        name: '',
        categoryId: '',
        departmentId: '',
        description: '',
        durationMinutes: '30',
        onlineBookable: false,
        deliveryMode: 'PHYSICAL',
        dayStart: '08:00',
        dayEnd: '17:00',
        staffPoolSize: '1',
        onlineSlotLimit: '1',
        appointmentRequired: true,
      });
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePrice = async () => {
    if (!selected) return;
    const general = Number(priceForm.generalPrice);
    if (!Number.isFinite(general) || general < 0) {
      toast.error('Enter a valid general (cash) price');
      return;
    }
    const staffRaw = priceForm.staffPrice.trim();
    const staff = staffRaw === '' ? null : Number(staffRaw);
    if (staff != null && (!Number.isFinite(staff) || staff < 0)) {
      toast.error('Staff price is invalid');
      return;
    }

    const payerPrices: Array<{ payerId: number; amount: number }> = [];
    if (priceForm.nhiaAmount.trim() && priceForm.nhiaPayerId) {
      const amount = Number(priceForm.nhiaAmount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error('NHIA amount is invalid');
        return;
      }
      payerPrices.push({ payerId: Number(priceForm.nhiaPayerId), amount });
    }

    setSaving(true);
    try {
      await setServicePricing(selected.serviceId, {
        generalPrice: general,
        staffPrice: staff,
        payerPrices: payerPrices.length ? payerPrices : undefined,
        submitForApproval: true,
      });
      toast.success('Pricing saved — pending IT approval');
      setPriceOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Pricing failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (svc: MasterService) => {
    setSaving(true);
    try {
      await approveService(svc.serviceId);
      toast.success(`${svc.name} approved (ACTIVE)`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Approve failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (svc: MasterService) => {
    setSaving(true);
    try {
      await rejectService(svc.serviceId, 'Rejected from Service Billing UI');
      toast.success(`${svc.name} rejected`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Reject failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title="Service Billing">
      <Section
        icon={<RefreshCw className="h-5 w-5" />}
        title="Service Billing Engine"
        desc="Master Service Catalog — department create → finance price → IT approve. ACTIVE services are orderable and bookable when flagged."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            {canCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Service
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Search name or code…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING_PRICING">Pending pricing</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending approval</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.departmentId} value={String(d.departmentId)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading service catalog…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
            <Button size="sm" variant="outline" className="ml-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No services match these filters.
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Mins</TableHead>
                <TableHead className="text-right">General</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.serviceId}>
                  <TableCell className="font-mono text-xs">{s.serviceCode}</TableCell>
                  <TableCell className="font-semibold">
                    {s.name}
                    {s.onlineBookable && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Online
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.categoryName}</Badge>
                  </TableCell>
                  <TableCell>{s.departmentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {s.bookingSettings?.deliveryMode ??
                        (s.onlineBookable ? 'BOTH' : 'PHYSICAL')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.bookingSettings?.durationMinutes ??
                      s.durationMinutes ??
                      '—'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {ngn(s.generalPrice)}
                  </TableCell>
                  <TableCell className="text-right">{ngn(s.staffPrice)}</TableCell>
                  <TableCell>
                    <Badge variant={statusTone(s.status)}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {canCreate && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => openCapacity(s)}
                          >
                            Capacity
                          </Button>
                        )}
                      {canPrice &&
                        ['PENDING_PRICING', 'DRAFT', 'REJECTED', 'ACTIVE', 'PENDING_APPROVAL'].includes(
                          s.status,
                        ) && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => openPrice(s)}
                          >
                            Price
                          </Button>
                        )}
                      {canApprove && s.status === 'PENDING_APPROVAL' && (
                        <>
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleApprove(s)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => void handleReject(s)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create service (no prices)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category *</Label>
                <Select
                  value={createForm.categoryId}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, categoryId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.categoryId} value={String(c.categoryId)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department *</Label>
                <Select
                  value={createForm.departmentId}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, departmentId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem
                        key={d.departmentId}
                        value={String(d.departmentId)}
                      >
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (minutes){createForm.onlineBookable ? ' *' : ''}</Label>
                <Input
                  type="number"
                  min={1}
                  value={createForm.durationMinutes}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      durationMinutes: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Delivery mode</Label>
                <Select
                  value={createForm.deliveryMode}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      deliveryMode: v as 'PHYSICAL' | 'ONLINE' | 'BOTH',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHYSICAL">Physical (in hospital)</SelectItem>
                    <SelectItem value="ONLINE">Online only</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Online bookable</div>
                <div className="text-xs text-muted-foreground">
                  Show on public /appointment when ACTIVE
                </div>
              </div>
              <Switch
                checked={createForm.onlineBookable}
                onCheckedChange={(v) =>
                  setCreateForm((f) => ({
                    ...f,
                    onlineBookable: v,
                    deliveryMode: v && f.deliveryMode === 'PHYSICAL' ? 'BOTH' : f.deliveryMode,
                  }))
                }
              />
            </div>
            {createForm.onlineBookable && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="text-xs font-semibold text-foreground">Online booking capacity</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Day start</Label>
                    <Input
                      type="time"
                      value={createForm.dayStart}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, dayStart: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Day end</Label>
                    <Input
                      type="time"
                      value={createForm.dayEnd}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, dayEnd: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Staff pool size</Label>
                    <Input
                      type="number"
                      min={1}
                      value={createForm.staffPoolSize}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, staffPoolSize: e.target.value }))
                      }
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Clinicians who can attend this service (not shown publicly)
                    </p>
                  </div>
                  <div>
                    <Label>Online slot limit</Label>
                    <Input
                      type="number"
                      min={1}
                      value={createForm.onlineSlotLimit}
                      onChange={(e) =>
                        setCreateForm((f) => ({ ...f, onlineSlotLimit: e.target.value }))
                      }
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Max concurrent online bookings per time (rest for walk-ins)
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm font-medium">Appointment required</div>
              <Switch
                checked={createForm.appointmentRequired}
                onCheckedChange={(v) =>
                  setCreateForm((f) => ({ ...f, appointmentRequired: v }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set pricing — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>General (cash) price *</Label>
              <Input
                type="number"
                value={priceForm.generalPrice}
                onChange={(e) =>
                  setPriceForm((f) => ({ ...f, generalPrice: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Staff price</Label>
              <Input
                type="number"
                value={priceForm.staffPrice}
                onChange={(e) =>
                  setPriceForm((f) => ({ ...f, staffPrice: e.target.value }))
                }
              />
            </div>
            {nhiaPayer && (
              <div>
                <Label>NHIA amount ({nhiaPayer.name})</Label>
                <Input
                  type="number"
                  value={priceForm.nhiaAmount}
                  onChange={(e) =>
                    setPriceForm((f) => ({
                      ...f,
                      nhiaAmount: e.target.value,
                      nhiaPayerId: String(nhiaPayer.payerId),
                    }))
                  }
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Saving submits the service for IT approval.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handlePrice()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save &amp; submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={capacityOpen} onOpenChange={setCapacityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Online capacity — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="text-sm font-medium">Online bookable</div>
              <Switch
                checked={capacityForm.onlineBookable}
                onCheckedChange={(v) =>
                  setCapacityForm((f) => ({ ...f, onlineBookable: v }))
                }
              />
            </div>
            <div>
              <Label>Delivery mode</Label>
              <Select
                value={capacityForm.deliveryMode}
                onValueChange={(v) =>
                  setCapacityForm((f) => ({
                    ...f,
                    deliveryMode: v as 'PHYSICAL' | 'ONLINE' | 'BOTH',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICAL">Physical</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacityForm.durationMinutes}
                  onChange={(e) =>
                    setCapacityForm((f) => ({ ...f, durationMinutes: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Staff pool</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacityForm.staffPoolSize}
                  onChange={(e) =>
                    setCapacityForm((f) => ({ ...f, staffPoolSize: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Day start</Label>
                <Input
                  type="time"
                  value={capacityForm.dayStart}
                  onChange={(e) =>
                    setCapacityForm((f) => ({ ...f, dayStart: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Day end</Label>
                <Input
                  type="time"
                  value={capacityForm.dayEnd}
                  onChange={(e) =>
                    setCapacityForm((f) => ({ ...f, dayEnd: e.target.value }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>Online slot limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={capacityForm.onlineSlotLimit}
                  onChange={(e) =>
                    setCapacityForm((f) => ({ ...f, onlineSlotLimit: e.target.value }))
                  }
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Max concurrent online bookings per time window. Keep lower than staff pool so walk-ins remain available.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapacityOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCapacitySave()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save capacity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
