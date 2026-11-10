import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill, Plus, Search, Loader2, Boxes, ShieldCheck } from 'lucide-react';
import { drugCatalog } from '@/data/pharmacyData';
import { formatCurrency } from '@/data/dummyData';
import {
  isPharmacyApiEnabled,
  listDrugs, createDrug,
  listSuppliers,
  type ApiSupplier,
} from '@/lib/api/pharmacy';
import { ApiError } from '@/lib/api/client';
import { pharmacyNav, AddDrugDialog } from './PharmacyModule';

/** Row shown in the catalog table — API-backed when enabled, mock fallback. */
interface CatalogRow {
  id: string;
  apiId?: number;
  name: string;
  genericName: string;
  category: string;
  form: string;
  strength: string;
  unit: string;
  unitPrice: number;
  reorderLevel: number;
  supplierName: string;
  stock: number;
  status: string;
  controlled: boolean;
  shelf: string;
}

const errMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError ? e.message : fallback;

const statusTone = (s: string): string => {
  if (s === 'Active') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'Low') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'Out of Stock') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (s === 'Expired') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-muted text-foreground border-border';
};

const CATEGORY_TONES = [
  'border-l-sky-400 bg-sky-50/50',
  'border-l-emerald-400 bg-emerald-50/50',
  'border-l-amber-400 bg-amber-50/50',
  'border-l-violet-400 bg-violet-50/50',
  'border-l-rose-400 bg-rose-50/50',
  'border-l-indigo-400 bg-indigo-50/50',
  'border-l-teal-400 bg-teal-50/50',
  'border-l-orange-400 bg-orange-50/50',
];

const fallbackRows: CatalogRow[] = drugCatalog.map(d => ({
  id: d.id, name: d.name, genericName: d.genericName, category: d.category,
  form: d.form, strength: d.strength, unit: d.unit, unitPrice: d.unitPrice,
  reorderLevel: d.reorderLevel, supplierName: '—', stock: d.stock,
  status: d.status, controlled: d.controlled ?? false, shelf: d.shelf,
}));

