// Reusable laboratory data table with search, filters, sort, pagination,
// sticky headers, horizontal scroll, column visibility, Excel (CSV) + PDF export.

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, Filter, Search, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

export interface LabColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => React.ReactNode;
  // Optional values list -> renders a filter dropdown
  filterOptions?: string[];
}

interface Props<T extends Record<string, any>> {
  rows: T[];
  columns: LabColumn<T>[];
  pageSize?: number;
  searchKeys?: (keyof T & string)[];
  exportName?: string;
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
}

export function LabDataTable<T extends Record<string, any>>({
  rows, columns, pageSize = 10, searchKeys, exportName = 'lab-export', actions, emptyMessage = 'No records found.',
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleCols = columns.filter(c => !hidden.has(c.key));

  const filtered = useMemo(() => {
    let out = rows;
    if (query) {
      const q = query.toLowerCase();
      const keys = searchKeys ?? (columns.map(c => c.key));
      out = out.filter(r => keys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
    }
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== '__all__') out = out.filter(r => String(r[k] ?? '') === v);
    });
    if (sortKey) {
      out = [...out].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        if (av == null) return 1; if (bv == null) return -1;
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return out;
  }, [rows, query, filters, sortKey, sortDir, columns, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toCsvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const exportExcel = () => {
    const header = visibleCols.map(c => c.label).join(',');
    const body = filtered.map(r => visibleCols.map(c => toCsvCell(r[c.key])).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${exportName}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Excel (CSV) exported');
  };
  const exportPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
      doc.setFontSize(14); doc.text(exportName, 40, 40);
      doc.setFontSize(9);
      const colW = (doc.internal.pageSize.getWidth() - 80) / visibleCols.length;
      let y = 70;
      doc.setFont('helvetica', 'bold');
      visibleCols.forEach((c, i) => doc.text(String(c.label), 40 + i * colW, y));
      doc.setFont('helvetica', 'normal');
      y += 16;
      filtered.forEach(r => {
        if (y > 540) { doc.addPage(); y = 40; }
        visibleCols.forEach((c, i) => {
          const txt = doc.splitTextToSize(String(r[c.key] ?? ''), colW - 4);
          doc.text(txt[0] ?? '', 40 + i * colW, y);
        });
        y += 14;
      });
      doc.save(`${exportName}.pdf`);
      toast.success('PDF exported');
    } catch { toast.error('PDF export failed'); }
  };

  return (
    <div className="bg-card border rounded-xl">
      <div className="flex flex-wrap gap-2 items-center p-3 border-b">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
        </div>
        {columns.filter(c => c.filterOptions?.length).map(c => (
          <Select key={c.key} value={filters[c.key] || '__all__'} onValueChange={v => { setFilters(f => ({ ...f, [c.key]: v })); setPage(1); }}>
            <SelectTrigger className="h-9 w-[160px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder={c.label} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {c.label}</SelectItem>
              {c.filterOptions!.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-9"><Settings2 className="h-3 w-3 mr-1" />Columns</Button></PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">Visible columns</div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {columns.map(c => (
                <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={!hidden.has(c.key)} onCheckedChange={(v) => {
                    setHidden(h => { const n = new Set(h); if (v) n.delete(c.key); else n.add(c.key); return n; });
                  }} />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="sm" className="h-9" onClick={exportExcel}><FileSpreadsheet className="h-3 w-3 mr-1" />Excel</Button>
        <Button variant="outline" size="sm" className="h-9" onClick={exportPdf}><Download className="h-3 w-3 mr-1" />PDF</Button>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr>
              {visibleCols.map(c => (
                <th key={c.key} className="text-left px-3 py-2 font-semibold whitespace-nowrap" style={{ width: c.width }}>
                  <button
                    type="button"
                    onClick={() => c.sortable !== false && onSort(c.key)}
                    className={`flex items-center gap-1 ${c.sortable !== false ? 'hover:text-primary' : 'cursor-default'}`}
                  >
                    {c.label}
                    {sortKey === c.key && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
              {actions && <th className="text-right px-3 py-2 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr><td className="px-3 py-10 text-center text-muted-foreground" colSpan={visibleCols.length + (actions ? 1 : 0)}>{emptyMessage}</td></tr>
            )}
            {pageRows.map((r, ix) => (
              <tr key={ix} className="border-t hover:bg-muted/40">
                {visibleCols.map(c => (
                  <td key={c.key} className="px-3 py-2 whitespace-nowrap">
                    {c.render ? c.render(r) : String(r[c.key] ?? '')}
                  </td>
                ))}
                {actions && <td className="px-3 py-2 text-right whitespace-nowrap">{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between p-3 border-t text-xs text-muted-foreground">
        <div>Showing {pageRows.length} of {filtered.length} ({rows.length} total)</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={current === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-3 w-3" /></Button>
          <span>Page {current} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={current === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}
