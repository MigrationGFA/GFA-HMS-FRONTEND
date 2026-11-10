import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackagePlus } from 'lucide-react';
import {
  isPharmacyApiEnabled,
  listPurchaseOrders,
  listReceivableOrders,
} from '@/lib/api/pharmacy';

export type ReceivePOItem = {
  drugId: string;
  drugName: string;
  qty: number;
  unitCost: number;
  qtyReceived?: number;
};

export type ReceivePurchaseOrder = {
  id: string;
  apiId?: number;
  supplier: string;
  items: ReceivePOItem[];
  total: number;
  createdBy: string;
  approval: 'Pending' | 'Approved' | 'Rejected';
  delivery: 'Not Sent' | 'Sent' | 'Partial' | 'Delivered';
  status: string;
  expectedDate: string;
  paymentTerms: string;
  notes?: string;
};

export type ReceiveStockFormInput = {
  po: ReceivePurchaseOrder;
  item: ReceivePOItem;
  batch: string;
  mfg: string;
  exp: string;
  received: number;
  damaged: number;
  receivedBy: string;
  location: string;
};

export const scrollModalClass = 'max-h-[90vh] overflow-y-auto overscroll-contain';

export const dateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '—');
export const monthOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 7) : '—');
/** <input type="month"> gives "YYYY-MM"; API expects a full ISO date. */
export const monthToIso = (m: string) => (m ? `${m}-01` : undefined);

/** Approved POs that still need goods received (including Approved+Not Sent). */
export const isReceivablePo = (p: ReceivePurchaseOrder) =>
  p.approval === 'Approved' &&
  (p.delivery === 'Not Sent' || p.delivery === 'Sent' || p.delivery === 'Partial') &&
  p.status !== 'Cancelled' &&
  p.status !== 'Completed';

export const mapApiPo = (p: {
  poNo: string;
  poId: number;
  supplierName: string;
  items: { drugId: number; drugName: string; qty: number; unitCost: number; qtyReceived: number }[];
  total: number;
  createdBy: string | null;
  approvalStatus: string;
  deliveryStatus: string;
  status: string;
  expectedDate: string | null;
  paymentTerms: string | null;
  notes: string | null;
}): ReceivePurchaseOrder => ({
  id: p.poNo,
  apiId: p.poId,
  supplier: p.supplierName,
  items: p.items.map(i => ({
    drugId: String(i.drugId),
    drugName: i.drugName,
    qty: i.qty,
    unitCost: i.unitCost,
    qtyReceived: i.qtyReceived,
  })),
  total: p.total,
  createdBy: p.createdBy ?? '—',
  approval: p.approvalStatus as ReceivePurchaseOrder['approval'],
  delivery: p.deliveryStatus as ReceivePurchaseOrder['delivery'],
  status: p.status,
  expectedDate: dateOnly(p.expectedDate),
  paymentTerms: p.paymentTerms ?? '—',
  notes: p.notes ?? undefined,
});

/** Mock POs with at least one receivable order for offline/demo mode. */
export const seedReceivePurchaseOrders: ReceivePurchaseOrder[] = [
  {
    id: 'PO-2026-0078',
    supplier: 'Emzor Pharma Ltd',
    items: [{ drugId: 'DRG004', drugName: 'Metformin 500mg', qty: 1500, unitCost: 42 }],
    total: 63000,
    createdBy: 'Pharm. Adewale',
    approval: 'Pending',
    delivery: 'Not Sent',
    status: 'Pending Approval',
    expectedDate: '2026-07-05',
    paymentTerms: '30 days net',
    notes: 'Urgent — diabetes clinic',
  },
  {
    id: 'PO-2026-0077',
    supplier: 'Fidson Healthcare',
    items: [{ drugId: 'DRG002', drugName: 'Amoxicillin 500mg', qty: 800, unitCost: 62 }],
    total: 49600,
    createdBy: 'Pharm. Chioma',
    approval: 'Approved',
    delivery: 'Sent',
    status: 'Sent to Supplier',
    expectedDate: '2026-07-02',
    paymentTerms: '15 days net',
  },
];

export async function loadReceivePurchaseOrders(): Promise<ReceivePurchaseOrder[]> {
  if (!isPharmacyApiEnabled()) {
    throw new Error('Backend API is not configured');
  }
  const [orders, receivable] = await Promise.all([
    listPurchaseOrders({ limit: 100 }),
    listReceivableOrders({ limit: 100 }),
  ]);
  const byId = new Map<number, ReceivePurchaseOrder>();
  for (const p of orders.items) byId.set(p.poId, mapApiPo(p));
  for (const p of receivable.items) byId.set(p.poId, mapApiPo(p));
  return [...byId.values()];
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pos: ReceivePurchaseOrder[];
  initialPoId?: string | null;
  receivedByName: string;
  onReceive: (input: ReceiveStockFormInput) => Promise<boolean>;
};

