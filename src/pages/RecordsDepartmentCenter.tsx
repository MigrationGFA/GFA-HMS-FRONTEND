import { useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useBillingStore } from '@/contexts/BillingStore';
import { LoadingButton } from '@/components/LoadingButton';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import {
  Activity, Users, UserPlus, ClipboardList, ClipboardCheck, FileCheck, FileText,
  History, TrendingUp, RefreshCw, LayoutDashboard, AlertTriangle, Printer, Eye,
  Search, Download, Upload, Send, Filter, BedDouble, Stethoscope, Phone, Edit,
  Trash2, CheckCircle2, XCircle, Flag, Building2,
} from 'lucide-react';

import { recordsNav } from '@/pages/recordsNav';
import RecordsStaffChat from '@/components/records/RecordsStaffChat';
import {
  isTriageApiEnabled,
  listTriage,
  personDisplayName,
  updateTriage,
  type TriageRecord,
} from '@/lib/api/triage';
import {
  getAuditStats,
  getDirectoryStats,
  isRecordsApiEnabled,
  listDirectory,
  listRecordsAudit,
  type DirectoryPatient,
  type DirectoryStats,
  type RecordsAuditEntry,
  type RecordsAuditStats,
} from '@/lib/api/records';
import { ApiError } from '@/lib/api/client';
import { isAdmissionRequestsApiEnabled } from '@/lib/api/admission-requests';
import { isAdmissionsApiEnabled } from '@/lib/api/admissions';
import { RecordsAdmissionRequestsLive } from '@/pages/records/RecordsAdmissionRequestsLive';
import RecordsListPagination, { RECORDS_PAGE_SIZE } from '@/components/records/RecordsListPagination';

function Shell({ title, breadcrumb, children }: { title: string; breadcrumb: string; children: ReactNode }) {
  return (
    <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Records Department / <span className="font-medium text-foreground">{breadcrumb}</span></p>
            <h1 className="text-2xl font-bold font-display">{title}</h1>
          </div>
        </div>
        {children}
      </div>
      <RecordsStaffChat />
    </DashboardLayout>
  );
}

function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, requireReason = false, danger = false }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; description: string;
  onConfirm: (reason?: string) => void; requireReason?: boolean; danger?: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(''); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        {requireReason && (
          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-600">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide a reason..." />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={danger ? 'destructive' : 'default'}
            onClick={() => {
              if (requireReason && !reason.trim()) { toast.error('Reason is required'); return; }
              onConfirm(reason); onOpenChange(false); setReason('');
            }}
          >Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return <tr><td colSpan={cols} className="px-3 py-10 text-center text-muted-foreground text-sm">{label}</td></tr>;
}

// ============================================================
// 1. TRIAGE QUEUE
// ============================================================
type TriageStatus = 'Waiting' | 'In Triage' | 'Triage Completed' | 'Sent to Consultation' | 'Cancelled';
type TriagePriority = 'Routine' | 'Urgent' | 'Emergency' | 'VIP' | 'Elderly / Special Needs';
type PayStatus = 'Paid' | 'Pending' | 'NHIA' | 'HMO' | 'Exempt';

interface QueueHistoryEntry { at: string; event: string; by: string }
interface TriageRow {
  triageId?: number;
  personId?: number;
  queueNo: string; hospitalId: string; name: string; age: number; gender: string;
  phone: string; patientType: 'New' | 'Returning' | 'Emergency'; clinic: string;
  arrival: string; wait: string; status: TriageStatus; priority: TriagePriority;
  priorityReason?: string; registeredBy: string; paymentStatus: PayStatus;
  nextOfKin: string; nokPhone: string; emergencyContact: string;
  allergies: string; conditions: string; lastVisit: string;
  history: QueueHistoryEntry[];
  weightKg?: number | null;
  heightCm?: number | null;
  bmi?: number | null;
  bloodPressure?: string | null;
  temperatureC?: number | null;
  pulseBpm?: number | null;
  respiratoryRate?: number | null;
  spo2Pct?: number | null;
}

function mapApiTriageToRow(r: TriageRecord): TriageRow {
  const arrival = new Date(r.arrivalAt);
  const waitMins = Math.max(0, Math.floor((Date.now() - arrival.getTime()) / 60000));
  const nok = r.person?.nextOfKinName
    ? `${r.person.nextOfKinName}${r.person.nextOfKinRelationship ? ` (${r.person.nextOfKinRelationship})` : ''}`
    : '—';
  return {
    triageId: r.triageId,
    personId: r.personId,
    queueNo: r.queueNo,
    hospitalId: r.person?.hospitalNo || '—',
    name: personDisplayName(r.person),
    age: r.person?.age ?? 0,
    gender: r.person?.sex?.[0] || '—',
    phone: r.person?.phone || '—',
    patientType: (r.patientType as TriageRow['patientType']) || 'New',
    clinic: r.clinic || 'General OPD',
    arrival: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    wait: `${waitMins}m`,
    status: r.status as TriageStatus,
    priority: r.priority as TriagePriority,
    priorityReason: r.priorityReason || undefined,
    registeredBy: 'Records',
    paymentStatus: 'Pending',
    nextOfKin: nok,
    nokPhone: r.person?.nextOfKinPhone || '—',
    emergencyContact: r.person?.nextOfKinPhone || '—',
    allergies: '—',
    conditions: '—',
    lastVisit: 'See PERSONS history',
    history: [{ at: arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: 'Joined queue', by: 'Records' }],
    weightKg: r.weightKg,
    heightCm: r.heightCm,
    bmi: r.bmi,
    bloodPressure: r.bloodPressure,
    temperatureC: r.temperatureC,
    pulseBpm: r.pulseBpm,
    respiratoryRate: r.respiratoryRate,
    spo2Pct: r.spo2Pct,
  };
}

const triageAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Triage] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
};

const priorityToneClass = (p: TriagePriority) => {
  switch (p) {
    case 'Emergency': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'Urgent': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'VIP': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'Elderly / Special Needs': return 'bg-sky-100 text-sky-700 border-sky-200';
    default: return 'bg-muted text-muted-foreground border';
  }
};

const PRIORITY_OPTIONS: TriagePriority[] = ['Routine', 'Urgent', 'Emergency', 'VIP', 'Elderly / Special Needs'];

