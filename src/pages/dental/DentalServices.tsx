import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { formatCurrency } from '@/data/dummyData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro } from './shared';
import type { DentalService } from '@/data/dentalData';

const blank: Omit<DentalService, 'id'> = {
  name: '',
  category: 'Examination',
  description: '',
  durationMin: 30,
  price: 0,
  active: true,
};

export function DentalServices() {
  const { state, saveService } = useDental();
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Omit<DentalService, 'id'> & { id?: string }>(blank);

  const rows = state.services.filter((s) => `${s.name} ${s.category}`.toLowerCase().includes(q.trim().toLowerCase()));

  const save = () => {
    if (!form.name.trim()) {
      notify.error('service', 'Service name is required.');
      return;
    }
    saveService(form);
    notify.success('service', 'Service catalogue updated in the demonstration data.');
    setForm(blank);
  };

  return (
    <DentalShell title="Services">
      <PageIntro title="Dental services" description="Catalogue used for illustrative fees. Prices are not posted to billing." />
      <DemoBanner />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold">{form.id ? 'Edit service' : 'Add service'}</h3>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Label>Category</Label>
          <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Label>Default duration (minutes)</Label>
          <Input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
          <Label>Illustrative price (₦)</Label>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            {form.id && <Button variant="outline" onClick={() => setForm(blank)}>Cancel</Button>}
          </div>
        </div>
        <div>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services" className="max-w-xs mb-3" />
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && <EmptyRow colSpan={6} label="No services match." />}
                {rows.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">{service.description}</div>
                    </TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell>{service.durationMin} min</TableCell>
                    <TableCell>{formatCurrency(service.price)}</TableCell>
                    <TableCell><DentalStatus status={service.active ? 'Active' : 'Inactive'} /></TableCell>
                    <TableCell className="space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => setForm(service)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => saveService({ ...service, active: !service.active })}>{service.active ? 'Disable' : 'Enable'}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </DentalShell>
  );
}
