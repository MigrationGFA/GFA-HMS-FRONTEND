import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { recordsNav } from '@/pages/recordsNav';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';
import { ApiError } from '@/lib/api/client';
import { searchPersons, type PersonRecord } from '@/lib/api/patients';
import {
  createArchive,
  downloadCsv,
  isRecordsOpsApiEnabled,
  listArchives,
  requestArchiveAccess,
  restoreArchive,
  updateArchive,
  type ArchiveRow,
} from '@/lib/api/records-ops';
import { Archive, AlertTriangle, Loader2, Search, UserPlus } from 'lucide-react';

const CATS = ['Inactive', 'Deceased', 'Long-Stay', 'Restricted', 'Legal Hold'] as const;

export const RecordArchive = () => {
  const apiOn = isRecordsOpsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ArchiveRow[]>([]);
  const [kpis, setKpis] = useState({
    archived: 0, inactive: 0, deceased: 0, longStay: 0, dueReview: 0, restricted: 0,
  });
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<PersonRecord[]>([]);
  const [person, setPerson] = useState<PersonRecord | null>(null);
  const [category, setCategory] = useState<string>('Inactive');
  const [access, setAccess] = useState('Standard');
  const [retention, setRetention] = useState('');
  const [dueReview, setDueReview] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

  const [extendRow, setExtendRow] = useState<ArchiveRow | null>(null);
  const [extendUntil, setExtendUntil] = useState('');
  const [extendBusy, setExtendBusy] = useState(false);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Records API is not enabled');
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listArchives({
        category: tab === 'all' ? undefined : tab,
        q: search.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setItems(res.items);
      setKpis(res.kpis);
      setTotal(res.meta?.total ?? res.items.length);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load archives');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab, search, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  useEffect(() => { void load(); }, [load]);

  const searchPatients = async () => {
    if (patientQ.trim().length < 2) return toast.error('Enter at least 2 characters');
    setSearchBusy(true);
    try { setHits(await searchPersons(patientQ.trim())); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Search failed'); }
    finally { setSearchBusy(false); }
  };

  const submitArchive = async () => {
    if (!person) return toast.error('Select a patient');
    setSubmitting(true);
    try {
      await createArchive({
        personId: person.personId,
        category,
        accessLevel: access,
        retentionUntil: retention || undefined,
        dueReviewAt: dueReview || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Record archived');
      setNewOpen(false);
      setPerson(null); setHits([]); setNotes('');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Archive failed');
    } finally { setSubmitting(false); }
  };

  const onRestore = async (row: ArchiveRow) => {
    setBusyId(row.archiveId);
    try {
      await restoreArchive(row.archiveId);
      toast.success(`${row.archiveNo} restored`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Restore failed');
    } finally { setBusyId(null); }
  };

  const onAccess = async (row: ArchiveRow) => {
    setBusyId(row.archiveId);
    try {
      const res = await requestArchiveAccess(row.archiveId, 'Supervisor access requested from Records Archive');
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Access request failed');
    } finally { setBusyId(null); }
  };

  const submitExtend = async () => {
    if (!extendRow || !extendUntil) return toast.error('Pick a retention date');
    setExtendBusy(true);
    try {
      await updateArchive(extendRow.archiveId, { retentionUntil: extendUntil });
      toast.success('Retention extended');
      setExtendRow(null);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Update failed');
    } finally { setExtendBusy(false); }
  };

  return (
    <DashboardLayout title="Record Archive" navItems={recordsNav as any}>
      <p className="text-sm text-muted-foreground mb-4">Inactive, deceased, long-stay and restricted patient files.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Archived" value={loading ? '…' : String(kpis.archived)} icon={Archive} />
        <SummaryCard title="Inactive" value={loading ? '…' : String(kpis.inactive)} icon={Archive} />
        <SummaryCard title="Deceased" value={loading ? '…' : String(kpis.deceased)} icon={Archive} />
        <SummaryCard title="Long-Stay" value={loading ? '…' : String(kpis.longStay)} icon={Archive} />
        <SummaryCard title="Due Review" value={loading ? '…' : String(kpis.dueReview)} icon={AlertTriangle} />
        <SummaryCard title="Restricted" value={loading ? '…' : String(kpis.restricted)} icon={Archive} />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load()} />
          <Button variant="outline" onClick={() => void load()}>Search</Button>
          <Button onClick={() => setNewOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Archive Patient</Button>
          <Button variant="outline" onClick={() => downloadCsv('records-archive.csv', ['Archive', 'Hospital', 'Patient', 'Category', 'Access', 'Status'], items.map((r) => [r.archiveNo, r.hospitalNo ?? '', r.patientName, r.category, r.accessLevel, r.status]))}>Export CSV</Button>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            {CATS.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {loading && <div className="flex justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>}
            {!loading && error && <div className="text-center py-8"><p className="text-destructive text-sm mb-2">{error}</p><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}
            {!loading && !error && items.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No archived records.</p>}
            {!loading && !error && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>{['Archive', 'Hospital No', 'Patient', 'Category', 'Access', 'Archived', 'Retention', 'Status', 'Actions'].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {items.map((r) => {
                      const busy = busyId === r.archiveId;
                      return (
                        <tr key={r.archiveId} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{r.archiveNo}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.hospitalNo ?? '—'}</td>
                          <td className="px-3 py-2 font-medium">{r.patientName}</td>
                          <td className="px-3 py-2">{r.category}</td>
                          <td className="px-3 py-2">{r.accessLevel}</td>
                          <td className="px-3 py-2">{r.archiveDate}</td>
                          <td className="px-3 py-2">{r.retentionUntil ?? '—'}</td>
                          <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                          <td className="px-3 py-2 space-x-1 whitespace-nowrap">
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void onRestore(r)}>Restore</Button>
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => { setExtendRow(r); setExtendUntil(r.retentionUntil ?? ''); }}>Extend</Button>
                            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void onAccess(r)}>Access</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <RecordsListPagination
              page={page}
              pageSize={RECORDS_PAGE_SIZE}
              total={total}
              onPageChange={setPage}
              loading={loading}
              label="archives"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={newOpen} onOpenChange={(v) => !submitting && setNewOpen(v)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive Patient</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="Search patient" />
              <Button variant="outline" disabled={searchBusy} onClick={() => void searchPatients()}>{searchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
            </div>
            {person && <p className="text-sm text-emerald-700">{[person.firstName, person.lastName].filter(Boolean).join(' ')}</p>}
            {hits.length > 0 && (
              <div className="border rounded max-h-28 overflow-y-auto divide-y">
                {hits.map((p) => (
                  <button key={p.personId} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => { setPerson(p); setHits([]); }}>
                    {[p.firstName, p.lastName].filter(Boolean).join(' ')} — {p.hospitalNo ?? p.personId}
                  </button>
                ))}
              </div>
            )}
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Access</Label>
              <Select value={access} onValueChange={setAccess}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Legal Only">Legal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Retention until</Label><Input type="date" value={retention} onChange={(e) => setRetention(e.target.value)} /></div>
            <div><Label>Due review</Label><Input type="date" value={dueReview} onChange={(e) => setDueReview(e.target.value)} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={() => void submitArchive()}>{submitting ? 'Saving…' : 'Archive'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!extendRow} onOpenChange={(v) => !extendBusy && !v && setExtendRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extend retention — {extendRow?.archiveNo}</DialogTitle></DialogHeader>
          <Input type="date" value={extendUntil} onChange={(e) => setExtendUntil(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" disabled={extendBusy} onClick={() => setExtendRow(null)}>Cancel</Button>
            <Button disabled={extendBusy} onClick={() => void submitExtend()}>{extendBusy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