export const TriageQueue = () => {
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClinic, setFilterClinic] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [detailsRow, setDetailsRow] = useState<TriageRow | null>(null);
  const [priorityRow, setPriorityRow] = useState<TriageRow | null>(null);
  const [newPriority, setNewPriority] = useState<TriagePriority>('Routine');
  const [priorityReason, setPriorityReason] = useState('');
  const [startRow, setStartRow] = useState<TriageRow | null>(null);
  const [removeRow, setRemoveRow] = useState<TriageRow | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [printRow, setPrintRow] = useState<TriageRow | null>(null);

  const refreshQueue = useCallback(async () => {
    if (!isTriageApiEnabled()) {
      setRows([]);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const items = await listTriage();
      setRows(items.map(mapApiTriageToRow));
    } catch {
      toast.error('Could not load triage queue from API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  const filtered = useMemo(() => rows.filter(r =>
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.hospitalId.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)) &&
    (filterClinic === 'all' || r.clinic === filterClinic) &&
    (filterType === 'all' || r.patientType === filterType) &&
    (filterStatus === 'all' || r.status === filterStatus) &&
    (filterPriority === 'all' || r.priority === filterPriority)
  ), [rows, search, filterClinic, filterType, filterStatus, filterPriority]);

  const update = (queueNo: string, patch: Partial<TriageRow>, historyEvent?: string) =>
    setRows(prev => prev.map(r => {
      if (r.queueNo !== queueNo) return r;
      const nextHistory = historyEvent
        ? [...r.history, { at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), event: historyEvent, by: 'Records' }]
        : r.history;
      return { ...r, ...patch, history: nextHistory };
    }));

  const onView = (r: TriageRow) => { setDetailsRow(r); triageAudit(`Viewed ${r.queueNo} ${r.name}`); };
  const onOpenPriority = (r: TriageRow) => { setNewPriority(r.priority); setPriorityReason(r.priorityReason ?? ''); setPriorityRow(r); };
  const onSavePriority = async () => {
    if (!priorityRow) return;
    if (!priorityReason.trim()) { toast.error('Reason is required'); return; }
    if (isTriageApiEnabled() && priorityRow.triageId != null) {
      try {
        await updateTriage(priorityRow.triageId, {
          priority: newPriority,
          priorityReason,
        });
        await refreshQueue();
      } catch {
        toast.error('Could not update priority');
        return;
      }
    } else {
      update(priorityRow.queueNo, { priority: newPriority, priorityReason }, `Priority changed to ${newPriority}`);
    }
    triageAudit(`Priority for ${priorityRow.queueNo} → ${newPriority} (${priorityReason})`);
    toast.success(`Priority updated to ${newPriority}`);
    setPriorityRow(null);
  };
  const onStartTriage = async () => {
    if (!startRow) return;
    if (isTriageApiEnabled() && startRow.triageId != null) {
      try {
        await updateTriage(startRow.triageId, { status: 'In Triage' });
        await refreshQueue();
      } catch {
        toast.error('Could not start triage');
        return;
      }
    } else {
      update(startRow.queueNo, { status: 'In Triage' }, 'Started triage');
      setDetailsRow(prev => prev && prev.queueNo === startRow.queueNo ? { ...prev, status: 'In Triage' } : prev);
    }
    triageAudit(`Started triage for ${startRow.queueNo} ${startRow.name}`);
    toast.success('Patient moved to triage');
    setStartRow(null);
  };
  const onConfirmRemove = async () => {
    if (!removeRow) return;
    if (!removeReason.trim()) { toast.error('Reason is required'); return; }
    if (isTriageApiEnabled() && removeRow.triageId != null) {
      try {
        await updateTriage(removeRow.triageId, { status: 'Cancelled', notes: removeReason });
        await refreshQueue();
      } catch {
        toast.error('Could not remove from queue');
        return;
      }
    } else {
      setRows(prev => prev.filter(r => r.queueNo !== removeRow.queueNo));
    }
    triageAudit(`Removed ${removeRow.queueNo} ${removeRow.name} from queue (${removeReason})`);
    toast.success(`${removeRow.name} removed from queue`);
    setRemoveRow(null); setRemoveReason('');
  };
  const onPrint = (r: TriageRow) => { setPrintRow(r); triageAudit(`Print slip for ${r.queueNo} ${r.name}`); };
  const onExport = (kind: 'PDF' | 'CSV') => { triageAudit(`Exported triage queue (${kind})`); toast.success(`Triage queue exported (${kind})`); };

  return (
    <Shell title="Triage Queue" breadcrumb="Triage Queue">
      {loading && <div className="text-sm text-muted-foreground">Loading triage queue…</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Awaiting Triage" value={String(rows.filter(r => r.status === 'Waiting').length)} icon={Activity} tone="blue" />
        <SummaryCard title="New Patients" value={String(rows.filter(r => r.patientType === 'New').length)} icon={UserPlus} tone="teal" />
        <SummaryCard title="Returning" value={String(rows.filter(r => r.patientType === 'Returning').length)} icon={RefreshCw} tone="green" />
        <SummaryCard title="Emergency" value={String(rows.filter(r => r.patientType === 'Emergency').length)} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Priority" value={String(rows.filter(r => r.priority !== 'Routine').length)} icon={Flag} tone="amber" />
        <SummaryCard title="Avg Waiting" value="14m" icon={Activity} tone="amber" />
        <SummaryCard title="In Triage" value={String(rows.filter(r => r.status === 'In Triage').length)} icon={Stethoscope} tone="purple" />
        <SummaryCard title="Completed Today" value={String(rows.filter(r => r.status === 'Triage Completed' || r.status === 'Sent to Consultation').length)} icon={CheckCircle2} tone="green" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search name, hospital no, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterClinic} onValueChange={setFilterClinic}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Clinic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {['General OPD', 'O&G', 'A&E', 'Cardiology', 'Psychiatry'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {['New', 'Returning', 'Emergency'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(['Waiting', 'In Triage', 'Triage Completed', 'Sent to Consultation', 'Cancelled'] as TriageStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-[160px]" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <Button variant="outline" onClick={() => onExport('CSV')}><Download className="h-4 w-4 mr-1.5" />CSV</Button>
          <Button variant="outline" onClick={() => onExport('PDF')}><Download className="h-4 w-4 mr-1.5" />PDF</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {['Queue', 'Hospital No', 'Name', 'Age', 'Gender', 'Type', 'Clinic', 'Arrival', 'Wait', 'Priority', 'Payment', 'Status', 'Actions'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? <EmptyRow cols={13} label="No patients match your filters." /> : filtered.map(r => (
                <tr key={r.queueNo} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.queueNo}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{r.hospitalId}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2">{r.age}</td>
                  <td className="px-3 py-2">{r.gender}</td>
                  <td className="px-3 py-2">{r.patientType}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.clinic}</td>
                  <td className="px-3 py-2">{r.arrival}</td>
                  <td className="px-3 py-2">{r.wait}</td>
                  <td className="px-3 py-2"><span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${priorityToneClass(r.priority)}`}>{r.priority}</span></td>
                  <td className="px-3 py-2"><StatusBadge status={r.paymentStatus} /></td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="View details" onClick={() => onView(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Mark priority" onClick={() => onOpenPriority(r)}><Flag className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Print slip" onClick={() => onPrint(r)}><Printer className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Remove from queue" onClick={() => setRemoveRow(r)}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
                      {r.status === 'Waiting' && (
                        <Button size="sm" variant="outline" title="Start triage" onClick={() => setStartRow(r)}><Send className="h-3.5 w-3.5 mr-1" />Start Triage</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Triage Details Modal */}
      <Dialog open={!!detailsRow} onOpenChange={(v) => !v && setDetailsRow(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Patient Triage Details — {detailsRow?.name}</DialogTitle></DialogHeader>
          {detailsRow && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Hospital No.', detailsRow.hospitalId], ['Queue No.', detailsRow.queueNo],
                  ['Person ID', detailsRow.personId != null ? String(detailsRow.personId) : '—'],
                  ['Age', String(detailsRow.age)], ['Gender', detailsRow.gender],
                  ['Phone', detailsRow.phone], ['Patient Type', detailsRow.patientType],
                  ['Clinic', detailsRow.clinic], ['Arrival Time', detailsRow.arrival],
                  ['Waiting Time', detailsRow.wait], ['Priority', detailsRow.priority],
                  ['Status', detailsRow.status], ['Registered By', detailsRow.registeredBy],
                  ['Payment Status', detailsRow.paymentStatus],
                  ['Next of Kin', `${detailsRow.nextOfKin} • ${detailsRow.nokPhone}`],
                  ['Emergency Contact', detailsRow.emergencyContact],
                  ['BP', detailsRow.bloodPressure || '—'],
                  ['Temp', detailsRow.temperatureC != null ? `${detailsRow.temperatureC}°C` : '—'],
                  ['Pulse', detailsRow.pulseBpm != null ? String(detailsRow.pulseBpm) : '—'],
                  ['SpO₂', detailsRow.spo2Pct != null ? `${detailsRow.spo2Pct}%` : '—'],
                  ['BMI', detailsRow.bmi != null ? String(detailsRow.bmi) : '—'],
                  ['Allergies', detailsRow.allergies], ['Known Conditions', detailsRow.conditions],
                ].map(([k, v]) => (
                  <div key={k} className="border rounded-md p-2.5 bg-muted/20">
                    <div className="text-[11px] uppercase text-muted-foreground">{k}</div>
                    <div className="font-medium">{v}</div>
                  </div>
                ))}
              </div>
              <div className="border rounded-md p-3">
                <div className="text-xs uppercase text-muted-foreground mb-1">Last Visit Summary</div>
                <div>{detailsRow.lastVisit}</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-xs uppercase text-muted-foreground mb-2">Queue Movement History</div>
                <ul className="space-y-1.5">
                  {detailsRow.history.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground w-12">{h.at}</span>
                      <span className="flex-1">{h.event}</span>
                      <span className="text-muted-foreground">{h.by}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {detailsRow?.status === 'Waiting' && (
              <Button onClick={() => { if (detailsRow) { setStartRow(detailsRow); } }}>
                <Send className="h-4 w-4 mr-1.5" />Start Triage
              </Button>
            )}
            <Button variant="outline" onClick={() => detailsRow && onOpenPriority(detailsRow)}><Flag className="h-4 w-4 mr-1.5" />Mark Priority</Button>
            <Button variant="outline" onClick={() => detailsRow && onPrint(detailsRow)}><Printer className="h-4 w-4 mr-1.5" />Print Slip</Button>
            <Button variant="ghost" onClick={() => setDetailsRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Priority Modal */}
      <Dialog open={!!priorityRow} onOpenChange={(v) => !v && setPriorityRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Priority</DialogTitle></DialogHeader>
          {priorityRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Patient</Label><div className="font-medium">{priorityRow.name}</div></div>
                <div><Label className="text-xs">Hospital No.</Label><div className="font-medium">{priorityRow.hospitalId}</div></div>
                <div><Label className="text-xs">Current Priority</Label><div className="font-medium">{priorityRow.priority}</div></div>
              </div>
              <div className="space-y-1.5">
                <Label>New Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TriagePriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Reason <span className="text-red-600">*</span></Label>
                <Textarea value={priorityReason} onChange={(e) => setPriorityReason(e.target.value)} placeholder="Reason for priority change..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriorityRow(null)}>Cancel</Button>
            <Button onClick={() => void onSavePriority()}>Save Priority</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Triage Confirmation */}
      <Dialog open={!!startRow} onOpenChange={(v) => !v && setStartRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Triage?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Move <b>{startRow?.name}</b> ({startRow?.hospitalId}) from <b>Waiting</b> to <b>In Triage</b>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartRow(null)}>Cancel</Button>
            <Button onClick={() => void onStartTriage()}><Send className="h-4 w-4 mr-1.5" />Start Triage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Modal */}
      <Dialog open={!!removeRow} onOpenChange={(v) => { if (!v) { setRemoveRow(null); setRemoveReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove from Queue</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <b>{removeRow?.name}</b> ({removeRow?.hospitalId}) from the triage queue. The patient record will not be deleted.
          </p>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-red-600">*</span></Label>
            <Textarea value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason for removal..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRemoveRow(null); setRemoveReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={() => void onConfirmRemove()}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Slip */}
      <Dialog open={!!printRow} onOpenChange={(v) => !v && setPrintRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Queue Slip Preview</DialogTitle></DialogHeader>
          <div className="border rounded-md p-4 text-sm space-y-1.5">
            <div className="text-center">
              <div className="font-bold">GFA HMS — GFA Demo Hospital</div>
              <div className="text-xs text-muted-foreground">Triage Queue Slip</div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between"><span>Queue No:</span><b className="text-base">{printRow?.queueNo}</b></div>
              <div className="flex justify-between"><span>Hospital No:</span><span>{printRow?.hospitalId}</span></div>
              <div className="flex justify-between"><span>Patient:</span><span>{printRow?.name}</span></div>
              <div className="flex justify-between"><span>Clinic:</span><span>{printRow?.clinic}</span></div>
              <div className="flex justify-between"><span>Arrival:</span><span>{printRow?.arrival}</span></div>
              <div className="flex justify-between"><span>Priority:</span><span>{printRow?.priority}</span></div>
              <div className="flex justify-between"><span>Status:</span><span>{printRow?.status}</span></div>
            </div>
            <div className="flex justify-center pt-2">
              <div className="w-20 h-20 border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground">QR CODE</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRow(null)}>Close</Button>
            <Button onClick={() => { toast.success('Queue slip sent to printer'); setPrintRow(null); }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 2. ADMISSION REQUESTS
// ============================================================
type AdmStatus = 'Pending' | 'Approved' | 'Awaiting Payment' | 'Awaiting Bed Allocation' | 'Bed Allocated' | 'Admitted' | 'Rejected' | 'Cancelled';
interface AdmRow {
  id: string; hospitalId: string; name: string; age: number; gender: string;
  phone: string; nok: string; responsible: string;
  doctor: string; department: string; ward: string; bedClass: string;
  diagnosis: string; note: string; time: string; status: AdmStatus;
  paymentStatus: 'Unpaid' | 'Pending' | 'Paid' | 'NHIA' | 'HMO';
  bedStatus: 'None' | 'Reserved' | 'Allocated';
  bed?: string;
  timeline: { at: string; event: string }[];
}
const ADM_SEED: AdmRow[] = [
  { id: 'ADM-2031', hospitalId: 'GFA HMS/2026/00145', name: 'John Doe', age: 42, gender: 'M', phone: '08012345678', nok: 'Mary Doe — 08099887766', responsible: 'Brother', doctor: 'Dr. Okafor', department: 'Adult Psychiatry', ward: 'Male Medical', bedClass: 'Standard', diagnosis: 'Severe Depression', note: 'Requires inpatient stabilisation.', time: '07:55', status: 'Pending', paymentStatus: 'Unpaid', bedStatus: 'None', timeline: [{ at: '07:55', event: 'Request created by Dr. Okafor' }] },
  { id: 'ADM-2032', hospitalId: 'GFA HMS/2026/00146', name: 'Amina Yusuf', age: 28, gender: 'F', phone: '08023456789', nok: 'Yusuf Bello — 08055443322', responsible: 'Spouse', doctor: 'Dr. Adewale', department: 'O&G', ward: 'O&G Ward', bedClass: 'Private', diagnosis: 'Pre-eclampsia', note: 'Urgent admission for BP control.', time: '08:10', status: 'Approved', paymentStatus: 'NHIA', bedStatus: 'Reserved', timeline: [{ at: '08:10', event: 'Request created' }, { at: '08:18', event: 'Approved' }] },
  { id: 'ADM-2033', hospitalId: 'GFA HMS/2026/00147', name: 'Chidi Eze', age: 35, gender: 'M', phone: '08034567890', nok: 'Ada Eze — 08077665544', responsible: 'Sister', doctor: 'Dr. Balogun', department: 'Emergency', ward: 'A&E Observation', bedClass: 'Standard', diagnosis: 'Acute Psychosis', note: 'Patient agitated, needs urgent bed.', time: '08:25', status: 'Awaiting Bed Allocation', paymentStatus: 'Pending', bedStatus: 'None', timeline: [{ at: '08:25', event: 'Request created' }, { at: '08:32', event: 'Sent to billing' }, { at: '08:40', event: 'Awaiting bed' }] },
  { id: 'ADM-2034', hospitalId: 'GFA HMS/2026/00149', name: 'Ibrahim Musa', age: 56, gender: 'M', phone: '08056789012', nok: 'Hauwa Musa — 08066554433', responsible: 'Wife', doctor: 'Dr. Eze', department: 'Cardiology', ward: 'Cardiology', bedClass: 'Semi-Private', diagnosis: 'Hypertensive crisis', note: 'BP 210/130. Needs monitoring.', time: '08:40', status: 'Bed Allocated', paymentStatus: 'Paid', bedStatus: 'Allocated', bed: 'C-01', timeline: [{ at: '08:40', event: 'Request created' }, { at: '08:48', event: 'Approved' }, { at: '08:55', event: 'Payment received' }, { at: '09:05', event: 'Bed C-01 allocated' }] },
  { id: 'ADM-2035', hospitalId: 'GFA HMS/2026/00150', name: 'Ngozi Okoro', age: 47, gender: 'F', phone: '08067890123', nok: 'Emeka Okoro — 08088776655', responsible: 'Brother', doctor: 'Dr. Okafor', department: 'Adult Psychiatry', ward: 'Female Medical', bedClass: 'Standard', diagnosis: 'Bipolar episode', note: 'Manic phase, history of self-harm.', time: '08:50', status: 'Admitted', paymentStatus: 'HMO', bedStatus: 'Allocated', bed: 'F-07', timeline: [{ at: '08:50', event: 'Request created' }, { at: '09:00', event: 'Approved' }, { at: '09:10', event: 'Bed F-07 allocated' }, { at: '09:25', event: 'Patient admitted' }] },
];

const admAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Admission Requests] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
};

const AVAILABLE_WARDS = ['Male Medical', 'Female Medical', 'Cardiology', 'O&G Ward', 'A&E Observation', 'Adult Psychiatry', 'Paediatric Ward'];
const AVAILABLE_BEDS: Record<string, string[]> = {
  'Male Medical': ['M-01', 'M-04', 'M-08'],
  'Female Medical': ['F-02', 'F-05', 'F-09'],
  'Cardiology': ['C-02', 'C-05'],
  'O&G Ward': ['OG-01', 'OG-03'],
  'A&E Observation': ['AE-01', 'AE-02', 'AE-03'],
  'Adult Psychiatry': ['P-01', 'P-04'],
  'Paediatric Ward': ['PD-01', 'PD-02'],
};

function IconBtn({ title, onClick, children, danger, ok }: { title: string; onClick: () => void; children: ReactNode; danger?: boolean; ok?: boolean }) {
  return (
    <button
      type="button" title={title} aria-label={title} onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded hover:bg-muted transition-colors shrink-0 ${danger ? 'text-rose-600 hover:bg-rose-50' : ok ? 'text-emerald-600 hover:bg-emerald-50' : 'text-foreground/80'}`}
    >{children}</button>
  );
}

export const AdmissionRequests = () => {
  if (isAdmissionRequestsApiEnabled() && isAdmissionsApiEnabled()) {
    return <RecordsAdmissionRequestsLive />;
  }
  return <AdmissionRequestsMock />;
};

const AdmissionRequestsMock = () => {
  const navigate = useNavigate();
  const { createInvoice } = useBillingStore();
  const { run, isBusy } = useAsyncAction();
  const [rows, setRows] = useState<AdmRow[]>(ADM_SEED);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<AdmRow | null>(null);
  const [approveRow, setApproveRow] = useState<AdmRow | null>(null);
  const [admitRow, setAdmitRow] = useState<AdmRow | null>(null);
  const [rejectRow, setRejectRow] = useState<AdmRow | null>(null);
  const [billRow, setBillRow] = useState<AdmRow | null>(null);
  const [bedRow, setBedRow] = useState<AdmRow | null>(null);
  const [printRow, setPrintRow] = useState<AdmRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [bedWard, setBedWard] = useState('');
  const [bedSelect, setBedSelect] = useState('');
  const [bedNote, setBedNote] = useState('');

  const updateRow = (id: string, patch: Partial<AdmRow>, event?: string) =>
    setRows(prev => prev.map(r => r.id === id
      ? { ...r, ...patch, timeline: event ? [...r.timeline, { at: new Date().toTimeString().slice(0, 5), event }] : r.timeline }
      : r));

  const counts = {
    total: rows.length,
    pending: rows.filter(r => r.status === 'Pending').length,
    approved: rows.filter(r => r.status === 'Approved').length,
    awaitingBed: rows.filter(r => r.status === 'Awaiting Bed Allocation' || r.bedStatus !== 'Allocated' && (r.status === 'Approved' || r.status === 'Awaiting Payment')).length,
    admitted: rows.filter(r => r.status === 'Admitted').length,
    rejected: rows.filter(r => r.status === 'Rejected' || r.status === 'Cancelled').length,
  };
  const filtered = rows.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.hospitalId.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()));

  const sendToBilling = (r: AdmRow) => {
    const amt = 50000 + (r.ward.includes('Cardiology') ? 25000 : 0) + (r.bedClass === 'Private' ? 30000 : r.bedClass === 'Semi-Private' ? 15000 : 0);
    const inv = createInvoice({ patientName: r.name, hospitalId: r.hospitalId, phone: r.phone, department: `Admission · ${r.ward}`, amount: amt, source: 'Records' });
    updateRow(r.id, { status: 'Awaiting Payment', paymentStatus: 'Pending' }, `Invoice ${inv.invoiceId} sent to Cashier (₦${amt.toLocaleString()})`);
    admAudit(`Sent ${r.id} to billing — invoice ${inv.invoiceId} (₦${amt})`);
    toast.success(`Invoice ${inv.invoiceId} sent to Cashier`, {
      description: `${r.name} · ₦${amt.toLocaleString()} — admission deposit.`,
      action: { label: 'Open Cashier', onClick: () => navigate('/dashboard/cashier') },
    });
    return inv;
  };

  const tryAdmit = (r: AdmRow) => {
    const missing: string[] = [];
    if (r.status !== 'Approved' && r.status !== 'Bed Allocated' && r.status !== 'Awaiting Payment') missing.push('Admission must be approved');
    if (r.bedStatus !== 'Allocated') missing.push('Bed must be allocated');
    if (r.paymentStatus === 'Unpaid') missing.push('Billing not initiated');
    return missing;
  };

  return (
    <Shell title="Admission Requests" breadcrumb="Admission Requests">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Requests" value={String(counts.total)} icon={ClipboardList} tone="blue" />
        <SummaryCard title="Pending" value={String(counts.pending)} icon={Activity} tone="amber" />
        <SummaryCard title="Approved" value={String(counts.approved)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Awaiting Bed" value={String(counts.awaitingBed)} icon={BedDouble} tone="teal" />
        <SummaryCard title="Admitted Today" value={String(counts.admitted)} icon={UserPlus} tone="purple" />
        <SummaryCard title="Rejected / Cancelled" value={String(counts.rejected)} icon={XCircle} tone="rose" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search by patient, request ID or hospital number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => { admAudit('Exported admission requests'); toast.success('Admission requests exported'); }}><Download className="h-4 w-4 mr-1.5" />Export</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                {['Request ID', 'Hospital No', 'Patient', 'Age/Sex', 'Doctor', 'Ward', 'Diagnosis', 'Bed', 'Payment', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>)}
                <th className="px-3 py-2 text-left sticky right-0 bg-muted/40 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? <EmptyRow cols={11} label="No admission requests." /> : filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 align-middle">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{r.hospitalId}</td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{r.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.age}/{r.gender}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.doctor}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.ward}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate" title={r.diagnosis}>{r.diagnosis}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{r.bed ?? r.bedStatus}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{r.paymentStatus}</td>
                  <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                  <td className="px-2 py-1.5 sticky right-0 bg-card shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                    <div className="inline-flex items-center gap-0.5 whitespace-nowrap">
                      <IconBtn title="View details" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Approve" ok onClick={() => setApproveRow(r)}><CheckCircle2 className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Send to Billing" onClick={() => setBillRow(r)}><Send className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Allocate Bed" onClick={() => { setBedRow(r); setBedWard(r.ward); setBedSelect(''); setBedNote(''); }}><BedDouble className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Admit Patient" onClick={() => setAdmitRow(r)}><UserPlus className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Reject" danger onClick={() => { setRejectRow(r); setRejectReason(''); setRejectNote(''); }}><XCircle className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Print Admission Form" onClick={() => setPrintRow(r)}><Printer className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== View Details ===== */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Admission Request — {detail?.id}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/30 rounded-lg p-3 border space-y-1">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Patient Biodata</h4>
                  <div><b>{detail.name}</b></div>
                  <div>Hospital No: {detail.hospitalId}</div>
                  <div>Age / Gender: {detail.age} / {detail.gender}</div>
                  <div>Phone: {detail.phone}</div>
                  <div>Next of Kin: {detail.nok}</div>
                  <div>Responsible Relative: {detail.responsible}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border space-y-1">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Clinical Request</h4>
                  <div>Requesting Doctor: {detail.doctor}</div>
                  <div>Department: {detail.department}</div>
                  <div>Requested Ward: {detail.ward}</div>
                  <div>Bed Class: {detail.bedClass}</div>
                  <div>Diagnosis: {detail.diagnosis}</div>
                  <div className="text-xs text-muted-foreground">Note: {detail.note}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border space-y-1">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Status</h4>
                  <div>Admission: <StatusBadge status={detail.status} /></div>
                  <div>Payment: <StatusBadge status={detail.paymentStatus} /></div>
                  <div>Bed: <StatusBadge status={detail.bedStatus} /> {detail.bed && <span className="text-xs">({detail.bed})</span>}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border">
                  <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-1">Timeline</h4>
                  <ol className="border-l pl-3 space-y-1 text-xs text-muted-foreground">
                    {detail.timeline.map((t, i) => <li key={i}><span className="font-mono text-foreground">{t.at}</span> — {t.event}</li>)}
                  </ol>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { if (detail) { setApproveRow(detail); setDetail(null); } }}><CheckCircle2 className="h-4 w-4 mr-1.5" />Approve</Button>
            <Button variant="outline" onClick={() => { if (detail) { setBillRow(detail); setDetail(null); } }}><Send className="h-4 w-4 mr-1.5" />Send to Billing</Button>
            <Button variant="outline" onClick={() => { if (detail) { setBedRow(detail); setBedWard(detail.ward); setDetail(null); } }}><BedDouble className="h-4 w-4 mr-1.5" />Allocate Bed</Button>
            <Button variant="outline" onClick={() => { if (detail) { setRejectRow(detail); setDetail(null); } }} className="text-rose-700"><XCircle className="h-4 w-4 mr-1.5" />Reject</Button>
            <Button variant="outline" onClick={() => { if (detail) { setPrintRow(detail); setDetail(null); } }}><Printer className="h-4 w-4 mr-1.5" />Print Form</Button>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Approve confirmation ===== */}
      <Dialog open={!!approveRow} onOpenChange={(v) => !v && setApproveRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Admission</DialogTitle></DialogHeader>
          <p className="text-sm">Approve admission for <b>{approveRow?.name}</b> ({approveRow?.hospitalId}) into <b>{approveRow?.ward}</b>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveRow(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!approveRow) return;
              updateRow(approveRow.id, { status: 'Approved' }, 'Approved');
              admAudit(`Approved ${approveRow.id} (${approveRow.name})`);
              toast.success('Admission approved');
              setApproveRow(null);
            }}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Send to Billing modal ===== */}
      <Dialog open={!!billRow} onOpenChange={(v) => !v && setBillRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Admission Billing — {billRow?.id}</DialogTitle></DialogHeader>
          {billRow && (
            <div className="text-sm space-y-2">
              <div><b>Patient:</b> {billRow.name} ({billRow.hospitalId})</div>
              <div className="border rounded-lg divide-y">
                {[
                  ['Registration fee', 1500],
                  ['Consultation fee', 5500],
                  ['Admission deposit', 50000],
                  [`Ward / bed estimate (${billRow.bedClass})`, billRow.bedClass === 'Private' ? 30000 : billRow.bedClass === 'Semi-Private' ? 15000 : 8000],
                  ['Outstanding balance', 0],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between px-3 py-2"><span>{k}</span><span className="font-medium">₦{(v as number).toLocaleString()}</span></div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">Current payment status: <b>{billRow.paymentStatus}</b></div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setBillRow(null)}>Close</Button>
            <Button onClick={() => { if (billRow) { updateRow(billRow.id, { paymentStatus: 'Pending' }, 'Marked sent to billing'); admAudit(`Marked ${billRow.id} sent to billing`); toast.success('Marked as sent to billing'); setBillRow(null); } }}>Mark Sent to Billing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Allocate Bed modal ===== */}
      <Dialog open={!!bedRow} onOpenChange={(v) => !v && setBedRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Bed — {bedRow?.name}</DialogTitle></DialogHeader>
          {bedRow && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Hospital No:</span> {bedRow.hospitalId}</div>
                <div><span className="text-muted-foreground">Requested Ward:</span> {bedRow.ward}</div>
                <div><span className="text-muted-foreground">Bed Class:</span> {bedRow.bedClass}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Available Ward</Label>
                  <Select value={bedWard} onValueChange={(v) => { setBedWard(v); setBedSelect(''); }}>
                    <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                    <SelectContent>{AVAILABLE_WARDS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Available Bed</Label>
                  <Select value={bedSelect} onValueChange={setBedSelect}>
                    <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                    <SelectContent>{(AVAILABLE_BEDS[bedWard] || []).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Allocation Note</Label><Textarea value={bedNote} onChange={(e) => setBedNote(e.target.value)} placeholder="Optional notes" /></div>
              <div className="text-xs text-muted-foreground">A full bed-board is also available at <button className="underline" onClick={() => navigate('/ipd/beds')}>IPD → Bed Board</button>.</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBedRow(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!bedRow) return;
              if (!bedWard || !bedSelect) { toast.error('Select ward and bed'); return; }
              updateRow(bedRow.id, { status: 'Bed Allocated', bedStatus: 'Allocated', bed: bedSelect, ward: bedWard }, `Bed ${bedSelect} allocated in ${bedWard}`);
              admAudit(`Allocated bed ${bedSelect} (${bedWard}) to ${bedRow.id}`);
              toast.success(`Bed ${bedSelect} allocated`);
              setBedRow(null);
            }}>Allocate Bed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Admit confirmation / warning ===== */}
      <Dialog open={!!admitRow} onOpenChange={(v) => !v && setAdmitRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Admit Patient</DialogTitle></DialogHeader>
          {admitRow && (() => {
            const missing = tryAdmit(admitRow);
            if (missing.length > 0) {
              return (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-amber-700"><AlertTriangle className="h-5 w-5 mt-0.5" /><div className="font-semibold">Cannot admit yet — requirements missing:</div></div>
                  <ul className="list-disc pl-6 text-sm">{missing.map(m => <li key={m}>{m}</li>)}</ul>
                  <p className="text-xs text-muted-foreground">Complete the missing steps above, then re-try.</p>
                </div>
              );
            }
            return <p className="text-sm">Admit <b>{admitRow.name}</b> into <b>{admitRow.ward}</b>{admitRow.bed ? ` (Bed ${admitRow.bed})` : ''}?</p>;
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmitRow(null)}>Close</Button>
            {admitRow && tryAdmit(admitRow).length === 0 && (
              <Button onClick={() => {
                updateRow(admitRow.id, { status: 'Admitted' }, 'Patient admitted');
                admAudit(`Admitted ${admitRow.id} (${admitRow.name})`);
                toast.success('Patient admitted');
                setAdmitRow(null);
              }}>Confirm Admission</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Reject modal ===== */}
      <Dialog open={!!rejectRow} onOpenChange={(v) => !v && setRejectRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Admission Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Rejection Reason *</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>{['No bed available', 'Patient not eligible', 'Incomplete clinical info', 'Payment not cleared', 'Patient declined', 'Other'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Additional Note</Label><Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!rejectRow) return;
              if (!rejectReason) { toast.error('Reason is required'); return; }
              updateRow(rejectRow.id, { status: 'Rejected' }, `Rejected — ${rejectReason}`);
              admAudit(`Rejected ${rejectRow.id} — ${rejectReason}${rejectNote ? ' · ' + rejectNote : ''}`);
              toast.success('Request rejected');
              setRejectRow(null);
            }}>Reject Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Print Admission Form ===== */}
      <Dialog open={!!printRow} onOpenChange={(v) => !v && setPrintRow(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Admission Form Preview</DialogTitle></DialogHeader>
          {printRow && (
            <div className="border rounded-lg p-4 bg-white text-sm space-y-2 text-black">
              <div className="text-center">
                <div className="font-bold text-base">Federal Neuro-Psychiatric Hospital, Aro</div>
                <div className="text-xs text-muted-foreground">Admission Request Form — {printRow.id}</div>
              </div>
              <div className="border-t pt-2 grid grid-cols-2 gap-y-1 gap-x-3">
                <div><b>Patient:</b> {printRow.name}</div>
                <div><b>Hospital No:</b> {printRow.hospitalId}</div>
                <div><b>Age / Gender:</b> {printRow.age} / {printRow.gender}</div>
                <div><b>Phone:</b> {printRow.phone}</div>
                <div className="col-span-2"><b>Next of Kin:</b> {printRow.nok}</div>
                <div><b>Doctor:</b> {printRow.doctor}</div>
                <div><b>Department:</b> {printRow.department}</div>
                <div><b>Requested Ward:</b> {printRow.ward}</div>
                <div><b>Bed Class:</b> {printRow.bedClass}</div>
                <div className="col-span-2"><b>Diagnosis / Reason:</b> {printRow.diagnosis}</div>
                <div><b>Payment Status:</b> {printRow.paymentStatus}</div>
                <div><b>Approval Status:</b> {printRow.status}</div>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Authorised signature: _____________________</div>
                <div className="h-16 w-16 border grid place-items-center text-[10px] text-muted-foreground">QR</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintRow(null)}>Close</Button>
            <Button onClick={() => { if (printRow) { admAudit(`Printed admission form for ${printRow.id}`); toast.success('Admission form sent to printer'); setPrintRow(null); } }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Shell>
  );
};

// ============================================================
// 3. DISCHARGE PROCESSING
// ============================================================
type DStatus = 'Pending Doctor Approval' | 'Doctor Approved' | 'Awaiting Billing Clearance' | 'Awaiting Nursing Clearance' | 'Awaiting Records Clearance' | 'Cleared for Discharge' | 'Discharged' | 'Cancelled';
type DBillStatus = 'Paid' | 'Part Payment' | 'Pending' | 'Waived' | 'Cancelled';
interface DBillLine { invoiceNo: string; service: string; department: string; date: string; amount: number; paid: number; status: DBillStatus; }
interface DRow {
  id: string; hospitalId: string; name: string; ward: string; bed: string; doctor: string; type: string;
  admissionDate: string; requestDate: string; time: string; status: DStatus;
  billingCleared: boolean; billing: DBillLine[];
}

const dischargeAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Discharge] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
};

const D_SEED: DRow[] = [
  {
    id: 'DC-3011', hospitalId: 'GFA HMS/2026/00145', name: 'John Doe', ward: 'Male Medical', bed: 'B-04',
    doctor: 'Dr. Okafor', type: 'Normal Discharge', admissionDate: '2026-04-22', requestDate: '2026-04-28',
    time: '07:40', status: 'Pending Doctor Approval', billingCleared: false,
    billing: [
      { invoiceNo: 'INV-90011', service: 'Admission Fee (6 days)', department: 'Records', date: '2026-04-22', amount: 30000, paid: 30000, status: 'Paid' },
      { invoiceNo: 'INV-90012', service: 'Ward Charges — Male Medical', department: 'Nursing', date: '2026-04-23', amount: 24000, paid: 24000, status: 'Paid' },
      { invoiceNo: 'INV-90013', service: 'IV Antibiotics — Ceftriaxone', department: 'Pharmacy', date: '2026-04-24', amount: 8500, paid: 4000, status: 'Part Payment' },
      { invoiceNo: 'INV-90014', service: 'FBC + E/U/Cr', department: 'Laboratory', date: '2026-04-25', amount: 6500, paid: 6500, status: 'Paid' },
    ],
  },
  {
    id: 'DC-3012', hospitalId: 'GFA HMS/2026/00148', name: 'Funke Adeyemi', ward: 'Psychiatry', bed: 'P-02',
    doctor: 'Dr. Adewale', type: 'Normal Discharge', admissionDate: '2026-04-15', requestDate: '2026-04-28',
    time: '08:05', status: 'Awaiting Billing Clearance', billingCleared: false,
    billing: [
      { invoiceNo: 'INV-90021', service: 'Admission Fee (13 days)', department: 'Records', date: '2026-04-15', amount: 65000, paid: 50000, status: 'Part Payment' },
      { invoiceNo: 'INV-90022', service: 'Psychotropic Medications', department: 'Pharmacy', date: '2026-04-18', amount: 18500, paid: 18500, status: 'Paid' },
      { invoiceNo: 'INV-90023', service: 'Psychiatry Consultation', department: 'Doctor', date: '2026-04-20', amount: 12000, paid: 0, status: 'Pending' },
      { invoiceNo: 'INV-90024', service: 'Counselling Session', department: 'Psychology', date: '2026-04-24', amount: 8000, paid: 8000, status: 'Waived' },
    ],
  },
  {
    id: 'DC-3013', hospitalId: 'GFA HMS/2026/00149', name: 'Ibrahim Musa', ward: 'Cardiology', bed: 'C-01',
    doctor: 'Dr. Eze', type: 'DAMA', admissionDate: '2026-04-25', requestDate: '2026-04-28',
    time: '08:20', status: 'Awaiting Records Clearance', billingCleared: false,
    billing: [
      { invoiceNo: 'INV-90031', service: 'Admission Fee (3 days)', department: 'Records', date: '2026-04-25', amount: 15000, paid: 15000, status: 'Paid' },
      { invoiceNo: 'INV-90032', service: 'ECG + Echocardiogram', department: 'Cardiology', date: '2026-04-26', amount: 22000, paid: 22000, status: 'Paid' },
    ],
  },
  {
    id: 'DC-3014', hospitalId: 'GFA HMS/2026/00150', name: 'Ngozi Okoro', ward: 'Female Medical', bed: 'F-07',
    doctor: 'Dr. Okafor', type: 'Referral Out', admissionDate: '2026-04-20', requestDate: '2026-04-28',
    time: '08:30', status: 'Cleared for Discharge', billingCleared: true,
    billing: [
      { invoiceNo: 'INV-90041', service: 'Admission Fee (8 days)', department: 'Records', date: '2026-04-20', amount: 40000, paid: 40000, status: 'Paid' },
      { invoiceNo: 'INV-90042', service: 'Radiology — Chest X-ray', department: 'Radiology', date: '2026-04-22', amount: 9500, paid: 9500, status: 'Paid' },
      { invoiceNo: 'INV-90043', service: 'Referral Documentation', department: 'Records', date: '2026-04-28', amount: 2500, paid: 2500, status: 'Paid' },
    ],
  },
];

const billStatusTone: Record<DBillStatus, string> = {
  'Paid': 'bg-emerald-100 text-emerald-700',
  'Part Payment': 'bg-amber-100 text-amber-700',
  'Pending': 'bg-rose-100 text-rose-700',
  'Waived': 'bg-sky-100 text-sky-700',
  'Cancelled': 'bg-slate-200 text-slate-700',
};

const sumBilling = (lines: DBillLine[]) => {
  const total = lines.filter(l => l.status !== 'Cancelled' && l.status !== 'Waived').reduce((a, l) => a + l.amount, 0);
  const paid = lines.reduce((a, l) => a + l.paid, 0);
  const balance = Math.max(0, total - paid);
  return { total, paid, balance };
};

export const DischargeProcessing = () => {
  const [rows, setRows] = useState<DRow[]>(D_SEED);
  const [detail, setDetail] = useState<DRow | null>(null);
  const [billRow, setBillRow] = useState<DRow | null>(null);
  const [printBill, setPrintBill] = useState<DRow | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; row?: DRow; action?: 'start' | 'records' | 'final' }>({ open: false });

  const update = (id: string, patch: Partial<DRow>) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  const setStatus = (id: string, status: DStatus) => update(id, { status });

  const c = {
    pending: rows.filter(r => r.status === 'Pending Doctor Approval').length,
    approved: rows.filter(r => r.status === 'Doctor Approved').length,
    bill: rows.filter(r => r.status === 'Awaiting Billing Clearance').length,
    rec: rows.filter(r => r.status === 'Awaiting Records Clearance').length,
    cleared: rows.filter(r => r.status === 'Cleared for Discharge').length,
    done: rows.filter(r => r.status === 'Discharged').length,
  };

  const openBilling = (r: DRow) => {
    setBillRow(r);
    dischargeAudit(`Opened billing history for ${r.id} (${r.name})`);
  };

  const markBillingCleared = (r: DRow) => {
    const { balance } = sumBilling(r.billing);
    if (balance > 0) {
      toast.warning(`Cannot clear billing — outstanding ₦${balance.toLocaleString()} on patient account.`);
      return;
    }
    update(r.id, { billingCleared: true, status: r.status === 'Awaiting Billing Clearance' ? 'Awaiting Nursing Clearance' : r.status });
    dischargeAudit(`Marked billing cleared for ${r.id} (${r.name})`);
    toast.success('Billing cleared');
    setBillRow(prev => prev && prev.id === r.id ? { ...prev, billingCleared: true } : prev);
  };

  const printSummary = (r: DRow) => {
    setPrintBill(r);
    dischargeAudit(`Opened print preview — billing summary for ${r.id}`);
  };

  return (
    <Shell title="Discharge Processing" breadcrumb="Discharge Processing">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Pending Discharges" value={String(c.pending)} icon={Activity} tone="amber" />
        <SummaryCard title="Doctor Approved" value={String(c.approved)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Awaiting Billing" value={String(c.bill)} icon={ClipboardList} tone="blue" />
        <SummaryCard title="Awaiting Records" value={String(c.rec)} icon={FileText} tone="purple" />
        <SummaryCard title="Cleared" value={String(c.cleared)} icon={CheckCircle2} tone="teal" />
        <SummaryCard title="Discharged Today" value={String(c.done)} icon={FileCheck} tone="rose" />
      </div>

      <div className="bg-card rounded-xl border p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{['ID','Hospital No','Patient','Ward','Bed','Doctor','Type','Requested','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.id}</td>
                  <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.ward}</td>
                  <td className="px-3 py-2">{r.bed}</td>
                  <td className="px-3 py-2">{r.doctor}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.time}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" variant="ghost" title="View" onClick={() => setDetail(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Start Clearance" onClick={() => setConfirm({ open: true, row: r, action: 'start' })}><Activity className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Billing History" onClick={() => openBilling(r)}><ClipboardList className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Mark Records Cleared" onClick={() => setConfirm({ open: true, row: r, action: 'records' })}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                      <Button size="sm" variant="ghost" title="Final Checkout" onClick={() => setConfirm({ open: true, row: r, action: 'final' })}><FileCheck className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Print Slip" onClick={() => { dischargeAudit(`Printed discharge slip for ${r.id}`); toast.success('Discharge slip queued'); }}><Printer className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open} onOpenChange={(v) => setConfirm({ open: v })}
        title={confirm.action === 'start' ? 'Start Clearance' : confirm.action === 'records' ? 'Mark Records Cleared' : 'Final Checkout'}
        description={`${confirm.row?.name ?? ''} — ${confirm.row?.ward ?? ''}`}
        onConfirm={() => {
          if (!confirm.row) return;
          const r = confirm.row;
          if (confirm.action === 'start') { setStatus(r.id, 'Awaiting Billing Clearance'); dischargeAudit(`Started clearance for ${r.id}`); toast.success('Clearance started'); }
          if (confirm.action === 'records') { setStatus(r.id, 'Cleared for Discharge'); dischargeAudit(`Records cleared for ${r.id}`); toast.success('Records cleared'); }
          if (confirm.action === 'final') {
            const bal = sumBilling(r.billing).balance;
            if (bal > 0 || !r.billingCleared) {
              toast.warning('Patient has outstanding bill and cannot be finally discharged until billing clearance is completed.');
              return;
            }
            setStatus(r.id, 'Discharged');
            dischargeAudit(`Final discharge completed for ${r.id}`);
            toast.success('Patient discharged');
          }
        }}
      />

      {/* Quick view */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Discharge — {detail?.id}</DialogTitle></DialogHeader>
          {detail && (() => { const s = sumBilling(detail.billing); return (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><h4 className="font-semibold mb-1">Patient & Ward</h4><div>{detail.name} ({detail.hospitalId})</div><div>{detail.ward} — Bed {detail.bed}</div></div>
              <div><h4 className="font-semibold mb-1">Doctor Summary</h4><div>{detail.doctor} — {detail.type}</div><div className="text-xs text-muted-foreground">Admitted {detail.admissionDate} · Requested {detail.requestDate}</div></div>
              <div className="md:col-span-2"><h4 className="font-semibold mb-1">Clearance Checklist</h4>
                <ul className="space-y-1 text-xs">
                  <li>✓ Doctor approval</li>
                  <li>{detail.billingCleared ? '✓' : '○'} Billing clearance — {s.balance > 0 ? `₦${s.balance.toLocaleString()} outstanding` : 'fully paid'}</li>
                  <li>○ Nursing sign-off</li>
                  <li>○ Records sign-off</li>
                </ul>
              </div>
            </div>
          ); })()}
          <DialogFooter><Button onClick={() => setDetail(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing modal */}
      <Dialog open={!!billRow} onOpenChange={(v) => !v && setBillRow(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Discharge Billing History — {billRow?.name}</DialogTitle>
          </DialogHeader>
          {billRow && (() => {
            const s = sumBilling(billRow.billing);
            const payStatus: DBillStatus = s.balance === 0 ? 'Paid' : (s.paid > 0 ? 'Part Payment' : 'Pending');
            return (
              <div className="space-y-4">
                {s.balance > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <div>Patient has outstanding bill of <strong>₦{s.balance.toLocaleString()}</strong> and cannot be finally discharged until billing clearance is completed.</div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Patient</div><div className="font-semibold">{billRow.name}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Hospital No</div><div className="font-semibold">{billRow.hospitalId}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Ward / Bed</div><div className="font-semibold">{billRow.ward} · {billRow.bed}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Admission</div><div className="font-semibold">{billRow.admissionDate}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Discharge Request</div><div className="font-semibold">{billRow.requestDate}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Total Bill</div><div className="font-semibold">₦{s.total.toLocaleString()}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Amount Paid</div><div className="font-semibold text-emerald-700">₦{s.paid.toLocaleString()}</div></div>
                  <div className={`rounded-md border p-2 ${s.balance > 0 ? 'bg-rose-50' : ''}`}><div className="text-muted-foreground">Outstanding</div><div className={`font-semibold ${s.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>₦{s.balance.toLocaleString()}</div></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Payment Status</div><span className={`inline-block px-2 py-0.5 rounded text-xs ${billStatusTone[payStatus]}`}>{payStatus}</span></div>
                  <div className="rounded-md border p-2"><div className="text-muted-foreground">Billing Clearance</div><span className={`inline-block px-2 py-0.5 rounded text-xs ${billRow.billingCleared ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{billRow.billingCleared ? 'Cleared' : 'Not Cleared'}</span></div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 uppercase text-muted-foreground">
                      <tr>{['Invoice No.','Service / Item','Department','Invoice Date','Amount','Paid','Balance','Status'].map(h => <th key={h} className="px-2 py-2 text-left">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {billRow.billing.map(l => {
                        const bal = Math.max(0, l.amount - l.paid);
                        return (
                          <tr key={l.invoiceNo}>
                            <td className="px-2 py-2 font-medium">{l.invoiceNo}</td>
                            <td className="px-2 py-2">{l.service}</td>
                            <td className="px-2 py-2">{l.department}</td>
                            <td className="px-2 py-2">{l.date}</td>
                            <td className="px-2 py-2">₦{l.amount.toLocaleString()}</td>
                            <td className="px-2 py-2 text-emerald-700">₦{l.paid.toLocaleString()}</td>
                            <td className={`px-2 py-2 ${bal > 0 ? 'text-rose-700' : ''}`}>₦{bal.toLocaleString()}</td>
                            <td className="px-2 py-2"><span className={`inline-block px-2 py-0.5 rounded ${billStatusTone[l.status]}`}>{l.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          <DialogFooter className="flex-wrap gap-2">
            <Button onClick={() => billRow && markBillingCleared(billRow)} disabled={!!billRow && sumBilling(billRow.billing).balance > 0}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark Billing Cleared
            </Button>
            <Button variant="outline" onClick={() => billRow && printSummary(billRow)}><Printer className="h-4 w-4 mr-1.5" />Print Billing Summary</Button>
            <Button variant="ghost" onClick={() => setBillRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable billing summary preview */}
      <Dialog open={!!printBill} onOpenChange={(v) => !v && setPrintBill(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Billing Summary — Print Preview</DialogTitle></DialogHeader>
          {printBill && (() => { const s = sumBilling(printBill.billing); return (
            <div className="border rounded-md p-6 text-sm space-y-3 bg-white">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="text-base font-bold">GFA HMS — GFA Demo Hospital</div>
                  <div className="text-xs text-muted-foreground">Discharge Billing Summary</div>
                </div>
                <div className="text-xs text-right">
                  <div>Ref: {printBill.id}</div>
                  <div>Printed: {new Date().toLocaleString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>Patient:</strong> {printBill.name}</div>
                <div><strong>Hospital No:</strong> {printBill.hospitalId}</div>
                <div><strong>Ward / Bed:</strong> {printBill.ward} · {printBill.bed}</div>
                <div><strong>Doctor:</strong> {printBill.doctor}</div>
                <div><strong>Admitted:</strong> {printBill.admissionDate}</div>
                <div><strong>Discharge Request:</strong> {printBill.requestDate}</div>
              </div>
              <table className="w-full text-xs border">
                <thead className="bg-muted/40"><tr>{['Invoice','Service','Dept','Date','Amount','Paid','Balance','Status'].map(h => <th key={h} className="px-2 py-1 text-left border">{h}</th>)}</tr></thead>
                <tbody>
                  {printBill.billing.map(l => (
                    <tr key={l.invoiceNo}>
                      <td className="px-2 py-1 border">{l.invoiceNo}</td>
                      <td className="px-2 py-1 border">{l.service}</td>
                      <td className="px-2 py-1 border">{l.department}</td>
                      <td className="px-2 py-1 border">{l.date}</td>
                      <td className="px-2 py-1 border">₦{l.amount.toLocaleString()}</td>
                      <td className="px-2 py-1 border">₦{l.paid.toLocaleString()}</td>
                      <td className="px-2 py-1 border">₦{Math.max(0, l.amount - l.paid).toLocaleString()}</td>
                      <td className="px-2 py-1 border">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-semibold">
                  <tr><td className="px-2 py-1 border" colSpan={4}>Totals</td><td className="px-2 py-1 border">₦{s.total.toLocaleString()}</td><td className="px-2 py-1 border">₦{s.paid.toLocaleString()}</td><td className="px-2 py-1 border">₦{s.balance.toLocaleString()}</td><td className="px-2 py-1 border">{printBill.billingCleared ? 'Cleared' : 'Not Cleared'}</td></tr>
                </tfoot>
              </table>
            </div>
          ); })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintBill(null)}>Close</Button>
            <Button onClick={() => { if (printBill) { dischargeAudit(`Printed billing summary for ${printBill.id}`); window.print(); } }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 4. PATIENT DIRECTORY
// ============================================================
type DirPatient = DirectoryPatient;

function dirAuditLog(action: string) {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Patient Directory] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

// Extra fields for quick view / edit — API fields only (no fabricated demo values)
const extras = (p: DirPatient) => ({
  email: p.email || '—',
  patientType: p.patientType || p.source || '—',
  clinic: p.clinic || '—',
  lastVisit: p.lastVisit || p.registeredOn || '—',
  status: p.status || 'Active',
  nokName: p.nokName || '—',
  nokPhone: p.nokPhone || '—',
  emergencyContact: p.nokPhone || '—',
  responsibleRelative: '—',
  conditions: '—',
  medications: '—',
});

function EditPatientModal({ patient, open, onOpenChange }: { patient: DirPatient | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const ext = patient ? extras(patient) : null;
  const [form, setForm] = useState<any>({});
  // re-sync when patient changes
  useMemo(() => { if (patient && ext) setForm({ ...patient, ...ext, specifyDisability: '' }); }, [patient]);
  if (!patient) return null;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.name?.trim() || !form.phone?.trim()) { toast.error('Name and phone are required'); return; }
    dirAuditLog(`Edited patient ${patient.hospitalId}`);
    toast.success('Patient record updated successfully');
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Patient — {patient.name}</DialogTitle></DialogHeader>
        <Tabs defaultValue="bio">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="bio">Biodata</TabsTrigger>
            <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            <TabsTrigger value="nok">Next of Kin</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
            <TabsTrigger value="responsible">Responsible Relative</TabsTrigger>
            <TabsTrigger value="payment">Payment / Insurance</TabsTrigger>
            <TabsTrigger value="medical">Medical Status</TabsTrigger>
            <TabsTrigger value="referral">Referral Info</TabsTrigger>
          </TabsList>

          <TabsContent value="bio" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Hospital Number</Label><Input value={patient.hospitalId} readOnly className="bg-muted/40" /></div>
            <div><Label>Patient ID</Label><Input value={patient.id} readOnly className="bg-muted/40" /></div>
            <div><Label>Registration Date</Label><Input value={patient.registeredOn} readOnly className="bg-muted/40" /></div>
            <div><Label>Full Name *</Label><Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
            <div><Label>Age</Label><Input type="number" value={form.age || ''} onChange={(e) => set('age', Number(e.target.value))} /></div>
            <div><Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Blood Group</Label><Input value={form.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="contact" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Phone *</Label><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><Label>Email</Label><Input value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
            <div><Label>NIN</Label><Input value={form.nin || ''} onChange={(e) => set('nin', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="nok" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>NoK Name</Label><Input value={form.nokName || ''} onChange={(e) => set('nokName', e.target.value)} /></div>
            <div><Label>NoK Phone</Label><Input value={form.nokPhone || ''} onChange={(e) => set('nokPhone', e.target.value)} /></div>
            <div><Label>Relationship</Label><Input placeholder="e.g. Spouse, Parent" onChange={(e) => set('nokRel', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="emergency" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Contact Name</Label><Input value={form.emergencyContact || ''} onChange={(e) => set('emergencyContact', e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={form.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="responsible" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Responsible Relative</Label><Input value={form.responsibleRelative || ''} onChange={(e) => set('responsibleRelative', e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.responsiblePhone || ''} onChange={(e) => set('responsiblePhone', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="payment" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Payment Category</Label>
              <Select value={form.insurance} onValueChange={(v) => set('insurance', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Private','NHIS','HMO','None'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Provider</Label><Input placeholder="e.g. Hygeia, AXA" onChange={(e) => set('hmoProvider', e.target.value)} /></div>
            <div><Label>Policy Number</Label><Input onChange={(e) => set('policyNo', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="medical" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Allergies</Label><Input value={form.allergies || ''} onChange={(e) => set('allergies', e.target.value)} /></div>
            <div><Label>Existing Conditions</Label><Input value={form.conditions || ''} onChange={(e) => set('conditions', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Current Medications</Label><Textarea value={form.medications || ''} onChange={(e) => set('medications', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="referral" className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div><Label>Referred By</Label><Input onChange={(e) => set('referredBy', e.target.value)} /></div>
            <div><Label>Source Facility</Label><Input onChange={(e) => set('refFacility', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Reason for Referral</Label><Textarea onChange={(e) => set('refReason', e.target.value)} /></div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => { dirAuditLog(`Viewed audit history for ${patient.hospitalId}`); toast.info('Audit history opened'); }}>View Audit Changes</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const PatientDirectory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [gender, setGender] = useState('all');
  const [insurance, setInsurance] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(RECORDS_PAGE_SIZE);
  const [quickView, setQuickView] = useState<DirPatient | null>(null);
  const [editPatient, setEditPatient] = useState<DirPatient | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string; action?: 'archive' | 'merge' }>({ open: false });
  const [rows, setRows] = useState<DirPatient[]>([]);
  const [stats, setStats] = useState<DirectoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadDirectory = useCallback(async () => {
    if (!isRecordsApiEnabled()) {
      setRows([]);
      setTotal(0);
      setStats(null);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const [list, dirStats] = await Promise.all([
        listDirectory({
          q: search.trim() || undefined,
          sex: gender,
          insurance,
          page,
          limit: pageSize,
        }),
        getDirectoryStats(),
      ]);
      setRows(list.items);
      setTotal(list.meta.total);
      setStats(dirStats);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load patient directory');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, gender, insurance, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, gender, insurance]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadDirectory(), 300);
    return () => window.clearTimeout(t);
  }, [loadDirectory]);

  const filtered = rows;
  const qvExt = quickView ? extras(quickView) : null;

  return (
    <Shell title="Patient Directory" breadcrumb="Patient Directory">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Patients" value={String(stats?.totalPatients ?? total)} icon={Users} tone="blue" />
        <SummaryCard title="New This Month" value={String(stats?.newThisMonth ?? '—')} icon={UserPlus} tone="teal" />
        <SummaryCard title="Active" value={String(stats?.active ?? '—')} icon={Activity} tone="green" />
        <SummaryCard title="Inpatients" value={String(stats?.inpatients ?? '—')} icon={BedDouble} tone="purple" />
        <SummaryCard title="Outpatients" value={String(stats?.outpatients ?? '—')} icon={Stethoscope} tone="amber" />
        <SummaryCard title="HMO / NHIA" value={String(stats?.hmoNhia ?? filtered.filter(p => p.insurance === 'NHIS' || p.insurance === 'HMO').length)} icon={FileCheck} tone="indigo" />
        <SummaryCard title="Incomplete Profiles" value={String(stats?.incompleteProfiles ?? '—')} icon={AlertTriangle} tone="rose" />
        <SummaryCard title="Duplicates Flagged" value={String(stats?.duplicatesFlagged ?? '—')} icon={Flag} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search hospital no, name, phone, NIN" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Genders</SelectItem><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
          </Select>
          <Select value={insurance} onValueChange={setInsurance}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {['NHIS', 'HMO', 'Private'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={loading} onClick={() => void loadDirectory()}><RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button variant="outline" onClick={() => { dirAuditLog('Exported patient directory'); toast.success('Directory exported'); }}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button onClick={() => navigate('/hms/identity')}><UserPlus className="h-4 w-4 mr-1.5" />New Patient</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{['Hospital No','Name','Age','Gender','Phone','Type','Category','Last Visit','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <EmptyRow cols={10} label="Loading patient directory…" />
              ) : filtered.length === 0 ? (
                <EmptyRow cols={10} label="No patients match your filters." />
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{p.hospitalId}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2">{p.age}</td>
                  <td className="px-3 py-2">{p.gender}</td>
                  <td className="px-3 py-2">{p.phone}</td>
                  <td className="px-3 py-2">{p.source}</td>
                  <td className="px-3 py-2">{p.insurance}</td>
                  <td className="px-3 py-2">{('lastVisit' in p && p.lastVisit) || p.registeredOn}</td>
                  <td className="px-3 py-2"><StatusBadge status={(('status' in p && p.status) || 'Active') as string} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Quick View" onClick={() => { setQuickView(p); dirAuditLog(`Viewed ${p.hospitalId}`); }}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditPatient(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Print Card" onClick={() => { dirAuditLog(`Printed card for ${p.hospitalId}`); toast.success('Patient card sent to printer'); }}><Printer className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="History" onClick={() => navigate(`/records/patient-directory/${p.id}/history`)}><History className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Documents" onClick={() => navigate(`/records/patient-directory/${p.id}/documents`)}><FileText className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Merge Duplicate" onClick={() => setConfirm({ open: true, id: p.id, action: 'merge' })}><Flag className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Archive" onClick={() => setConfirm({ open: true, id: p.id, action: 'archive' })}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RecordsListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={setPage}
          label="patients"
        />
      </div>

      {/* Quick View Modal */}
      <Dialog open={!!quickView} onOpenChange={(v) => !v && setQuickView(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Patient Quick View</DialogTitle></DialogHeader>
          {quickView && qvExt && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border">
                  {quickView.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-lg">{quickView.name}</div>
                  <div className="text-xs text-muted-foreground">{quickView.hospitalId}</div>
                  <div className="mt-1"><StatusBadge status={qvExt.status} /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div><b>Age:</b> {quickView.age}</div>
                <div><b>Gender:</b> {quickView.gender}</div>
                <div><b>Phone:</b> {quickView.phone}</div>
                <div><b>Email:</b> {qvExt.email}</div>
                <div className="sm:col-span-2"><b>Address:</b> {quickView.address}</div>
                <div><b>Patient Type:</b> {qvExt.patientType}</div>
                <div><b>Payment Category:</b> {quickView.insurance}</div>
                <div><b>Clinic / Department:</b> {qvExt.clinic}</div>
                <div><b>Registration Date:</b> {quickView.registeredOn}</div>
                <div><b>Last Visit:</b> {qvExt.lastVisit}</div>
                <div><b>Blood Group:</b> {quickView.bloodGroup}</div>
              </div>

              <div className="border-t pt-2 text-sm space-y-1">
                <div><b>Next of Kin:</b> {qvExt.nokName} ({qvExt.nokPhone})</div>
                <div><b>Emergency Contact:</b> {qvExt.emergencyContact}</div>
                <div><b>Responsible Relative:</b> {qvExt.responsibleRelative}</div>
              </div>

              <div className="border-t pt-2 text-sm space-y-1">
                <div><b>Allergies:</b> {quickView.allergies}</div>
                <div><b>Existing Conditions:</b> {qvExt.conditions}</div>
                <div><b>Current Medications:</b> {qvExt.medications}</div>
              </div>

              <div className="border-t pt-2">
                <div className="text-xs uppercase text-muted-foreground mb-1">Recent Visits</div>
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  <li>2026-04-22 — OPD follow-up (Dr. Adewale)</li>
                  <li>2026-03-18 — Adult Psychiatry review (Dr. Bello)</li>
                  <li>2026-02-08 — Emergency admission</li>
                </ul>
              </div>

              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1">Recent Documents</div>
                <ul className="text-sm list-disc pl-5 space-y-0.5">
                  <li>Discharge Summary — 2026-02-14</li>
                  <li>Lab Report (FBC) — 2026-04-22</li>
                  <li>Consent Form — 2026-03-25</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => { if (quickView) navigate(`/records/patient-directory/${quickView.id}/history`); }}><History className="h-4 w-4 mr-1.5" />View History</Button>
            <Button variant="outline" onClick={() => { if (quickView) navigate(`/records/patient-directory/${quickView.id}/documents`); }}><FileText className="h-4 w-4 mr-1.5" />View Documents</Button>
            <Button variant="outline" onClick={() => { if (quickView) { setEditPatient(quickView); setQuickView(null); } }}><Edit className="h-4 w-4 mr-1.5" />Edit Patient</Button>
            <Button variant="outline" onClick={() => { if (quickView) { dirAuditLog(`Printed card for ${quickView.hospitalId}`); toast.success('Patient card sent to printer'); } }}><Printer className="h-4 w-4 mr-1.5" />Print Card</Button>
            <Button onClick={() => { if (quickView) { dirAuditLog(`Opened full profile for ${quickView.hospitalId}`); const id = quickView.id; setQuickView(null); navigate(`/records/patient-directory/${id}/profile`); } }}>View Full Profile</Button>
            <Button variant="outline" onClick={() => setQuickView(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditPatientModal patient={editPatient} open={!!editPatient} onOpenChange={(v) => !v && setEditPatient(null)} />

      <ConfirmDialog
        open={confirm.open} onOpenChange={(v) => setConfirm({ open: v })}
        title={confirm.action === 'archive' ? 'Archive Patient' : 'Merge Duplicate'}
        description="This will update the patient record."
        requireReason={confirm.action === 'archive'} danger={confirm.action === 'archive'}
        onConfirm={(reason) => {
          dirAuditLog(`${confirm.action === 'archive' ? 'Archived' : 'Merged'} patient ${confirm.id ?? ''}${reason ? ' — ' + reason : ''}`);
          toast.success(confirm.action === 'archive' ? 'Patient archived' : 'Records merged');
        }}
      />
    </Shell>
  );
};

// ============================================================
// 5. DOCUMENT MANAGEMENT
// ============================================================
type DocStatus = 'Uploaded' | 'Pending Review' | 'Verified' | 'Rejected' | 'Archived';
interface DocRow { id: string; hospitalId: string; patient: string; type: string; uploadedBy: string; date: string; status: DocStatus; }
const DOC_SEED: DocRow[] = [
  { id: 'DOC-001', hospitalId: 'GFA HMS/2026/00145', patient: 'John Doe', type: 'Consent Form', uploadedBy: 'Adebola O.', date: '2026-04-28 08:10', status: 'Verified' },
  { id: 'DOC-002', hospitalId: 'GFA HMS/2026/00146', patient: 'Amina Yusuf', type: 'Referral Letter', uploadedBy: 'Tunde A.', date: '2026-04-28 08:30', status: 'Pending Review' },
  { id: 'DOC-003', hospitalId: 'GFA HMS/2026/00147', patient: 'Chidi Eze', type: 'Lab Report', uploadedBy: 'Dr. Eze', date: '2026-04-28 08:45', status: 'Uploaded' },
  { id: 'DOC-004', hospitalId: 'GFA HMS/2026/00148', patient: 'Funke Adeyemi', type: 'Discharge Summary', uploadedBy: 'Dr. Adewale', date: '2026-04-27 16:20', status: 'Verified' },
];

const docAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Documents] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
};

export const DocumentManagement = () => {
  const [rows, setRows] = useState<DocRow[]>(DOC_SEED);
  const [upload, setUpload] = useState(false);
  const [reject, setReject] = useState<DocRow | null>(null);
  const [verifyRow, setVerifyRow] = useState<DocRow | null>(null);
  const [archiveRow, setArchiveRow] = useState<DocRow | null>(null);
  const [preview, setPreview] = useState<DocRow | null>(null);
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? rows : rows.filter(r => r.type === filterType);
  const update = (id: string, status: DocStatus) => setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));

  return (
    <Shell title="Document Management" breadcrumb="Document Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Documents" value={String(rows.length)} icon={FileText} tone="blue" />
        <SummaryCard title="Uploaded Today" value="6" icon={Upload} tone="teal" />
        <SummaryCard title="Pending Review" value={String(rows.filter(r => r.status === 'Pending Review').length)} icon={Activity} tone="amber" />
        <SummaryCard title="Verified" value={String(rows.filter(r => r.status === 'Verified').length)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Referral Letters" value={String(rows.filter(r => r.type === 'Referral Letter').length)} icon={Send} tone="purple" />
        <SummaryCard title="Consent Forms" value={String(rows.filter(r => r.type === 'Consent Form').length)} icon={ClipboardCheck} tone="indigo" />
        <SummaryCard title="Discharge Docs" value={String(rows.filter(r => r.type === 'Discharge Summary').length)} icon={FileCheck} tone="rose" />
        <SummaryCard title="Missing Required" value="2" icon={AlertTriangle} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {['Registration Forms','Consent Form','Referral Letter','Lab Report','Radiology Report','Discharge Summary','Admission Form','HMO / NHIA','Court / Legal','Old Scanned','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => toast.info('Opening scanner interface...')}><Upload className="h-4 w-4 mr-1.5" />Scan</Button>
            <Button onClick={() => setUpload(true)}><Upload className="h-4 w-4 mr-1.5" />Upload Document</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{['Doc ID','Hospital No','Patient','Type','Uploaded By','Date','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? <EmptyRow cols={8} label="No documents in this category." /> : filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{r.id}</td>
                  <td className="px-3 py-2 text-xs">{r.hospitalId}</td>
                  <td className="px-3 py-2">{r.patient}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2">{r.uploadedBy}</td>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Preview" onClick={() => setPreview(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Download" onClick={() => toast.success('Download started')}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Verify" onClick={() => setVerifyRow(r)}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                      <Button size="sm" variant="ghost" title="Reject" onClick={() => setReject(r)}><XCircle className="h-3.5 w-3.5 text-rose-600" /></Button>
                      <Button size="sm" variant="ghost" title="Archive" onClick={() => setArchiveRow(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={upload} onOpenChange={setUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Patient</Label><Input placeholder="Search by hospital number or name" /></div>
            <div><Label>Document Type</Label>
              <Select defaultValue="Consent Form">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Registration Forms','Consent Form','Referral Letter','Lab Report','Radiology Report','Discharge Summary','Admission Form','HMO / NHIA','Court / Legal','Old Scanned','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>File (PDF, JPG, PNG, DOC)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></div>
            <div><Label>Description</Label><Textarea placeholder="Optional notes" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Mark as confidential</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpload(false)}>Cancel</Button>
            <Button onClick={() => { setUpload(false); toast.success('Document uploaded'); }}>Save Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{preview?.type} — {preview?.patient}</DialogTitle></DialogHeader>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">Document preview (OCR-ready)</div>
          <DialogFooter><Button onClick={() => setPreview(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!reject} onOpenChange={(v) => !v && setReject(null)}
        title="Reject Document" description={reject?.patient ?? ''} requireReason danger
        onConfirm={() => { if (reject) { update(reject.id, 'Rejected'); docAudit(`Rejected ${reject.id} (${reject.type}) — ${reject.patient}`); toast.success('Document rejected'); } }}
      />

      <Dialog open={!!verifyRow} onOpenChange={(v) => !v && setVerifyRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Document Verification</DialogTitle></DialogHeader>
          {verifyRow && (
            <div className="text-sm space-y-2">
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
                <div><span className="text-muted-foreground">Document:</span> <b>{verifyRow.type}</b></div>
                <div><span className="text-muted-foreground">Patient:</span> <b>{verifyRow.patient}</b></div>
                <div><span className="text-muted-foreground">Hospital Number:</span> <b>{verifyRow.hospitalId}</b></div>
              </div>
              <p className="text-xs text-muted-foreground">This will mark the document as verified and update the patient record.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyRow(null)}>Cancel</Button>
            <Button onClick={() => {
              if (!verifyRow) return;
              update(verifyRow.id, 'Verified');
              docAudit(`Verified ${verifyRow.id} (${verifyRow.type}) — ${verifyRow.patient} (${verifyRow.hospitalId})`);
              toast.success('Document verified successfully');
              setVerifyRow(null);
            }}>Confirm Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archiveRow} onOpenChange={(v) => !v && setArchiveRow(null)}
        title="Archive Document"
        description={archiveRow ? `${archiveRow.type} — ${archiveRow.patient} (${archiveRow.hospitalId})` : ''}
        requireReason danger
        onConfirm={(reason) => {
          if (!archiveRow) return;
          update(archiveRow.id, 'Archived');
          docAudit(`Archived ${archiveRow.id} (${archiveRow.type}) — ${archiveRow.patient}. Reason: ${reason}`);
          toast.success('Document archived successfully');
          setArchiveRow(null);
        }}
      />
    </Shell>
  );
};

// ============================================================
// 6. DAILY REPORTS
// ============================================================
const REPORTS = [
  'Daily Registration Report','Daily Attendance Report','Walk-In Patient Report','Internal Referral Report',
  'Admission Request Report','Discharge Report','Triage Queue Report','Patient Movement Report',
  'HMO / NHIA Patient Report','Document Upload Report','Records Officer Activity Report',
];

const reportsAudit = (action: string) => {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Reports] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
};

export const DailyReports_MockLegacy = () => {
  const [type, setType] = useState(REPORTS[0]);
  const [startDate, setStartDate] = useState('2026-04-22');
  const [endDate, setEndDate] = useState('2026-04-28');
  const [dept, setDept] = useState('all');
  const [generated, setGenerated] = useState<{ type: string; startDate: string; endDate: string; rows: { col: string; val: string }[] } | null>(null);

  const setToday = () => {
    const today = '2026-04-28';
    setStartDate(today);
    setEndDate(today);
  };

  const generate = () => {
    if (startDate > endDate) { toast.error('Start date must be before or equal to end date'); return; }
    const days = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    const scale = Math.min(days, 7);
    setGenerated({
      type, startDate, endDate,
      rows: [
        { col: 'Total Records', val: String(187 + scale * 3) },
        { col: 'New', val: String(34 + scale) },
        { col: 'Returning', val: String(128 + scale * 2) },
        { col: 'Walk-In', val: String(96 + scale) },
        { col: 'Online', val: String(57 + Math.floor(scale / 2)) },
        { col: 'Emergency', val: String(11 + Math.floor(scale / 3)) },
        { col: 'Date Range', val: `${startDate} to ${endDate} (${days} day${days > 1 ? 's' : ''})` },
      ],
    });
    reportsAudit(`Generated "${type}" for ${startDate} to ${endDate}`);
    toast.success('Report generated', { description: `${startDate} — ${endDate}` });
  };

  return (
    <Shell title="Reports" breadcrumb="Reports">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Registered" value="187" icon={Users} tone="blue" />
        <SummaryCard title="New Today" value="34" icon={UserPlus} tone="teal" />
        <SummaryCard title="Returning" value="128" icon={RefreshCw} tone="green" />
        <SummaryCard title="Walk-In" value="96" icon={Activity} tone="amber" />
        <SummaryCard title="Referrals" value="22" icon={Send} tone="purple" />
        <SummaryCard title="Admissions" value="14" icon={BedDouble} tone="indigo" />
        <SummaryCard title="Discharges" value="9" icon={FileCheck} tone="rose" />
        <SummaryCard title="Documents" value="42" icon={FileText} tone="teal" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold">Generate Report</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div><Label>Report Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REPORTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {['Psychiatry','O&G','Cardiology','General OPD','A&E'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select defaultValue="all">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={setToday}>Today</Button>
          <Button onClick={generate}><Filter className="h-4 w-4 mr-1.5" />Generate Report</Button>
          <Button variant="outline" onClick={() => { reportsAudit(`Exported PDF — ${type}`); toast.success('PDF export ready'); }}><Download className="h-4 w-4 mr-1.5" />Export PDF</Button>
          <Button variant="outline" onClick={() => { reportsAudit(`Exported Excel — ${type}`); toast.success('Excel export ready'); }}><Download className="h-4 w-4 mr-1.5" />Export Excel</Button>
          <Button variant="outline" onClick={() => { reportsAudit(`Printed — ${type}`); toast.success('Sent to printer'); }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          <Button variant="outline" onClick={() => { reportsAudit(`Sent to Admin — ${type}`); toast.success('Sent to Admin'); }}><Send className="h-4 w-4 mr-1.5" />Send to Admin</Button>
          <Button variant="outline" onClick={() => { reportsAudit(`Saved — ${type}`); toast.success('Report saved'); }}>Save Report</Button>
        </div>

        {generated && (
          <div className="border rounded-md p-4 mt-2">
            <h4 className="font-semibold mb-2">{generated.type} — {generated.startDate} to {generated.endDate}</h4>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground uppercase"><th className="px-3 py-2">Metric</th><th className="px-3 py-2">Value</th></tr></thead>
              <tbody className="divide-y">{generated.rows.map(r => <tr key={r.col}><td className="px-3 py-2">{r.col}</td><td className="px-3 py-2 font-medium">{r.val}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
};

// ============================================================
// 7. AUDIT TRAIL
// ============================================================
function mapAuditActionFilter(uiAction: string): string | undefined {
  if (uiAction === 'all') return undefined;
  const map: Record<string, string> = {
    'Patient Created': 'person:create',
    'Patient Edited': 'person:update',
    'Login': 'auth:login',
    'Logout': 'auth:logout',
  };
  return map[uiAction] ?? uiAction;
}

export const RecordsAuditTrail = () => {
  const [detail, setDetail] = useState<RecordsAuditEntry | null>(null);
  const [filterAction, setFilterAction] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(RECORDS_PAGE_SIZE);
  const [rows, setRows] = useState<RecordsAuditEntry[]>([]);
  const [stats, setStats] = useState<RecordsAuditStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadAudit = useCallback(async () => {
    if (!isRecordsApiEnabled()) {
      setRows([]);
      setTotal(0);
      setStats(null);
      setLoading(false);
      toast.error('Backend API is not configured');
      return;
    }
    setLoading(true);
    try {
      const type = mapAuditActionFilter(filterAction);
      const [list, auditStats] = await Promise.all([
        listRecordsAudit({
          q: search.trim() || undefined,
          type,
          page,
          limit: pageSize,
        }),
        getAuditStats(),
      ]);
      setRows(list.items);
      setTotal(list.meta.total);
      setStats(auditStats);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load audit trail');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterAction, search, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterAction, search]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadAudit(), 300);
    return () => window.clearTimeout(t);
  }, [loadAudit]);

  const filtered = rows;

  const formatTime = (t: string | null | undefined) => {
    if (!t) return '—';
    try {
      return new Date(t).toLocaleString();
    } catch {
      return t;
    }
  };

  return (
    <Shell title="Audit Trail" breadcrumb="Audit Trail">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Activities Today" value={String(stats?.activitiesToday ?? filtered.length)} icon={History} tone="blue" />
        <SummaryCard title="Created" value={String(stats?.created ?? '—')} icon={UserPlus} tone="green" />
        <SummaryCard title="Edited" value={String(stats?.edited ?? '—')} icon={Edit} tone="amber" />
        <SummaryCard title="Uploaded" value={String(stats?.uploaded ?? '—')} icon={Upload} tone="teal" />
        <SummaryCard title="Printed" value={String(stats?.printed ?? '—')} icon={Printer} tone="purple" />
        <SummaryCard title="Deleted" value={String(stats?.deleted ?? '—')} icon={Trash2} tone="rose" />
        <SummaryCard title="Suspicious" value={String(stats?.suspicious ?? '—')} icon={Flag} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search officer, action, or patient" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {['Patient Created','Patient Edited','person:create','person:update','card:create','card:payment-confirm','triage:create','Login','Logout'].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={loading} onClick={() => void loadAudit()}><RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button variant="outline" onClick={() => toast.success('Audit log exported')}><Download className="h-4 w-4 mr-1.5" />Export Log</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>{['Time','Officer','Role','Action','Hospital No','Patient','Module','Status','Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <EmptyRow cols={9} label="Loading audit trail…" />
              ) : filtered.length === 0 ? (
                <EmptyRow cols={9} label="No audit entries." />
              ) : filtered.map((a, i) => (
                <tr key={'auditId' in a ? a.auditId : i} className="hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs">{formatTime(a.time)}</td>
                  <td className="px-3 py-2 font-medium">{a.officer}</td>
                  <td className="px-3 py-2">{a.role}</td>
                  <td className="px-3 py-2">{a.action}</td>
                  <td className="px-3 py-2 text-xs">{a.hospitalId}</td>
                  <td className="px-3 py-2">{a.patient}</td>
                  <td className="px-3 py-2">{a.module}</td>
                  <td className="px-3 py-2"><StatusBadge status={a.status === 'Flagged' || a.status === 'Suspicious' ? 'critical' : 'verified'} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="View" onClick={() => setDetail(a)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" title="Flag" onClick={() => toast.success('Activity flagged for review')}><Flag className="h-3.5 w-3.5 text-rose-600" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RecordsListPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={setPage}
          label="entries"
        />
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Audit Detail</DialogTitle></DialogHeader>
          {detail && (
            <div className="text-sm space-y-1">
              <div>Officer: <b>{detail.officer}</b> ({detail.role})</div>
              <div>Time: {formatTime(detail.time)}</div>
              <div>Action: {detail.action}</div>
              <div>Patient: {detail.patient} ({detail.hospitalId})</div>
              <div>Module: {detail.module}</div>
              <div>Status: {detail.status}</div>
              {'newValue' in detail && detail.newValue && (
                <div className="pt-2 break-all text-xs"><b>New value:</b> {detail.newValue}</div>
              )}
              {'oldValue' in detail && detail.oldValue && (
                <div className="break-all text-xs"><b>Old value:</b> {detail.oldValue}</div>
              )}
              <div className="pt-2"><Label>Supervisor Comment</Label><Textarea placeholder="Add comment..." /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            <Button onClick={() => { toast.success('Comment saved'); setDetail(null); }}>Save Comment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// 8. RECORDS ANALYTICS
// ============================================================
export const RecordsAnalytics_MockLegacy = () => {
  const [range, setRange] = useState('week');
  return (
    <Shell title="Records Analytics" breadcrumb="Records Analytics">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Label>Time Range</Label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['today','week','month','quarter','year','custom'].map(r => <SelectItem key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => toast.success('Analytics refreshed')}><Filter className="h-4 w-4 mr-1.5" />Generate</Button>
        <Button variant="outline" onClick={() => toast.success('PDF exported')}><Download className="h-4 w-4 mr-1.5" />Export PDF</Button>
        <Button variant="outline" onClick={() => toast.success('Excel exported')}><Download className="h-4 w-4 mr-1.5" />Export Excel</Button>
        <Button variant="outline" onClick={() => toast.success('Sent to printer')}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
        <Button variant="outline" onClick={() => toast.success('Sent to management')}><Send className="h-4 w-4 mr-1.5" />Send to Mgmt</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Registered" value="4,128" icon={Users} tone="blue" />
        <SummaryCard title="New This Week" value="187" icon={UserPlus} tone="teal" />
        <SummaryCard title="New This Month" value="612" icon={UserPlus} tone="green" />
        <SummaryCard title="Returning (Month)" value="2,341" icon={RefreshCw} tone="purple" />
        <SummaryCard title="Avg Reg Time" value="6m 12s" icon={Activity} tone="amber" />
        <SummaryCard title="Peak Hour" value="10:00 AM" icon={Activity} tone="indigo" />
        <SummaryCard title="Top Clinic" value="Psychiatry" icon={Building2} tone="teal" />
        <SummaryCard title="Top Category" value="NHIA" icon={FileCheck} tone="rose" />
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends">Patient Trends</TabsTrigger>
          <TabsTrigger value="demo">Demographics</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="grid md:grid-cols-2 gap-4">
          <ChartCard title="New vs Returning Patients" />
          <ChartCard title="Daily Registration Trend" />
          <ChartCard title="Walk-In vs Referral vs Appointment" />
          <ChartCard title="Admission Requests Trend" />
        </TabsContent>
        <TabsContent value="demo" className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Male vs Female" />
          <ChartCard title="Age Group Distribution" />
          <ChartCard title="HMO/NHIA vs Cash" />
          <ChartCard title="Department / Clinic Attendance" />
        </TabsContent>
        <TabsContent value="ops" className="grid md:grid-cols-2 gap-4">
          <ChartCard title="Discharge Trend" />
          <ChartCard title="Records Officer Performance" />
        </TabsContent>
      </Tabs>
    </Shell>
  );
};

function ChartCard({ title }: { title: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="h-48 rounded-md bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center text-sm text-muted-foreground">
        Chart visualization
      </div>
    </div>
  );
}
