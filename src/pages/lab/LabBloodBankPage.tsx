import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import SummaryCard from '@/components/SummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TestTube2, CheckCircle2, Clock, AlertTriangle, Send, ShieldAlert, Plus, UserPlus,
  Printer, Eye, X, Download, Loader2, RefreshCw, History,
} from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { searchPersons, isPatientsApiEnabled } from '@/lib/api/patients';
import {
  isLaboratoryApiEnabled,
  getBloodBankSummary,
  listBloodUnits,
  createBloodUnit,
  updateBloodUnit,
  listBloodRequests,
  getBloodRequest,
  createBloodRequest,
  startBloodCrossmatch,
  recordBloodCrossmatch,
  issueBloodRequest,
  rejectBloodRequest,
  completeBloodRequest,
  listBloodCrossmatches,
  listBloodDonors,
  createBloodDonor,
  updateBloodDonor,
  searchBloodBankDoctors,
  listBloodIssueHistory,
  type ApiBloodUnit,
  type ApiBloodRequest,
  type ApiBloodCrossmatch,
  type ApiBloodBankSummary,
  type ApiBloodDonor,
  type ApiBloodDoctorHit,
  type ApiBloodIssueHistoryItem,
} from '@/lib/api/laboratory';
import { LabShell, LabCard, LabSection, labTone } from './LabPageShell';

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Whole Blood', 'Packed Cells', 'FFP', 'Platelets', 'Cryoprecipitate'];

function downloadPdf(filename: string, lines: string[], title: string) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  let y = 26;
  for (const line of lines) {
    doc.text(line.slice(0, 95), 14, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 16;
    }
  }
  doc.save(filename);
}

