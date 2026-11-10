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
  createFileRequest,
  downloadCsv,
  isRecordsOpsApiEnabled,
  listFileRequests,
  updateFileRequestStatus,
  type FileRequestRow,
} from '@/lib/api/records-ops';
import {
  AlertTriangle, ArrowRight, CheckCircle2, FolderOpen, Loader2, RefreshCw, Search, UserPlus, XCircle,
} from 'lucide-react';

const DEPTS = [
  'General OPD', 'Emergency', 'Ward 3', 'Psychiatry', 'Neurology', 'Records', 'Laboratory', 'Pharmacy',
];

export const MedicalRecordRetrieval = () => {
  const apiOn = isRecordsOpsApiEnabled();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FileRequestRow[]>([]);
  const [kpis, setKpis] = useState({
    today: 0, released: 0, transit: 0, overdue: 0, returned: 0, missing: 0,
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
  const [dept, setDept] = useState('');
  const [reason, setReason] = useState('');
  const [due, setDue] = useState('');
  const [officer, setOfficer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

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
      const res = await listFileRequests({
        status: tab === 'all' ? undefined : tab,
        q: search.trim() || undefined,
        page,
        limit: RECORDS_PAGE_SIZE,
      });
      setItems(res.items);
      setTotal(res.meta?.total ?? res.items.length);
      setKpis({
        today: res.kpis.today,
        released: res.kpis.released,
        transit: res.kpis.transit,
        overdue: res.kpis.overdue,
        returned: res.kpis.returned,
        missing: res.kpis.missing,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load file requests');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [apiOn, tab, search, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (row: FileRequestRow, status: string, note?: string) => {
    setBusyId(row.requestId);
    try {
      await updateFileRequestStatus(row.requestId, { status, note });
      toast.success(`${row.requestNo} → ${status}`);
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  const searchPatients = async () => {
    if (patientQ.trim().length < 2) {
      toast.error('Enter at least 2 characters');
      return;
    }
    setSearchBusy(true);
    try {
      setHits(await searchPersons(patientQ.trim()));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Search failed');
    } finally {
      setSearchBusy(false);
    }
  };

  const submitNew = async () => {
    if (!person || !dept || reason.trim().length < 3) {
      toast.error('Patient, department and reason are required');
      return;
    }
    setSubmitting(true);
    try {
      await createFileRequest({
        personId: person.personId,
        department: dept,
        reason: reason.trim(),
        dueDate: due || undefined,
        requestedBy: officer.trim() || undefined,
      });
      toast.success('File request submitted');
      setNewOpen(false);
      setPerson(null);
      setPatientQ('');
      setHits([]);
      setDept('');
      setReason('');
      setDue('');
      setOfficer('');
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'records-retrieval.csv',
      ['Request', 'Hospital No', 'Patient', 'By', 'Dept', 'Due', 'Status'],
      items.map((r) => [
        r.requestNo,
        r.hospitalNo ?? '',
        r.patientName,
        r.requestedBy,
        r.department,
        r.dueDate ?? '',
        r.status,
      ]),
    );
    toast.success('CSV exported');
  };

  return (
    <DashboardLayout title="Medical Record Retrieval" navItems={recordsNav as any}>
      <p className="text-sm text-muted-foreground mb-4">
        Track request, release, movement and return of patient files.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Total" value={loading ? '…' : String(kpis.today)} icon={FolderOpen} />
        <SummaryCard title="Released" value={loading ? '…' : String(kpis.released)} icon={CheckCircle2} />
        <SummaryCard title="In Transit" value={loading ? '…' : String(kpis.transit)} icon={ArrowRight} />
        <SummaryCard title="Overdue" value={loading ? '…' : String(kpis.overdue)} icon={AlertTriangle} />
        <SummaryCard title="Returned" value={loading ? '…' : String(kpis.returned)} icon={RefreshCw} />
        <SummaryCard title="Missing" value={loading ? '…' : String(kpis.missing)} icon={XCircle} />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search request, officer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
          </div>
          <Button variant="outline" onClick={() => void load()}>Search</Button>
          <Button onClick={() => setNewOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> New Request</Button>
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto">
            {['all', 'Requested', 'Released', 'In Transit', 'Overdue', 'Returned', 'Missing'].map((t) => (
              <TabsTrigger key={t} value={t}>{t === 'all' ? 'All' : t}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} className="mt-3">
            {loading && (
              <div className="flex justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            )}
            {!loading && error && (
              <div className="text-center py-8 space-y-2">
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No file requests in this view.</p>
            )}
            {!loading && !error && items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      {['Request', 'Hospital No', 'Patient', 'By', 'Dept', 'Location', 'Due', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => {
                      const busy = busyId === r.requestId;
                      return (
                        <tr key={r.requestId} className="border-t">
                          <td className="px-3 py-2 font-mono text-xs">{r.requestNo}</td>
                          <td className="px-3 py-2 font-mono text-xs">{r.hospitalNo ?? '—'}</td>
                          <td className="px-3 py-2 font-medium">{r.patientName}</td>
                          <td className="px-3 py-2">{r.requestedBy}</td>
                          <td className="px-3 py-2">{r.department}</td>
                          <td className="px-3 py-2 text-xs">{r.location}</td>
                          <td className="px-3 py-2">{r.dueDate ?? '—'}</td>
                          <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                          <td className="px-3 py-2 whitespace-nowrap space-x-1">
                            {r.status === 'Requested' && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => void setStatus(r, 'Released')}>Release</Button>
                            )}
                            {(r.status === 'Released' || r.status === 'Overdue') && (
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => void setStatus(r, 'In Transit')}>Transit</Button>
                            )}
                            {['Requested', 'Released', 'In Transit', 'Overdue'].includes(r.status) && (
                              <>
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => void setStatus(r, 'Returned')}>Return</Button>
                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void setStatus(r, 'Missing', 'Reported missing')}>Missing</Button>
                              </>
                            )}
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
              label="requests"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={newOpen} onOpenChange={(v) => !submitting && setNewOpen(v)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New File Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Patient</Label>
              <div className="flex gap-2">
                <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="Name or hospital no" />
                <Button variant="outline" disabled={searchBusy} onClick={() => void searchPatients()}>
                  {searchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {person && (
                <p className="text-sm text-emerald-700">
                  {[person.firstName, person.lastName].filter(Boolean).join(' ')} ({person.hospitalNo ?? person.personId})
                </p>
              )}
              {hits.length > 0 && (
                <div className="border rounded max-h-32 overflow-y-auto divide-y">
                  {hits.map((p) => (
                    <button
                      key={p.personId}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => { setPerson(p); setHits([]); }}
                    >
                      {[p.firstName, p.lastName].filter(Boolean).join(' ')} — {p.hospitalNo ?? p.personId}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Requested by (optional)</Label>
              <Input value={officer} onChange={(e) => setOfficer(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Expected return</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={() => void submitNew()}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};
