import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { stockStatus, type InventoryItem } from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro } from './shared';

export function DentalInventory() {
  const { state, today, adjustStock } = useDental();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(params.get('stock') ?? 'all');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState('Stock count');

  const rows = useMemo(() => state.inventory.filter((item) => {
    const status = stockStatus(item, today);
    if (filter === 'attention' && !['Low stock', 'Out of stock', 'Expiring soon', 'Expired'].includes(status)) return false;
    if (filter === 'low' && status !== 'Low stock') return false;
    if (filter === 'out' && status !== 'Out of stock') return false;
    if (filter === 'expiry' && status !== 'Expiring soon' && status !== 'Expired') return false;
    return `${item.name} ${item.code} ${item.category}`.toLowerCase().includes(q.trim().toLowerCase());
  }), [state.inventory, q, filter, today]);

  const save = () => {
    if (!selected) return;
    const result = adjustStock(selected.id, qty);
    if (!result.ok) {
      notify.error('stock', result.message);
      return;
    }
    notify.success('stock', `${selected.name} quantity set to ${qty}. Reason: ${reason || 'adjustment'}.`);
    setSelected(null);
  };

  return (
    <DentalShell title="Inventory">
      <PageIntro title="Dental inventory" description="Demonstration stock for clinic materials. Adjustments do not run a full inventory ledger." />
      <DemoBanner />
      <div className="flex flex-wrap gap-2 mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item or code" className="max-w-xs" />
        {[
          ['all', 'All'],
          ['attention', 'Needs attention'],
          ['low', 'Low stock'],
          ['out', 'Out of stock'],
          ['expiry', 'Expiry'],
        ].map(([key, label]) => (
          <Button key={key} size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>{label}</Button>
        ))}
      </div>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Reorder</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <EmptyRow colSpan={9} label="No items match this filter." />}
            {rows.map((item) => {
              const status = stockStatus(item, today);
              return (
                <TableRow key={item.id} className={status === 'Out of stock' || status === 'Expired' ? 'bg-rose-50/60' : status === 'Low stock' || status === 'Expiring soon' ? 'bg-amber-50/60' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>{item.reorderLevel}</TableCell>
                  <TableCell>{item.expiry || '—'}</TableCell>
                  <TableCell>{item.location}</TableCell>
                  <TableCell><DentalStatus status={status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelected(item); setQty(item.quantity); setReason('Stock count'); }}>Adjust</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selected && (
        <div className="mt-4 rounded-xl border bg-card p-4 max-w-md space-y-2">
          <h3 className="font-semibold">Adjust {selected.name}</h3>
          <Label>Quantity on hand</Label>
          <Input type="number" min={0} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          <Label>Reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={save}>Save adjustment</Button>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </DentalShell>
  );
}