export function PharmacyReceiveStockModal({
  open,
  onOpenChange,
  pos,
  initialPoId,
  receivedByName,
  onReceive,
}: Props) {
  const [poId, setPoId] = useState('');
  const [drugId, setDrugId] = useState('');
  const [batch, setBatch] = useState('');
  const [mfg, setMfg] = useState('');
  const [exp, setExp] = useState('');
  const [received, setReceived] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [location, setLocation] = useState('A-1');
  const [submitting, setSubmitting] = useState(false);

  const receivable = useMemo(() => pos.filter(isReceivablePo), [pos]);
  const po = receivable.find(p => p.id === poId) ?? pos.find(p => p.id === poId);
  const openItems = useMemo(
    () => (po?.items ?? []).filter(i => (i.qtyReceived ?? 0) < i.qty),
    [po],
  );
  const item = openItems.find(i => i.drugId === drugId) ?? po?.items.find(i => i.drugId === drugId);
  const remaining = item ? Math.max(item.qty - (item.qtyReceived ?? 0), 0) : 0;
  const accepted = Math.max(received - damaged, 0);

  useEffect(() => {
    if (!open) return;
    const target = initialPoId && receivable.some(p => p.id === initialPoId)
      ? initialPoId
      : receivable[0]?.id ?? '';
    setPoId(target);
    const targetPo = receivable.find(p => p.id === target);
    const firstItem = targetPo?.items.find(i => (i.qtyReceived ?? 0) < i.qty) ?? targetPo?.items[0];
    setDrugId(firstItem?.drugId ?? '');
    setReceived(firstItem ? Math.max(firstItem.qty - (firstItem.qtyReceived ?? 0), 0) : 0);
    setDamaged(0);
    setBatch('');
    setMfg('');
    setExp('');
    setLocation('A-1');
  }, [open, initialPoId, receivable]);

  useEffect(() => {
    if (!item) return;
    setReceived(Math.max(item.qty - (item.qtyReceived ?? 0), 0));
  }, [drugId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!po) return toast.error('Select PO');
    if (!item) return toast.error('Pick drug');
    if (!batch) return toast.error('Batch number required');
    if (!received || received <= 0) return toast.error('Enter quantity received');
    if (damaged > received) return toast.error('Damaged cannot exceed received');
    if (accepted > remaining) return toast.error(`Only ${remaining} remaining on this PO line`);
    setSubmitting(true);
    try {
      const ok = await onReceive({
        po,
        item,
        batch,
        mfg,
        exp,
        received,
        damaged,
        receivedBy: receivedByName,
        location,
      });
      if (ok) {
        onOpenChange(false);
        setPoId('');
        setDrugId('');
        setBatch('');
        setMfg('');
        setExp('');
        setReceived(0);
        setDamaged(0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-2xl ${scrollModalClass}`}>
        <DialogHeader>
          <DialogTitle>Receive Stock</DialogTitle>
          <DialogDescription>
            Record goods received against a purchase order. Accepted quantity increases inventory batches.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>PO Number</Label>
            <Select
              value={poId}
              onValueChange={(v) => {
                setPoId(v);
                const next = receivable.find(p => p.id === v);
                const first = next?.items.find(i => (i.qtyReceived ?? 0) < i.qty) ?? next?.items[0];
                setDrugId(first?.drugId ?? '');
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
              <SelectContent>
                {receivable.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No approved POs awaiting delivery. Approve a PO first.
                  </div>
                )}
                {receivable.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.id} · {p.supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Supplier</Label><Input value={po?.supplier ?? ''} readOnly /></div>
          <div>
            <Label>Drug</Label>
            <Select value={drugId} onValueChange={setDrugId}>
              <SelectTrigger><SelectValue placeholder="Drug" /></SelectTrigger>
              <SelectContent>
                {openItems.map(i => (
                  <SelectItem key={i.drugId} value={i.drugId}>
                    {i.drugName} (remaining {Math.max(i.qty - (i.qtyReceived ?? 0), 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Batch Number</Label><Input value={batch} onChange={e => setBatch(e.target.value)} placeholder="BATCH-XXX" /></div>
          <div><Label>Manufacturing Date</Label><Input type="month" value={mfg} onChange={e => setMfg(e.target.value)} /></div>
          <div><Label>Expiry Date</Label><Input type="month" value={exp} onChange={e => setExp(e.target.value)} /></div>
          <div><Label>Quantity Ordered</Label><Input value={String(item?.qty ?? 0)} readOnly /></div>
          <div><Label>Already Received</Label><Input value={String(item?.qtyReceived ?? 0)} readOnly /></div>
          <div><Label>Quantity Received</Label><Input type="number" value={received} onChange={e => setReceived(Number(e.target.value))} /></div>
          <div><Label>Damaged Quantity</Label><Input type="number" value={damaged} onChange={e => setDamaged(Number(e.target.value))} /></div>
          <div><Label>Accepted</Label><Input value={String(accepted)} readOnly className="font-semibold text-emerald-700" /></div>
          <div>
            <Label>Received By</Label>
            <Input value={receivedByName} readOnly disabled className="bg-muted" />
          </div>
          <div><Label>Storage Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
          <div className="col-span-2"><Label>Upload Invoice / Delivery Note</Label><Input type="file" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <LoadingButton loading={submitting} loadingText="Receiving…" onClick={() => void submit()}>
            <PackagePlus className="h-4 w-4 mr-1" />Receive Stock
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