export default function PharmacyDrugCatalog() {
  const useApi = isPharmacyApiEnabled();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!useApi) {
      setRows([]);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const [drugs, sup] = await Promise.all([
        listDrugs({ limit: 200 }),
        listSuppliers({ limit: 100 }),
      ]);
      setRows(drugs.items.map(d => ({
        id: String(d.drugId), apiId: d.drugId, name: d.name,
        genericName: d.genericName ?? '—', category: d.category ?? 'Uncategorised',
        form: d.form ?? '—', strength: d.strength ?? '—', unit: d.unit ?? '—',
        unitPrice: d.unitPrice, reorderLevel: d.reorderLevel,
        supplierName: d.supplierName ?? '—', stock: d.stock,
        status: d.stockStatus, controlled: d.controlled, shelf: d.shelf ?? '—',
      })));
      setSuppliers(sup.items);
    } catch (e) {
      toast.error(errMessage(e, 'Could not load drug catalog'));
    } finally {
      setLoading(false);
    }
  }, [useApi]);

  useEffect(() => { void load(); }, [load]);

  /** Category → count, sorted by count descending. */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const list = rows.filter(r => {
    if (category && r.category !== category) return false;
    if (q && !`${r.name} ${r.genericName} ${r.category} ${r.supplierName}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const onCreate = async (input: { name: string; genericName?: string; category?: string; form?: string; strength?: string; unit?: string; unitPrice?: number; reorderLevel?: number; shelf?: string; controlled?: boolean; supplierId?: number }) => {
    if (useApi) {
      try {
        await createDrug(input);
        await load();
        toast.success(`${input.name} added to catalog`, { description: 'Logged to audit trail. Receive stock to add quantities.' });
      } catch (e) { toast.error(errMessage(e, 'Could not add drug')); return false; }
      return true;
    }
    setRows(prev => [{
      id: `DRG${String(prev.length + 1).padStart(3, '0')}`,
      name: input.name, genericName: input.genericName ?? '—',
      category: input.category ?? 'Uncategorised', form: input.form ?? '—',
      strength: input.strength ?? '—', unit: input.unit ?? '—',
      unitPrice: input.unitPrice ?? 0, reorderLevel: input.reorderLevel ?? 0,
      supplierName: '—', stock: 0, status: 'Out of Stock',
      controlled: input.controlled ?? false, shelf: input.shelf ?? '—',
    }, ...prev]);
    await new Promise(r => setTimeout(r, 350));
    toast.success(`${input.name} added to catalog`);
    return true;
  };

  return (
    <DashboardLayout title="Pharmacy · Drug Catalog" navItems={pharmacyNav as any}>
      {/* Header */}
      <div className="hms-section p-5 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Pill className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-display font-bold">Drug Catalog</h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                All drug names registered in the system. Drugs are created here (or on the Inventory page); stock quantities and expiry are added via Receive Stock.
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Drug</Button>
        </div>
      </div>

      {loading && (
        <div className="hms-section p-8 mb-5 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading drug catalog…
        </div>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`hms-section p-4 text-left border-l-4 border-l-primary transition ${category === null ? 'ring-2 ring-primary/40' : 'hover:shadow-md'}`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4 text-primary" /> All Drugs</div>
          <div className="text-2xl font-bold mt-1">{rows.length}</div>
          <div className="text-xs text-muted-foreground">in catalog</div>
        </button>
        {categories.map(([cat, count], i) => (
          <button
            type="button"
            key={cat}
            onClick={() => setCategory(prev => prev === cat ? null : cat)}
            className={`hms-section p-4 text-left border-l-4 ${CATEGORY_TONES[i % CATEGORY_TONES.length]} transition ${category === cat ? 'ring-2 ring-primary/40' : 'hover:shadow-md'}`}
          >
            <div className="text-sm font-semibold truncate" title={cat}>{cat}</div>
            <div className="text-2xl font-bold mt-1">{count}</div>
            <div className="text-xs text-muted-foreground">{count === 1 ? 'drug' : 'drugs'}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="hms-section p-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search drug, generic name, category or supplier" className="pl-9" />
        </div>
        {category && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Filtered by</span>
            <Badge variant="outline">{category}</Badge>
            <Button size="sm" variant="ghost" onClick={() => setCategory(null)}>Clear</Button>
          </div>
        )}
      </div>

      {/* Drug table */}
      <div className="hms-section overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>ID</TableHead><TableHead>Drug Name</TableHead><TableHead>Generic Name</TableHead>
            <TableHead>Category</TableHead><TableHead>Form</TableHead><TableHead>Strength</TableHead>
            <TableHead className="text-right">Unit Price</TableHead><TableHead>Supplier</TableHead>
            <TableHead className="text-right">Stock</TableHead><TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!loading && list.length === 0 && (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {rows.length === 0 ? 'No drugs in the catalog yet. Click "Add Drug" to create the first one.' : 'No drug matches your search.'}
              </TableCell></TableRow>
            )}
            {list.map(d => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.apiId ?? d.id}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {d.name}
                    {d.controlled && <span title="Controlled substance"><ShieldCheck className="h-3.5 w-3.5 text-rose-600" /></span>}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{d.genericName}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{d.category}</Badge></TableCell>
                <TableCell className="text-xs">{d.form}</TableCell>
                <TableCell className="text-xs">{d.strength}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.unitPrice)}</TableCell>
                <TableCell className="text-xs">{d.supplierName}</TableCell>
                <TableCell className="text-right font-semibold">{d.stock}</TableCell>
                <TableCell><Badge className={`border ${statusTone(d.status)}`}>{d.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AddDrugDialog open={addOpen} onOpenChange={setAddOpen} suppliers={suppliers} onCreate={onCreate} />
    </DashboardLayout>
  );
}