export const LabBloodBank = () => {
  const apiOn = isLaboratoryApiEnabled();
  const patientsOn = isPatientsApiEnabled();

  const [summary, setSummary] = useState<ApiBloodBankSummary | null>(null);
  const [units, setUnits] = useState<ApiBloodUnit[]>([]);
  const [requests, setRequests] = useState<ApiBloodRequest[]>([]);
  const [crossHistory, setCrossHistory] = useState<ApiBloodCrossmatch[]>([]);
  const [donors, setDonors] = useState<ApiBloodDonor[]>([]);
  const [issueHistory, setIssueHistory] = useState<ApiBloodIssueHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ApiBloodRequest | null>(null);
  const [issueFor, setIssueFor] = useState<ApiBloodRequest | null>(null);
  const [issueUnitIds, setIssueUnitIds] = useState<number[]>([]);
  const [rejectFor, setRejectFor] = useState<ApiBloodRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('No Blood Available');
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newReqOpen, setNewReqOpen] = useState(false);
  const [addDonorOpen, setAddDonorOpen] = useState(false);
  const [crossOpen, setCrossOpen] = useState<ApiBloodRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const [unitForm, setUnitForm] = useState({
    unitNo: '',
    bloodGroup: 'O+',
    component: 'Whole Blood',
    expiryDate: '',
    donorId: 0,
    donorLabel: '',
    doctorId: 0,
    doctorLabel: '',
  });
  const [reqForm, setReqForm] = useState({
    personId: 0,
    patientLabel: '',
    bloodGroup: 'A+',
    unitsRequested: 1,
    department: '',
    doctorId: 0,
    doctorLabel: '',
    notes: '',
  });
  const [donorForm, setDonorForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    bloodGroup: 'O+',
    notes: '',
  });
  const [patientQ, setPatientQ] = useState('');
  const [patientHits, setPatientHits] = useState<{ personId: number; label: string }[]>([]);
  const [donorQ, setDonorQ] = useState('');
  const [doctorQ, setDoctorQ] = useState('');
  const [doctorHits, setDoctorHits] = useState<ApiBloodDoctorHit[]>([]);
  const [doctorTarget, setDoctorTarget] = useState<'unit' | 'request'>('request');
  const [crossResult, setCrossResult] = useState<'Compatible' | 'Incompatible' | 'Pending'>('Compatible');

  const load = async () => {
    if (!apiOn) {
      setError('Backend API is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [s, u, r, c, d, h] = await Promise.all([
        getBloodBankSummary(),
        listBloodUnits({ limit: 100 }),
        listBloodRequests({ limit: 100 }),
        listBloodCrossmatches({ limit: 100 }),
        listBloodDonors({ status: 'Active', limit: 100 }),
        listBloodIssueHistory({ limit: 100 }),
      ]);
      setSummary(s);
      setUnits(u.items);
      setRequests(r.items);
      setCrossHistory(c.items);
      setDonors(d.items);
      setIssueHistory(h.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load blood bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [apiOn]);

  useEffect(() => {
    if (!patientsOn || patientQ.trim().length < 2) {
      setPatientHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchPersons(patientQ.trim())
        .then((rows) => {
          if (cancelled) return;
          setPatientHits(
            rows.slice(0, 8).map((r) => ({
              personId: r.personId,
              label: `${[r.firstName, r.lastName].filter(Boolean).join(' ')} · ${r.hospitalNo || r.personId}`,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) setPatientHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [patientQ, patientsOn]);

  useEffect(() => {
    if (!apiOn || doctorQ.trim().length < 2) {
      setDoctorHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchBloodBankDoctors({ q: doctorQ.trim(), limit: 12 })
        .then((res) => {
          if (!cancelled) setDoctorHits(res.items);
        })
        .catch(() => {
          if (!cancelled) setDoctorHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [doctorQ, apiOn]);

  const filteredDonors = useMemo(() => {
    const q = donorQ.trim().toLowerCase();
    if (!q) return donors;
    return donors.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.donorNo.toLowerCase().includes(q),
    );
  }, [donors, donorQ]);

  const stockByGroup = useMemo(() => {
    const map = new Map(GROUPS.map((g) => [g, 0]));
    for (const g of summary?.stockByGroup ?? []) map.set(g.bloodGroup, g.units);
    return map;
  }, [summary]);

  const openView = async (r: ApiBloodRequest) => {
    try {
      setView(await getBloodRequest(r.bloodRequestId));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load request');
    }
  };

  const onIssue = async () => {
    if (!issueFor) return;
    setBusy(true);
    try {
      await issueBloodRequest(issueFor.bloodRequestId, {
        bloodUnitIds: issueUnitIds.length ? issueUnitIds : undefined,
      });
      toast.success('Blood successfully issued');
      setIssueFor(null);
      setIssueUnitIds([]);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Issue failed');
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!rejectFor) return;
    setBusy(true);
    try {
      await rejectBloodRequest(rejectFor.bloodRequestId, rejectReason);
      toast.success('Request rejected');
      setRejectFor(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  };

  const onComplete = async (r: ApiBloodRequest) => {
    setBusy(true);
    try {
      await completeBloodRequest(r.bloodRequestId);
      toast.success('Transfusion marked completed');
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Complete failed');
    } finally {
      setBusy(false);
    }
  };

  const onAddUnit = async () => {
    if (!unitForm.unitNo.trim() || !unitForm.expiryDate) {
      toast.error('Unit number and expiry are required');
      return;
    }
    setBusy(true);
    try {
      await createBloodUnit({
        unitNo: unitForm.unitNo.trim(),
        bloodGroup: unitForm.bloodGroup,
        component: unitForm.component,
        expiryDate: unitForm.expiryDate,
        donorId: unitForm.donorId || undefined,
        donorLabel: unitForm.donorLabel.trim() || undefined,
        doctorId: unitForm.doctorId || undefined,
        doctorLabel: unitForm.doctorLabel.trim() || undefined,
      });
      toast.success('Blood unit added');
      setAddUnitOpen(false);
      setUnitForm({
        unitNo: '',
        bloodGroup: 'O+',
        component: 'Whole Blood',
        expiryDate: '',
        donorId: 0,
        donorLabel: '',
        doctorId: 0,
        doctorLabel: '',
      });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add unit');
    } finally {
      setBusy(false);
    }
  };

  const onCreateRequest = async () => {
    if (!reqForm.personId || !reqForm.department.trim()) {
      toast.error('Select a patient and department');
      return;
    }
    setBusy(true);
    try {
      await createBloodRequest({
        personId: reqForm.personId,
        bloodGroup: reqForm.bloodGroup,
        unitsRequested: reqForm.unitsRequested,
        department: reqForm.department.trim(),
        doctorId: reqForm.doctorId || undefined,
        doctorLabel: reqForm.doctorLabel.trim() || undefined,
        notes: reqForm.notes.trim() || undefined,
      });
      toast.success('Blood request created');
      setNewReqOpen(false);
      setReqForm({
        personId: 0,
        patientLabel: '',
        bloodGroup: 'A+',
        unitsRequested: 1,
        department: '',
        doctorId: 0,
        doctorLabel: '',
        notes: '',
      });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create request');
    } finally {
      setBusy(false);
    }
  };

  const onCreateDonor = async () => {
    if (!donorForm.fullName.trim() || donorForm.phone.trim().length < 7) {
      toast.error('Full name and phone are required');
      return;
    }
    setBusy(true);
    try {
      await createBloodDonor({
        fullName: donorForm.fullName.trim(),
        phone: donorForm.phone.trim(),
        address: donorForm.address.trim() || undefined,
        bloodGroup: donorForm.bloodGroup || undefined,
        notes: donorForm.notes.trim() || undefined,
      });
      toast.success('Donor registered');
      setAddDonorOpen(false);
      setDonorForm({ fullName: '', phone: '', address: '', bloodGroup: 'O+', notes: '' });
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create donor');
    } finally {
      setBusy(false);
    }
  };

  const onCrossmatch = async () => {
    if (!crossOpen) return;
    setBusy(true);
    try {
      if (crossOpen.status === 'Pending') {
        await startBloodCrossmatch(crossOpen.bloodRequestId);
      }
      await recordBloodCrossmatch(crossOpen.bloodRequestId, { result: crossResult });
      toast.success(`Crossmatch recorded: ${crossResult}`);
      setCrossOpen(null);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Crossmatch failed');
    } finally {
      setBusy(false);
    }
  };

  const returnUnit = async (u: ApiBloodUnit) => {
    if (u.status === 'Issued') {
      toast.error('Issued units cannot be returned to Available');
      return;
    }
    setBusy(true);
    try {
      await updateBloodUnit(u.bloodUnitId, { status: 'Available' });
      toast.success(`Unit ${u.unitNo} returned to Available`);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Return failed');
    } finally {
      setBusy(false);
    }
  };

  const pickDoctor = (d: ApiBloodDoctorHit) => {
    if (doctorTarget === 'unit') {
      setUnitForm((f) => ({ ...f, doctorId: d.userId, doctorLabel: d.name }));
    } else {
      setReqForm((f) => ({ ...f, doctorId: d.userId, doctorLabel: d.name }));
    }
    setDoctorQ('');
    setDoctorHits([]);
  };

  const availableForIssue = useMemo(() => {
    if (!issueFor) return [];
    return units.filter(
      (u) =>
        u.bloodGroup === issueFor.bloodGroup &&
        (u.status === 'Available' || u.status === 'Reserved'),
    );
  }, [issueFor, units]);

  return (
    <LabShell title="Blood Bank & Cross Matching">
      <LabSection
        icon={<TestTube2 className="h-5 w-5" />}
        title="Blood Bank Management Center"
        desc="Live inventory, requests, crossmatching, issue & audit trail."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
            <Button size="sm" onClick={() => setNewReqOpen(true)}><Plus className="h-3 w-3 mr-1" />New Request</Button>
            <Button size="sm" variant="outline" onClick={() => setAddUnitOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Blood Unit</Button>
            <Button size="sm" variant="outline" onClick={() => setAddDonorOpen(true)}><UserPlus className="h-3 w-3 mr-1" />Add Donor</Button>
          </div>
        }
      />

      {error && (
        <LabCard className="mb-4 border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</p>
        </LabCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard title="Available Units" value={String(summary?.available ?? '—')} icon={CheckCircle2} />
        <SummaryCard title="Reserved Units" value={String(summary?.reserved ?? '—')} icon={Clock} />
        <SummaryCard title="Expired Units" value={String(summary?.expired ?? '—')} icon={AlertTriangle} />
        <SummaryCard title="Cross-Match Requests" value={String(summary?.crossMatchRequests ?? '—')} icon={TestTube2} />
        <SummaryCard title="Issued Units" value={String(summary?.issued ?? '—')} icon={Send} />
        <SummaryCard title="Emergency Requests" value={String(summary?.emergencyRequests ?? '—')} icon={ShieldAlert} />
      </div>

      <LabCard className="mb-4">
        <h3 className="font-semibold mb-3">Blood Groups · Available stock</h3>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {GROUPS.map((g) => (
            <div key={g} className="rounded-lg border p-3 text-center">
              <div className="text-lg font-bold">{g}</div>
              <div className="text-xs text-muted-foreground">{stockByGroup.get(g) ?? 0} units</div>
            </div>
          ))}
        </div>
      </LabCard>

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading blood bank…
        </div>
      ) : (
        <Tabs defaultValue="requests">
          <TabsList className="mb-3 flex flex-wrap h-auto">
            <TabsTrigger value="requests">Request Queue</TabsTrigger>
            <TabsTrigger value="inventory">Blood Inventory</TabsTrigger>
            <TabsTrigger value="donors">Donors</TabsTrigger>
            <TabsTrigger value="assignments">Issue History</TabsTrigger>
            <TabsTrigger value="cross">Cross Match History</TabsTrigger>
            <TabsTrigger value="expired">Expired Units</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <LabCard>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No blood requests yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead><TableHead>Patient</TableHead><TableHead>Group</TableHead>
                      <TableHead>Units</TableHead><TableHead>Department</TableHead><TableHead>Date</TableHead>
                      <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.bloodRequestId}>
                        <TableCell className="font-mono text-xs">{r.requestNo}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.patientName}</div>
                          <div className="text-xs text-muted-foreground">{r.hospitalNo}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.bloodGroup}</Badge></TableCell>
                        <TableCell>{r.unitsRequested}</TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell className="text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(r.status === 'Issued' || r.status === 'Completed' ? 'green' : r.status === 'Rejected' ? 'rose' : 'amber')}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => void openView(r)}><Eye className="h-3 w-3 mr-1" />View</Button>
                          <Button size="sm" variant="outline" disabled={r.status !== 'Pending' && r.status !== 'Crossmatching'} onClick={() => setCrossOpen(r)}>
                            <TestTube2 className="h-3 w-3 mr-1" />Crossmatch
                          </Button>
                          <Button
                            size="sm"
                            disabled={r.status !== 'Pending' && r.status !== 'Crossmatching'}
                            onClick={() => {
                              setIssueFor(r);
                              setIssueUnitIds([]);
                            }}
                          >
                            <Send className="h-3 w-3 mr-1" />Issue
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" disabled={r.status === 'Rejected' || r.status === 'Completed' || r.status === 'Issued'} onClick={() => setRejectFor(r)}>
                            <X className="h-3 w-3 mr-1" />Reject
                          </Button>
                          <Button size="sm" variant="outline" disabled={r.status !== 'Issued' || busy} onClick={() => void onComplete(r)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>

          <TabsContent value="inventory">
            <LabCard>
              {units.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No units in inventory.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit ID</TableHead><TableHead>Group</TableHead><TableHead>Component</TableHead>
                      <TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((u) => (
                      <TableRow key={u.bloodUnitId}>
                        <TableCell className="font-mono text-xs">{u.unitNo}</TableCell>
                        <TableCell><Badge variant="outline">{u.bloodGroup}</Badge></TableCell>
                        <TableCell>{u.component}</TableCell>
                        <TableCell>{u.expiryDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(u.status === 'Available' ? 'green' : u.status === 'Reserved' ? 'amber' : 'rose')}>{u.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.status === 'Reserved' && (
                            <Button size="sm" variant="outline" disabled={busy} onClick={() => void returnUnit(u)}>Return</Button>
                          )}
                          {u.status === 'Issued' && (
                            <span className="text-xs text-muted-foreground">Assigned</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>

          <TabsContent value="donors">
            <LabCard>
              <div className="flex gap-2 mb-3">
                <Input placeholder="Search donors…" value={donorQ} onChange={(e) => setDonorQ(e.target.value)} className="max-w-sm" />
              </div>
              {filteredDonors.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No donors registered yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Donor No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDonors.map((d) => (
                      <TableRow key={d.donorId}>
                        <TableCell className="font-mono text-xs">{d.donorNo}</TableCell>
                        <TableCell className="font-medium">{d.fullName}</TableCell>
                        <TableCell>{d.phone}</TableCell>
                        <TableCell>{d.bloodGroup || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(d.status === 'Active' ? 'green' : 'amber')}>{d.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {d.status === 'Active' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await updateBloodDonor(d.donorId, { status: 'Inactive' });
                                  toast.success('Donor deactivated');
                                  void load();
                                } catch (err) {
                                  toast.error(err instanceof ApiError ? err.message : 'Update failed');
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Deactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>

          <TabsContent value="assignments">
            <LabCard>
              {issueHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No issue assignments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issueHistory.map((h) => (
                      <TableRow key={h.crossmatchId}>
                        <TableCell className="font-mono text-xs">{h.requestNo || '—'}</TableCell>
                        <TableCell>{h.patientName || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{h.unitNo || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{h.bloodGroup}</Badge></TableCell>
                        <TableCell className="text-xs">{h.issuedAt ? new Date(h.issuedAt).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-xs">{h.issuedBy || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>

          <TabsContent value="cross">
            <LabCard>
              {crossHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No crossmatch history.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Group</TableHead>
                      <TableHead>Result</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossHistory.map((c) => (
                      <TableRow key={c.crossmatchId}>
                        <TableCell className="font-mono text-xs">{c.crossmatchNo}</TableCell>
                        <TableCell>{c.patientName || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{c.bloodGroup}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={labTone(c.result === 'Compatible' ? 'green' : c.result === 'Incompatible' ? 'rose' : 'amber')}>{c.result}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-3 w-3 mr-1" />Print</Button>
                          <Button size="sm" variant="outline" onClick={() => downloadPdf(`${c.crossmatchNo}.pdf`, [
                            `Patient: ${c.patientName}`, `Group: ${c.bloodGroup}`, `Result: ${c.result}`, `Unit: ${c.unitNo || '—'}`, `Request: ${c.requestNo || '—'}`,
                          ], 'Cross-Match Report')}>
                            <Download className="h-3 w-3 mr-1" />PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </LabCard>
          </TabsContent>

          <TabsContent value="expired">
            <LabCard>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Unit ID</TableHead><TableHead>Group</TableHead><TableHead>Expired</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {units.filter((u) => u.status === 'Expired').length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No expired units.</TableCell></TableRow>
                  ) : (
                    units.filter((u) => u.status === 'Expired').map((u) => (
                      <TableRow key={u.bloodUnitId}>
                        <TableCell className="font-mono text-xs">{u.unitNo}</TableCell>
                        <TableCell>{u.bloodGroup}</TableCell>
                        <TableCell>{u.expiryDate}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </LabCard>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>Request {view.requestNo}</DialogTitle>
                <DialogDescription>Blood request details and audit log.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Patient</div><div className="font-semibold">{view.patientName}</div><div className="text-xs text-muted-foreground">{view.hospitalNo}</div></div>
                <div><div className="text-xs text-muted-foreground">Blood Group</div><div className="font-semibold">{view.bloodGroup}</div></div>
                <div><div className="text-xs text-muted-foreground">Cross Match</div><Badge variant="outline">{view.crossMatchResult || '—'}</Badge></div>
                <div><div className="text-xs text-muted-foreground">Units</div><div className="font-semibold">{view.unitsRequested}</div></div>
                <div><div className="text-xs text-muted-foreground">Doctor</div><div className="font-semibold">{view.doctorLabel || '—'}</div></div>
                <div><div className="text-xs text-muted-foreground">Department</div><div className="font-semibold">{view.department}</div></div>
                <div><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline">{view.status}</Badge></div>
              </div>
              <div className="text-sm border rounded p-2 bg-muted/30">{view.notes || '—'}</div>
              <div>
                <div className="text-sm font-semibold mb-2 flex items-center gap-1"><History className="h-4 w-4" /> Audit Log</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(view.events ?? []).map((a) => (
                    <div key={a.eventId} className="text-xs flex items-center justify-between border rounded px-2 py-1">
                      <span><span className="font-semibold">{a.action}</span> by {a.actorLabel || '—'}{a.reason ? ` · ${a.reason}` : ''}</span>
                      <span className="text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
                <Button onClick={() => downloadPdf(`${view.requestNo}.pdf`, [
                  `Request: ${view.requestNo}`, `Patient: ${view.patientName} (${view.hospitalNo})`,
                  `Group: ${view.bloodGroup}`, `Units: ${view.unitsRequested}`, `Status: ${view.status}`,
                  '', 'Audit:', ...(view.events ?? []).map((e) => `${e.at} — ${e.action} by ${e.actorLabel}`),
                ], 'Blood Bank Request')}>
                  <Download className="h-4 w-4 mr-1" />PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!issueFor} onOpenChange={(o) => { if (!o) { setIssueFor(null); setIssueUnitIds([]); } }}>
        <DialogContent className="max-w-lg">
          {issueFor && (
            <>
              <DialogHeader>
                <DialogTitle>Issue Blood · {issueFor.requestNo}</DialogTitle>
                <DialogDescription>
                  Select up to {issueFor.unitsRequested} unit(s), or leave empty for FEFO auto-pick. Issued units leave Available.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Patient</span><span className="font-semibold">{issueFor.patientName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Blood Group</span><span className="font-semibold">{issueFor.bloodGroup}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Units Requested</span><span className="font-semibold">{issueFor.unitsRequested}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">Crossmatch</span><Badge variant="outline">{issueFor.crossMatchResult || 'Pending'}</Badge></div>
              </div>
              <div className="border rounded max-h-40 overflow-y-auto divide-y">
                {availableForIssue.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">No available/reserved units for this group (FEFO will fail if none).</p>
                ) : (
                  availableForIssue.map((u) => {
                    const checked = issueUnitIds.includes(u.bloodUnitId);
                    return (
                      <label key={u.bloodUnitId} className="flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setIssueUnitIds((ids) => {
                              if (checked) return ids.filter((id) => id !== u.bloodUnitId);
                              if (ids.length >= issueFor.unitsRequested) {
                                toast.error(`Max ${issueFor.unitsRequested} unit(s)`);
                                return ids;
                              }
                              return [...ids, u.bloodUnitId];
                            });
                          }}
                        />
                        <span className="font-mono">{u.unitNo}</span>
                        <span>{u.component}</span>
                        <span className="text-muted-foreground">exp {u.expiryDate}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIssueFor(null); setIssueUnitIds([]); }}>Cancel</Button>
                <Button disabled={busy} onClick={() => void onIssue()}><Send className="h-4 w-4 mr-1" />Confirm Issue</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          {rejectFor && (
            <>
              <DialogHeader>
                <DialogTitle>Reject Request · {rejectFor.requestNo}</DialogTitle>
                <DialogDescription>A reason is required for audit purposes.</DialogDescription>
              </DialogHeader>
              <div>
                <Label>Reason for Rejection</Label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['No Blood Available', 'Cross Match Failed', 'Request Cancelled', 'Expired Stock', 'Incorrect Request'].map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
                <Button variant="destructive" disabled={busy} onClick={() => void onReject()}>Confirm Rejection</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addUnitOpen} onOpenChange={setAddUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Blood Unit</DialogTitle>
            <DialogDescription>Register a new inventory unit.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Unit No</Label><Input value={unitForm.unitNo} onChange={(e) => setUnitForm({ ...unitForm, unitNo: e.target.value })} placeholder="BU-####" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Group</Label>
                <Select value={unitForm.bloodGroup} onValueChange={(v) => setUnitForm({ ...unitForm, bloodGroup: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Component</Label>
                <Select value={unitForm.component} onValueChange={(v) => setUnitForm({ ...unitForm, component: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COMPONENTS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Expiry</Label><Input type="date" value={unitForm.expiryDate} onChange={(e) => setUnitForm({ ...unitForm, expiryDate: e.target.value })} /></div>
            <div>
              <Label>Donor</Label>
              <Select
                value={unitForm.donorId ? String(unitForm.donorId) : 'none'}
                onValueChange={(v) => {
                  if (v === 'none') {
                    setUnitForm({ ...unitForm, donorId: 0, donorLabel: '' });
                    return;
                  }
                  const d = donors.find((x) => x.donorId === Number(v));
                  setUnitForm({
                    ...unitForm,
                    donorId: Number(v),
                    donorLabel: d?.fullName || '',
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select donor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Legacy label only</SelectItem>
                  {donors.map((d) => (
                    <SelectItem key={d.donorId} value={String(d.donorId)}>
                      {d.fullName} · {d.donorNo}{d.bloodGroup ? ` · ${d.bloodGroup}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!unitForm.donorId && (
                <Input
                  className="mt-1"
                  placeholder="Donor label (legacy)"
                  value={unitForm.donorLabel}
                  onChange={(e) => setUnitForm({ ...unitForm, donorLabel: e.target.value })}
                />
              )}
            </div>
            <div>
              <Label>Doctor</Label>
              <Input
                placeholder="Search doctor…"
                value={doctorTarget === 'unit' ? doctorQ : ''}
                onFocus={() => setDoctorTarget('unit')}
                onChange={(e) => {
                  setDoctorTarget('unit');
                  setDoctorQ(e.target.value);
                }}
              />
              {unitForm.doctorLabel && (
                <p className="text-xs text-emerald-700 mt-1">Selected: {unitForm.doctorLabel}</p>
              )}
              {doctorTarget === 'unit' && doctorHits.length > 0 && (
                <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y">
                  {doctorHits.map((d) => (
                    <button key={d.userId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40" onClick={() => pickDoctor(d)}>
                      {d.name}{d.role ? ` · ${d.role}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUnitOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onAddUnit()}>Save Unit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newReqOpen} onOpenChange={setNewReqOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Blood Request</DialogTitle>
            <DialogDescription>Create a transfusion request for a registered patient.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Patient</Label>
              <Input placeholder="Search patient…" value={patientQ} onChange={(e) => setPatientQ(e.target.value)} />
              {reqForm.patientLabel && <p className="text-xs text-emerald-700 mt-1">Selected: {reqForm.patientLabel}</p>}
              <div className="max-h-32 overflow-y-auto border rounded mt-1 divide-y">
                {patientHits.map((p) => (
                  <button key={p.personId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40" onClick={() => {
                    setReqForm({ ...reqForm, personId: p.personId, patientLabel: p.label });
                    setPatientQ('');
                    setPatientHits([]);
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Group</Label>
                <Select value={reqForm.bloodGroup} onValueChange={(v) => setReqForm({ ...reqForm, bloodGroup: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Units</Label>
                <Input type="number" min={1} value={reqForm.unitsRequested} onChange={(e) => setReqForm({ ...reqForm, unitsRequested: Number(e.target.value) || 1 })} />
              </div>
            </div>
            <div><Label>Department</Label><Input value={reqForm.department} onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })} placeholder="ICU / Theatre / Ward" /></div>
            <div>
              <Label>Doctor</Label>
              <Input
                placeholder="Search doctor…"
                value={doctorTarget === 'request' ? doctorQ : ''}
                onFocus={() => setDoctorTarget('request')}
                onChange={(e) => {
                  setDoctorTarget('request');
                  setDoctorQ(e.target.value);
                }}
              />
              {reqForm.doctorLabel && (
                <p className="text-xs text-emerald-700 mt-1">Selected: {reqForm.doctorLabel}</p>
              )}
              {doctorTarget === 'request' && doctorHits.length > 0 && (
                <div className="max-h-28 overflow-y-auto border rounded mt-1 divide-y">
                  {doctorHits.map((d) => (
                    <button key={d.userId} type="button" className="w-full text-left text-xs p-2 hover:bg-muted/40" onClick={() => pickDoctor(d)}>
                      {d.name}{d.role ? ` · ${d.role}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={reqForm.notes} onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewReqOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onCreateRequest()}><UserPlus className="h-4 w-4 mr-1" />Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDonorOpen} onOpenChange={setAddDonorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Donor</DialogTitle>
            <DialogDescription>Name and phone are required for blood donor records.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Full name</Label><Input value={donorForm.fullName} onChange={(e) => setDonorForm({ ...donorForm, fullName: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={donorForm.address} onChange={(e) => setDonorForm({ ...donorForm, address: e.target.value })} /></div>
            <div>
              <Label>Blood group</Label>
              <Select value={donorForm.bloodGroup} onValueChange={(v) => setDonorForm({ ...donorForm, bloodGroup: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={donorForm.notes} onChange={(e) => setDonorForm({ ...donorForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDonorOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void onCreateDonor()}>Save Donor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!crossOpen} onOpenChange={(o) => !o && setCrossOpen(null)}>
        <DialogContent>
          {crossOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Crossmatch · {crossOpen.requestNo}</DialogTitle>
                <DialogDescription>Record compatibility for {crossOpen.patientName} ({crossOpen.bloodGroup}).</DialogDescription>
              </DialogHeader>
              <div>
                <Label>Result</Label>
                <Select value={crossResult} onValueChange={(v) => setCrossResult(v as typeof crossResult)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compatible">Compatible</SelectItem>
                    <SelectItem value="Incompatible">Incompatible</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCrossOpen(null)}>Cancel</Button>
                <Button disabled={busy} onClick={() => void onCrossmatch()}>Save Crossmatch</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </LabShell>
  );
};

export default LabBloodBank;
