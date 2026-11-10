import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import SummaryCard from '@/components/SummaryCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, Eye, History as HistoryIcon, Loader2, Plus, Printer, RefreshCw, Send, Truck,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  createLabSpecimen,
  getLabSpecimen,
  isLaboratoryApiEnabled,
  listLabSpecimens,
  searchLabStaff,
  transferLabSpecimen,
  updateLabSpecimenStatus,
  type ApiSpecimen,
} from '@/lib/api/laboratory';
import { LabCard, LabSection, LabShell, labTone } from './LabPageShell';

type Picked = { personId: number; name: string; hospitalNo: string };
type StaffPick = { userId: number; label: string };

function statusTone(s: string) {
  if (s === 'Received' || s === 'Completed') return 'green';
  if (s === 'Rejected' || s === 'Lost') return 'rose';
  if (s === 'Delayed') return 'amber';
  if (s === 'In Transit') return 'sky';
  return '';
}

export const SpecimenTrackingCenter = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();
  const [rows, setRows] = useState<ApiSpecimen[]>([]);
  const [kpis, setKpis] = useState({
    total: 0, transit: 0, received: 0, rejected: 0, lost: 0, delayed: 0, completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [patientQ, setPatientQ] = useState('');
  const [hits, setHits] = useState<Picked[]>([]);
  const [patient, setPatient] = useState<Picked | null>(null);
  const [testLabel, setTestLabel] = useState('');
  const [location, setLocation] = useState('Reception');

  const [view, setView] = useState<ApiSpecimen | null>(null);
  const [transfer, setTransfer] = useState<ApiSpecimen | null>(null);
  const [history, setHistory] = useState<ApiSpecimen | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [tForm, setTForm] = useState({ to: '', reason: '', staff: '' });
  const [staffQ, setStaffQ] = useState('');
  const [staffHits, setStaffHits] = useState<StaffPick[]>([]);
  const [staffPick, setStaffPick] = useState<StaffPick | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listLabSpecimens({ limit: 100 });
      setRows(data.items);
      setKpis(data.kpis);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load specimens';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!patientsOn || patientQ.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchPersons(patientQ.trim())
        .then((list) => {
          if (cancelled) return;
          setHits(
            list.slice(0, 8).map((r) => ({
              personId: r.personId,
              name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
              hospitalNo: r.hospitalNo || `PID-${r.personId}`,
            })),
          );
        })
        .catch(() => { if (!cancelled) setHits([]); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [patientQ, patientsOn]);

  useEffect(() => {
    if (!transfer || !apiOn || staffQ.trim().length < 2 || staffPick) {
      if (staffQ.trim().length < 2) setStaffHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchLabStaff({ q: staffQ.trim(), limit: 20 })
        .then((data) => {
          if (cancelled) return;
          setStaffHits(
            data.items.slice(0, 12).map((u) => ({
              userId: u.userId,
              label: `${u.name}${u.role ? ` · ${u.role}` : ''}`,
            })),
          );
        })
        .catch(() => { if (!cancelled) setStaffHits([]); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [staffQ, transfer, apiOn, staffPick]);

  const openDetail = async (id: number, mode: 'view' | 'history') => {
    try {
      const s = await getLabSpecimen(id);
      if (mode === 'view') {
        setView(s);
        setRejectOpen(false);
        setRejectReason('');
      } else setHistory(s);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Load failed');
    }
  };

  const openTransfer = (r: ApiSpecimen) => {
    setTransfer(r);
    setTForm({ to: '', reason: '', staff: '' });
    setStaffQ('');
    setStaffHits([]);
    setStaffPick(null);
  };

  const onRegister = async () => {
    if (!patient || !testLabel.trim()) {
      toast.error('Patient and test label are required');
      return;
    }
    setBusy(true);
    try {
      await createLabSpecimen({
        personId: patient.personId,
        testLabel: testLabel.trim(),
        location: location.trim() || 'Reception',
      });
      toast.success('Specimen registered');
      setRegisterOpen(false);
      setPatient(null);
      setTestLabel('');
      setLocation('Reception');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Register failed');
    } finally {
      setBusy(false);
    }
  };

  const doTransfer = async () => {
    if (!transfer || !tForm.to.trim()) {
      toast.error('Destination is required');
      return;
    }
    const staff = staffPick?.label || tForm.staff.trim();
    setBusy(true);
    try {
      await transferLabSpecimen(transfer.specimenId, {
        toLocation: tForm.to.trim(),
        reason: tForm.reason.trim() || undefined,
        staffLabel: staff || undefined,
      });
      toast.success('Transferred');
      setTransfer(null);
      setTForm({ to: '', reason: '', staff: '' });
      setStaffPick(null);
      setStaffQ('');
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Transfer failed');
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!view) return;
    if (!rejectReason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setBusy(true);
    try {
      const updated = await updateLabSpecimenStatus(view.specimenId, {
        status: 'Rejected',
        reason: rejectReason.trim(),
      });
      toast.success('Specimen rejected');
      setRejectOpen(false);
      setRejectReason('');
      setView(updated);
      void load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  const printBarcode = (r: ApiSpecimen) => {
    const w = window.open('', '_blank');
    if (!w) { toast.error('Pop-up blocked'); return; }
    w.document.write(
      `<html><body style="font-family:monospace;text-align:center;padding:40px"><h2>GFA HMS LIS</h2><div style="font-size:48px;letter-spacing:6px">||||| |||| | ||||| |||</div><div style="margin-top:8px">${r.specimenNo}</div><div>${r.patientName} — ${r.testLabel}</div></body></html>`,
    );
    w.document.close();
    w.print();
    toast.success('Barcode sent to printer');
  };

  return (
    <LabShell title="Specimen Tracking">
      <LabSection
        icon={<Truck className="h-5 w-5" />}
        title="Specimen Tracking Center"
        desc="Track every specimen from collection to final disposal across the laboratory chain of custody."
        action={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Register Specimen
            </Button>
          </div>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50 text-rose-900 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />{error}
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard title="Total" value={loading ? '…' : String(kpis.total)} icon={Boxes} />
        <SummaryCard title="In Transit" value={loading ? '…' : String(kpis.transit)} icon={Truck} />
        <SummaryCard title="Received" value={loading ? '…' : String(kpis.received)} icon={CheckCircle2} />
        <SummaryCard title="Rejected" value={loading ? '…' : String(kpis.rejected)} icon={AlertTriangle} />
        <SummaryCard title="Lost" value={loading ? '…' : String(kpis.lost)} icon={AlertTriangle} />
        <SummaryCard title="Delayed" value={loading ? '…' : String(kpis.delayed)} icon={AlertTriangle} />
        <SummaryCard title="Completed" value={loading ? '…' : String(kpis.completed)} icon={ClipboardCheck} />
      </div>

      <LabCard>
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-10 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading specimens…
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">No specimens tracked yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Specimen ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>TAT</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.specimenId}>
                  <TableCell className="font-mono text-xs">{r.specimenNo}</TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell>{r.testLabel}</TableCell>
                  <TableCell>{r.collectedBy || '—'}</TableCell>
                  <TableCell>{r.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={labTone(statusTone(r.status))}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.tatLabel || '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="View" onClick={() => void openDetail(r.specimenId, 'view')}>
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Transfer" onClick={() => openTransfer(r)}>
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="History" onClick={() => void openDetail(r.specimenId, 'history')}>
                      <HistoryIcon className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Print barcode" onClick={() => printBarcode(r)}>
                      <Printer className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </LabCard>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Specimen</DialogTitle>
            <DialogDescription>Link specimen tracking to a registered patient.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient</Label>
              <Input value={patientQ} onChange={(e) => setPatientQ(e.target.value)} placeholder="Search…" />
              {patient && <p className="text-xs text-emerald-700 mt-1">{patient.name}</p>}
              <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y">
                {hits.map((p) => (
                  <button key={p.personId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40"
                    onClick={() => { setPatient(p); setPatientQ(''); setHits([]); }}>
                    {p.name} · {p.hospitalNo}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Test</Label><Input value={testLabel} onChange={(e) => setTestLabel(e.target.value)} placeholder="FBC / Urine MCS…" /></div>
            <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onRegister()}>Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!transfer} onOpenChange={(o) => !o && setTransfer(null)}>
        <DialogContent>
          {transfer && (
            <>
              <DialogHeader>
                <DialogTitle>Transfer · {transfer.specimenNo}</DialogTitle>
                <DialogDescription>From {transfer.location}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div>
                  <Label>To location</Label>
                  <Input value={tForm.to} onChange={(e) => setTForm({ ...tForm, to: e.target.value })} />
                </div>
                <div className="relative">
                  <Label>Staff</Label>
                  <Input
                    value={staffPick ? staffPick.label : staffQ}
                    onChange={(e) => {
                      setStaffPick(null);
                      setStaffQ(e.target.value);
                      setTForm({ ...tForm, staff: e.target.value });
                    }}
                    placeholder="Search staff by name…"
                  />
                  {staffHits.length > 0 && !staffPick && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow-md max-h-40 overflow-auto">
                      {staffHits.map((s) => (
                        <button
                          key={s.userId}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => {
                            setStaffPick(s);
                            setStaffQ('');
                            setStaffHits([]);
                            setTForm({ ...tForm, staff: s.label });
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {staffPick && (
                    <p className="text-xs text-emerald-700 mt-1">Selected: {staffPick.label}</p>
                  )}
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input value={tForm.reason} onChange={(e) => setTForm({ ...tForm, reason: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTransfer(null)}>Cancel</Button>
                <Button disabled={busy} onClick={() => void doTransfer()}>Transfer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => { if (!o) { setView(null); setRejectOpen(false); setRejectReason(''); } }}>
        <DialogContent>
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.specimenNo}</DialogTitle>
                <DialogDescription>{view.patientName} · {view.testLabel}</DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-1">
                <div>Status: <Badge variant="outline" className={labTone(statusTone(view.status))}>{view.status}</Badge></div>
                <div>Location: {view.location}</div>
                <div>Collected by: {view.collectedBy || '—'}</div>
                <div>TAT: {view.tatLabel || '—'}</div>
              </div>

              {rejectOpen ? (
                <div className="space-y-3 border-t pt-3 mt-2">
                  <p className="text-sm font-medium text-rose-700">Reject this specimen?</p>
                  <p className="text-xs text-muted-foreground">
                    This marks the specimen as Rejected and records a chain-of-custody event. Enter a reason to continue.
                  </p>
                  <div>
                    <Label>Rejection reason</Label>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Clotted sample / Wrong container / Insufficient volume"
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectReason(''); }}>
                      Cancel
                    </Button>
                    <Button variant="destructive" disabled={busy} onClick={() => void doReject()}>
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Confirm reject
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <DialogFooter className="sm:justify-between gap-2">
                  <div>
                    {view.status !== 'Rejected' && view.status !== 'Completed' && (
                      <Button
                        variant="outline"
                        className="text-rose-700 border-rose-200"
                        onClick={() => setRejectOpen(true)}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />Reject specimen
                      </Button>
                    )}
                  </div>
                  <Button variant="outline" onClick={() => setView(null)}>Close</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent>
          {history && (
            <>
              <DialogHeader>
                <DialogTitle>Chain of custody · {history.specimenNo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {(history.events ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events.</p>
                ) : (
                  history.events.map((e) => (
                    <div key={e.eventId} className="text-xs border rounded px-2 py-1 flex justify-between gap-2">
                      <span>
                        <span className="font-semibold">{e.action}</span>
                        {e.toLocation ? ` → ${e.toLocation}` : ''}
                        {e.reason ? ` · ${e.reason}` : ''}
                        {' '}by {e.actorLabel || '—'}
                      </span>
                      <span className="text-muted-foreground shrink-0">{new Date(e.at).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default SpecimenTrackingCenter;
