import { useState, useMemo, ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { recordsNav } from '@/pages/recordsNav';
import { patientRecords } from '@/data/hmsData';
import {
  Activity, Users, FileText, FileCheck, Calendar, Send, ClipboardList,
  Printer, Download, Upload, Eye, ArrowLeft, CheckCircle2, XCircle,
  Trash2, Edit, Stethoscope, BedDouble, FolderOpen, AlertTriangle,
  ShieldCheck, History as HistoryIcon,
} from 'lucide-react';

// ---------- shared ----------
function dirAudit(action: string) {
  try {
    const k = 'gfa_records_audit_v1';
    const arr = JSON.parse(localStorage.getItem(k) || '[]');
    arr.unshift({ action: `[Patient Directory] ${action}`, timestamp: new Date().toISOString() });
    localStorage.setItem(k, JSON.stringify(arr.slice(0, 500)));
  } catch { /* noop */ }
}

function Shell({ title, breadcrumb, children }: { title: string; breadcrumb: ReactNode; children: ReactNode }) {
  return (
    <DashboardLayout title="Records Officer Console" navItems={recordsNav as any}>
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">{breadcrumb}</div>
        <h1 className="text-2xl font-bold font-display">{title}</h1>
        {children}
      </div>
    </DashboardLayout>
  );
}

function NotFound({ id }: { id?: string }) {
  return (
    <Shell title="Patient Not Found" breadcrumb={<><Link to="/records/directory" className="hover:underline">Patient Directory</Link> / Unknown</>}>
      <div className="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
        No patient record found for <span className="font-mono">{id}</span>.
        <div className="mt-4"><Link to="/records/directory"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Patient Directory</Button></Link></div>
      </div>
    </Shell>
  );
}

// ============================================================
// Dummy history + documents seeders (deterministic per patient)
// ============================================================
type VisitType = 'OPD' | 'Emergency' | 'Admission' | 'Discharge' | 'Referral' | 'Movement';
interface VisitRow { date: string; visitId: string; department: string; type: VisitType; officer: string; status: string; notes: string }

function seedHistory(patientId: string): VisitRow[] {
  const base = [
    { date: '2026-04-22 09:14', visitId: 'V-' + patientId + '-014', department: 'Out-Patient Clinic', type: 'OPD' as VisitType, officer: 'Dr. Adewale', status: 'Completed', notes: 'Follow-up review, vitals stable.' },
    { date: '2026-03-18 11:02', visitId: 'V-' + patientId + '-013', department: 'Adult Psychiatry', type: 'OPD' as VisitType, officer: 'Dr. Bello', status: 'Completed', notes: 'Routine medication review.' },
    { date: '2026-02-08 22:40', visitId: 'V-' + patientId + '-012', department: 'Emergency', type: 'Emergency' as VisitType, officer: 'Dr. Okafor', status: 'Stabilised', notes: 'Acute episode, admitted overnight.' },
    { date: '2026-02-09 08:10', visitId: 'V-' + patientId + '-011', department: 'Male Ward 2', type: 'Admission' as VisitType, officer: 'Nurse Funke', status: 'Admitted', notes: 'Transferred from Emergency.' },
    { date: '2026-02-14 14:30', visitId: 'V-' + patientId + '-010', department: 'Male Ward 2', type: 'Discharge' as VisitType, officer: 'Dr. Okafor', status: 'Discharged', notes: 'Discharged with medications.' },
    { date: '2026-01-12 10:00', visitId: 'V-' + patientId + '-009', department: 'Social Work', type: 'Referral' as VisitType, officer: 'SW Adebola', status: 'Closed', notes: 'Counselling referral completed.' },
    { date: '2026-01-04 07:55', visitId: 'V-' + patientId + '-008', department: 'Records', type: 'Movement' as VisitType, officer: 'Records Officer', status: 'Logged', notes: 'File released to OPD.' },
  ];
  return base;
}

type DocStatus = 'Uploaded' | 'Pending Review' | 'Verified' | 'Rejected' | 'Archived';
interface PatientDoc { id: string; type: string; fileName: string; uploadedBy: string; date: string; status: DocStatus; confidential: boolean }

function seedDocs(patientId: string): PatientDoc[] {
  return [
    { id: 'DOC-' + patientId + '-01', type: 'Registration Forms', fileName: 'registration.pdf', uploadedBy: 'Adebola O.', date: '2026-03-25 09:10', status: 'Verified', confidential: false },
    { id: 'DOC-' + patientId + '-02', type: 'Consent Form', fileName: 'consent-treatment.pdf', uploadedBy: 'Adebola O.', date: '2026-03-25 09:14', status: 'Verified', confidential: false },
    { id: 'DOC-' + patientId + '-03', type: 'Referral Letter', fileName: 'referral-gp.pdf', uploadedBy: 'Tunde A.', date: '2026-03-25 09:20', status: 'Pending Review', confidential: false },
    { id: 'DOC-' + patientId + '-04', type: 'Lab Report', fileName: 'fbc-2026-04-22.pdf', uploadedBy: 'Lab/Eze', date: '2026-04-22 11:30', status: 'Uploaded', confidential: false },
    { id: 'DOC-' + patientId + '-05', type: 'Radiology Report', fileName: 'ct-brain.pdf', uploadedBy: 'Rad/Bayo', date: '2026-02-08 23:45', status: 'Verified', confidential: false },
    { id: 'DOC-' + patientId + '-06', type: 'Discharge Documents', fileName: 'discharge-summary.pdf', uploadedBy: 'Dr. Okafor', date: '2026-02-14 14:35', status: 'Verified', confidential: false },
    { id: 'DOC-' + patientId + '-07', type: 'HMO/NHIA Documents', fileName: 'nhia-card.jpg', uploadedBy: 'Adebola O.', date: '2026-03-25 09:12', status: 'Verified', confidential: true },
    { id: 'DOC-' + patientId + '-08', type: 'Legal Documents', fileName: 'guardian-affidavit.pdf', uploadedBy: 'Legal Dept', date: '2026-03-26 10:00', status: 'Verified', confidential: true },
  ];
}

// ============================================================
// PATIENT HISTORY PAGE
// ============================================================
export const PatientHistoryPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const patient = useMemo(() => patientRecords.find(p => p.id === patientId), [patientId]);
  const history = useMemo(() => patient ? seedHistory(patient.id) : [], [patient]);
  const [detail, setDetail] = useState<VisitRow | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [tab, setTab] = useState('visit');

  if (!patient) return <NotFound id={patientId} />;

  const counts = {
    visits: history.filter(h => h.type === 'OPD' || h.type === 'Emergency').length,
    admissions: history.filter(h => h.type === 'Admission').length,
    discharges: history.filter(h => h.type === 'Discharge').length,
    referrals: history.filter(h => h.type === 'Referral').length,
    documents: seedDocs(patient.id).length,
    lastVisit: history[0]?.date.split(' ')[0] ?? '—',
  };

  const tabFilter: Record<string, VisitType[]> = {
    visit: ['OPD', 'Emergency'],
    admission: ['Admission'],
    discharge: ['Discharge'],
    referral: ['Referral'],
    movement: ['Movement'],
    audit: ['OPD', 'Emergency', 'Admission', 'Discharge', 'Referral', 'Movement'],
  };
  const rows = history.filter(h => tabFilter[tab].includes(h.type));

  return (
    <Shell
      title={`${patient.name} — History`}
      breadcrumb={<><Link to="/records/directory" className="hover:underline">Patient Directory</Link> / {patient.hospitalId} / History</>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/records/directory')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Directory</Button>
        <Button variant="outline" size="sm" onClick={() => setPrintOpen(true)}><Printer className="h-4 w-4 mr-1.5" />Print History</Button>
        <Button variant="outline" size="sm" onClick={() => { dirAudit(`Exported history PDF for ${patient.hospitalId}`); toast.success('History exported to PDF'); }}><Download className="h-4 w-4 mr-1.5" />Export PDF</Button>
        <Button variant="outline" size="sm" onClick={() => { dirAudit(`Exported history Excel for ${patient.hospitalId}`); toast.success('History exported to Excel'); }}><Download className="h-4 w-4 mr-1.5" />Export Excel</Button>
        <Link to={`/records/patient-directory/${patient.id}/documents`} className="ml-auto"><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1.5" />View Documents</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Visits" value={String(counts.visits)} icon={Stethoscope} tone="blue" />
        <SummaryCard title="Admissions" value={String(counts.admissions)} icon={BedDouble} tone="indigo" />
        <SummaryCard title="Discharges" value={String(counts.discharges)} icon={FileCheck} tone="green" />
        <SummaryCard title="Referrals" value={String(counts.referrals)} icon={Send} tone="purple" />
        <SummaryCard title="Documents" value={String(counts.documents)} icon={FileText} tone="teal" />
        <SummaryCard title="Last Visit" value={counts.lastVisit} icon={Calendar} tone="amber" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="visit">Visit History</TabsTrigger>
            <TabsTrigger value="admission">Admission History</TabsTrigger>
            <TabsTrigger value="discharge">Discharge History</TabsTrigger>
            <TabsTrigger value="referral">Referral History</TabsTrigger>
            <TabsTrigger value="movement">Movement History</TabsTrigger>
            <TabsTrigger value="audit">Audit History</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>{['Date','Visit ID','Department / Clinic','Visit Type','Doctor / Officer','Status','Notes','Action'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground text-sm">No history records under this category.</td></tr>
                  ) : rows.map(r => (
                    <tr key={r.visitId} className="hover:bg-muted/30">
                      <td className="px-3 py-2 text-xs">{r.date}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.visitId}</td>
                      <td className="px-3 py-2">{r.department}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">{r.officer}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[260px] truncate">{r.notes}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="ghost" onClick={() => { setDetail(r); dirAudit(`Viewed history ${r.visitId}`); }}><Eye className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>History Detail — {detail?.visitId}</DialogTitle></DialogHeader>
          {detail && (
            <div className="text-sm space-y-1.5">
              <div><b>Date:</b> {detail.date}</div>
              <div><b>Department:</b> {detail.department}</div>
              <div><b>Visit Type:</b> {detail.type}</div>
              <div><b>Officer:</b> {detail.officer}</div>
              <div><b>Status:</b> {detail.status}</div>
              <div><b>Notes:</b> {detail.notes}</div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setDetail(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Print Preview — Patient History</DialogTitle></DialogHeader>
          <div className="border rounded p-4 bg-white text-black text-xs space-y-2 max-h-[60vh] overflow-y-auto">
            <div className="text-center font-bold">GFA HMS — Patient History Report</div>
            <div>Patient: {patient.name} ({patient.hospitalId})</div>
            <table className="w-full text-[10px] mt-2 border">
              <thead><tr className="bg-gray-100">{['Date','Visit ID','Dept','Type','Officer','Status'].map(h => <th key={h} className="px-2 py-1 text-left border">{h}</th>)}</tr></thead>
              <tbody>{history.map(r => <tr key={r.visitId}><td className="px-2 py-1 border">{r.date}</td><td className="px-2 py-1 border">{r.visitId}</td><td className="px-2 py-1 border">{r.department}</td><td className="px-2 py-1 border">{r.type}</td><td className="px-2 py-1 border">{r.officer}</td><td className="px-2 py-1 border">{r.status}</td></tr>)}</tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Cancel</Button>
            <Button onClick={() => { window.print(); dirAudit(`Printed history for ${patient.hospitalId}`); setPrintOpen(false); }}><Printer className="h-4 w-4 mr-1.5" />Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// PATIENT DOCUMENTS PAGE
// ============================================================
const DOC_TYPES = ['Registration Forms','Consent Form','Referral Letter','Lab Report','Radiology Report','Discharge Documents','HMO/NHIA Documents','Legal Documents'];

export const PatientDocumentsPage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const patient = useMemo(() => patientRecords.find(p => p.id === patientId), [patientId]);
  const [docs, setDocs] = useState<PatientDoc[]>(() => patient ? seedDocs(patient.id) : []);
  const [tab, setTab] = useState('All');
  const [preview, setPreview] = useState<PatientDoc | null>(null);
  const [upload, setUpload] = useState<{ open: boolean; replacing?: PatientDoc }>({ open: false });
  const [reject, setReject] = useState<PatientDoc | null>(null);
  const [archive, setArchive] = useState<PatientDoc | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<PatientDoc | null>(null);

  // upload form state
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fileName, setFileName] = useState('');
  const [description, setDescription] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!patient) return <NotFound id={patientId} />;

  const updateDoc = (id: string, patch: Partial<PatientDoc>) => setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));

  const filtered = tab === 'All' ? docs : docs.filter(d => d.type === tab);

  const today = new Date().toISOString().split('T')[0];
  const counts = {
    total: docs.length,
    today: docs.filter(d => d.date.startsWith(today)).length,
    pending: docs.filter(d => d.status === 'Pending Review').length,
    verified: docs.filter(d => d.status === 'Verified').length,
    rejected: docs.filter(d => d.status === 'Rejected').length,
    confidential: docs.filter(d => d.confidential).length,
  };

  const resetUpload = () => { setDocType(DOC_TYPES[0]); setFileName(''); setDescription(''); setConfidential(false); };

  const saveUpload = () => {
    if (!fileName.trim()) { toast.error('File name is required'); return; }
    if (upload.replacing) {
      updateDoc(upload.replacing.id, { fileName: fileName.trim(), type: docType, confidential, status: 'Uploaded', date: new Date().toISOString().replace('T', ' ').slice(0, 16) });
      dirAudit(`Replaced document ${upload.replacing.id} for ${patient.hospitalId}`);
      toast.success('Document replaced');
    } else {
      const newDoc: PatientDoc = {
        id: 'DOC-' + patient.id + '-' + String(docs.length + 1).padStart(2, '0'),
        type: docType, fileName: fileName.trim(), uploadedBy: 'Records Officer',
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'Uploaded', confidential,
      };
      setDocs(prev => [newDoc, ...prev]);
      dirAudit(`Uploaded ${docType} (${newDoc.id}) for ${patient.hospitalId}`);
      toast.success('Document uploaded');
    }
    setUpload({ open: false }); resetUpload();
  };

  return (
    <Shell
      title={`${patient.name} — Documents`}
      breadcrumb={<><Link to="/records/directory" className="hover:underline">Patient Directory</Link> / {patient.hospitalId} / Documents</>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/records/directory')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Directory</Button>
        <Link to={`/records/patient-directory/${patient.id}/history`}><Button variant="outline" size="sm"><HistoryIcon className="h-4 w-4 mr-1.5" />View History</Button></Link>
        <Button size="sm" className="ml-auto" onClick={() => { resetUpload(); setUpload({ open: true }); }}><Upload className="h-4 w-4 mr-1.5" />Upload Document</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Documents" value={String(counts.total)} icon={FileText} tone="blue" />
        <SummaryCard title="Uploaded Today" value={String(counts.today)} icon={Upload} tone="teal" />
        <SummaryCard title="Pending Review" value={String(counts.pending)} icon={Activity} tone="amber" />
        <SummaryCard title="Verified" value={String(counts.verified)} icon={CheckCircle2} tone="green" />
        <SummaryCard title="Rejected" value={String(counts.rejected)} icon={XCircle} tone="rose" />
        <SummaryCard title="Confidential" value={String(counts.confidential)} icon={ShieldCheck} tone="purple" />
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="All">All Documents</TabsTrigger>
            {DOC_TYPES.map(t => <TabsTrigger key={t} value={t}>{t}</TabsTrigger>)}
          </TabsList>

          <TabsContent value={tab} className="mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>{['Doc ID','Type','File Name','Uploaded By','Date','Status','Confidential','Actions'].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground text-sm">No documents for this category.</td></tr>
                  ) : filtered.map(d => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{d.id}</td>
                      <td className="px-3 py-2">{d.type}</td>
                      <td className="px-3 py-2">{d.fileName}</td>
                      <td className="px-3 py-2">{d.uploadedBy}</td>
                      <td className="px-3 py-2 text-xs">{d.date}</td>
                      <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                      <td className="px-3 py-2">{d.confidential ? <span className="inline-flex items-center text-xs text-purple-600"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Yes</span> : <span className="text-xs text-muted-foreground">No</span>}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" title="View" onClick={() => { setPreview(d); dirAudit(`Viewed document ${d.id}`); }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" title="Download" onClick={() => { dirAudit(`Downloaded ${d.id}`); toast.success('Download started'); }}><Download className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" title="Verify" onClick={() => setVerifyTarget(d)} disabled={d.status === 'Verified'}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
                          <Button size="sm" variant="ghost" title="Reject" onClick={() => { setReject(d); setRejectReason(''); }} disabled={d.status === 'Rejected'}><XCircle className="h-3.5 w-3.5 text-rose-600" /></Button>
                          <Button size="sm" variant="ghost" title="Replace" onClick={() => { resetUpload(); setDocType(d.type); setFileName(d.fileName); setConfidential(d.confidential); setUpload({ open: true, replacing: d }); }}><Upload className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" title="Archive" onClick={() => setArchive(d)} disabled={d.status === 'Archived'}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{preview?.fileName}</DialogTitle></DialogHeader>
          <div className="border rounded bg-muted/30 h-[420px] flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-2" />
              Preview placeholder for {preview?.type}
              <div className="text-xs mt-1">{preview?.id}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { dirAudit(`Downloaded ${preview?.id}`); toast.success('Download started'); }}><Download className="h-4 w-4 mr-1.5" />Download</Button>
            <Button onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload / Replace */}
      <Dialog open={upload.open} onOpenChange={(v) => { setUpload({ open: v }); if (!v) resetUpload(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{upload.replacing ? 'Replace Document' : 'Upload Document'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient</Label>
              <Input value={`${patient.name} (${patient.hospitalId})`} readOnly className="bg-muted/40" />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? fileName)} />
              {fileName && <div className="text-xs text-muted-foreground mt-1">Selected: {fileName}</div>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes…" />
            </div>
            <div className="flex items-center justify-between bg-muted/40 rounded p-2">
              <Label className="text-sm">Mark as Confidential</Label>
              <Switch checked={confidential} onCheckedChange={setConfidential} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUpload({ open: false }); resetUpload(); }}>Cancel</Button>
            <Button onClick={saveUpload}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify */}
      <Dialog open={!!verifyTarget} onOpenChange={(v) => !v && setVerifyTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Verify Document</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Mark <b>{verifyTarget?.fileName}</b> as verified?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)}>Cancel</Button>
            <Button onClick={() => { if (verifyTarget) { updateDoc(verifyTarget.id, { status: 'Verified' }); dirAudit(`Verified ${verifyTarget.id}`); toast.success('Document verified'); } setVerifyTarget(null); }}>Verify</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!reject} onOpenChange={(v) => !v && setReject(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Document</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Provide a reason for rejecting <b>{reject?.fileName}</b>.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReject(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (!rejectReason.trim()) { toast.error('Reason is required'); return; }
              if (reject) { updateDoc(reject.id, { status: 'Rejected' }); dirAudit(`Rejected ${reject.id}: ${rejectReason}`); toast.success('Document rejected'); }
              setReject(null); setRejectReason('');
            }}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive */}
      <Dialog open={!!archive} onOpenChange={(v) => !v && setArchive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Archive Document</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Archive <b>{archive?.fileName}</b>? It will be moved to the archive store.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchive(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (archive) { updateDoc(archive.id, { status: 'Archived' }); dirAudit(`Archived ${archive.id}`); toast.success('Document archived'); } setArchive(null); }}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ============================================================
// PATIENT PROFILE PAGE (Full)
// ============================================================
export const PatientProfilePage = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const patient = useMemo(() => patientRecords.find(p => p.id === patientId), [patientId]);
  const history = useMemo(() => patient ? seedHistory(patient.id) : [], [patient]);
  const docs = useMemo(() => patient ? seedDocs(patient.id) : [], [patient]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  useMemo(() => { if (patient) setForm({ ...patient }); }, [patient]);

  if (!patient) return <NotFound id={patientId} />;

  const initials = patient.name.split(' ').map(n => n[0]).slice(0, 2).join('');
  const lastVisit = history[0]?.date ?? '—';
  const admissions = history.filter(h => h.type === 'Admission');

  const printProfile = () => { dirAudit(`Printed full profile for ${patient.hospitalId}`); toast.success('Full profile sent to printer'); window.print(); };
  const printCard = () => { dirAudit(`Printed patient card for ${patient.hospitalId}`); toast.success('Patient card sent to printer'); };
  const saveEdit = () => {
    if (!form.name?.trim() || !form.phone?.trim()) { toast.error('Name and phone are required'); return; }
    dirAudit(`Edited patient ${patient.hospitalId} (profile page)`);
    toast.success('Patient record updated');
    setEdit(false);
  };

  return (
    <Shell title="Patient Profile" breadcrumb={<><Link to="/records/directory" className="hover:underline">Patient Directory</Link> / {patient.name} / Profile</>}>
      {/* Header */}
      <div className="bg-card border rounded-xl p-4 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border shrink-0">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold font-display truncate">{patient.name}</h2>
            <StatusBadge status="Active" />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{patient.hospitalId} · ID {patient.id}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mt-2 text-sm">
            <div><span className="text-muted-foreground">Age:</span> {patient.age}</div>
            <div><span className="text-muted-foreground">Gender:</span> {patient.gender}</div>
            <div><span className="text-muted-foreground">Phone:</span> {patient.phone}</div>
            <div><span className="text-muted-foreground">Category:</span> {patient.insurance}</div>
            <div><span className="text-muted-foreground">Registered:</span> {patient.registeredOn}</div>
            <div><span className="text-muted-foreground">Last Visit:</span> {lastVisit}</div>
            <div><span className="text-muted-foreground">Blood Group:</span> {patient.bloodGroup}</div>
            <div><span className="text-muted-foreground">Status:</span> Active</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch md:w-48">
          <Button onClick={() => setEdit(true)}><Edit className="h-4 w-4 mr-1.5" />Edit Patient</Button>
          <Button variant="outline" onClick={printCard}><Printer className="h-4 w-4 mr-1.5" />Print Card</Button>
          <Button variant="outline" onClick={printProfile}><Printer className="h-4 w-4 mr-1.5" />Print Profile</Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard title="Total Visits" value={String(history.length)} icon={Activity} tone="blue" />
        <SummaryCard title="Outstanding" value="₦4,500" icon={ClipboardList} tone="amber" />
        <SummaryCard title="Wallet" value="₦12,000" icon={FileCheck} tone="green" />
        <SummaryCard title="Admissions" value={String(admissions.length)} icon={BedDouble} tone="purple" />
        <SummaryCard title="Documents" value={String(docs.length)} icon={FolderOpen} tone="teal" />
        <SummaryCard title="Last Appt." value="22 Apr" icon={Calendar} tone="indigo" />
        <SummaryCard title="Queue" value="Not in Queue" icon={Users} tone="blue" />
        <SummaryCard title="Active Alerts" value="1" icon={AlertTriangle} tone="rose" />
      </div>

      {/* Tabs */}
      <div className="bg-card border rounded-xl p-4">
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="visits">Visit History</TabsTrigger>
            <TabsTrigger value="appts">Appointments</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
            <TabsTrigger value="docs">Documents</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="audit">Audit History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <Section title="Biodata">
              <Row k="Full Name" v={patient.name} />
              <Row k="Hospital No" v={patient.hospitalId} />
              <Row k="Patient ID" v={patient.id} />
              <Row k="Age" v={String(patient.age)} />
              <Row k="Gender" v={patient.gender} />
              <Row k="Blood Group" v={patient.bloodGroup} />
              <Row k="NIN" v={patient.nin} />
            </Section>
            <Section title="Contact Details">
              <Row k="Phone" v={patient.phone} />
              <Row k="Email" v={patient.name.split(' ').join('.').toLowerCase() + '@mail.com'} />
              <Row k="Address" v={patient.address} />
            </Section>
            <Section title="Next of Kin">
              <Row k="Name" v={'Adebayo ' + patient.name.split(' ').slice(-1)[0]} />
              <Row k="Phone" v={'08099887766'} />
              <Row k="Relationship" v="Spouse" />
            </Section>
            <Section title="Emergency Contact">
              <Row k="Name" v="Same as Next of Kin" />
              <Row k="Phone" v="08099887766" />
            </Section>
            <Section title="Responsible Relative">
              <Row k="Name" v="Self" />
              <Row k="Phone" v={patient.phone} />
            </Section>
            <Section title="Medical">
              <Row k="Allergies" v={patient.allergies} />
              <Row k="Existing Conditions" v="Hypertension" />
              <Row k="Disability Status" v="None" />
            </Section>
          </TabsContent>

          <TabsContent value="payment" className="mt-4 space-y-3 text-sm">
            <div className="grid sm:grid-cols-4 gap-3">
              <Stat label="Wallet Balance" value="₦12,000" />
              <Stat label="Outstanding" value="₦4,500" tone="amber" />
              <Stat label="Paid YTD" value="₦128,500" tone="green" />
              <Stat label="Payment Method" value={patient.insurance} />
            </div>
            <Section title="HMO / NHIA">
              <Row k="Provider" v={patient.insurance === 'HMO' ? 'Hygeia HMO' : patient.insurance === 'NHIS' ? 'NHIA' : '—'} />
              <Row k="Policy Number" v={patient.insurance === 'NHIS' ? 'NHIA-' + patient.nin.slice(0, 8) : '—'} />
              <Row k="Status" v="Active" />
            </Section>
            <Section title="Billing History">
              <SimpleTable head={['Date', 'Invoice', 'Service', 'Amount', 'Status']} rows={[
                ['2026-04-22', 'INV-30021', 'OPD Consultation', '₦5,500', 'Paid'],
                ['2026-04-22', 'INV-30022', 'FBC Lab', '₦3,200', 'Paid'],
                ['2026-03-18', 'INV-29870', 'Adult Psychiatry', '₦6,000', 'Paid'],
                ['2026-02-14', 'INV-29612', 'Admission Deposit', '₦50,000', 'Paid'],
                ['2026-02-14', 'INV-29615', 'Pharmacy', '₦4,500', 'Outstanding'],
              ]} />
            </Section>
          </TabsContent>

          <TabsContent value="visits" className="mt-4">
            <SimpleTable head={['Date', 'Clinic', 'Doctor', 'Type', 'Status', 'Notes', '']} rows={history.map(v => [
              v.date, v.department, v.officer, v.type, v.status, v.notes,
              <Button key="vw" size="sm" variant="ghost" onClick={() => { dirAudit(`Viewed visit ${v.visitId}`); toast.info(`Visit ${v.visitId} — ${v.notes}`); }}><Eye className="h-3.5 w-3.5" /></Button>,
            ])} />
          </TabsContent>

          <TabsContent value="appts" className="mt-4 space-y-3">
            <Section title="Upcoming">
              <SimpleTable head={['Date', 'Clinic', 'Doctor', 'Status', '']} rows={[
                ['2026-05-12 10:00', 'Adult Psychiatry', 'Dr. Bello', 'Scheduled', (
                  <div key="a1" className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { dirAudit('Reschedule requested'); toast.success('Reschedule modal opened'); }}>Reschedule</Button>
                    <Button size="sm" variant="ghost" onClick={() => { dirAudit('Appointment cancelled'); toast.success('Appointment cancelled'); }}>Cancel</Button>
                  </div>
                )],
              ]} />
            </Section>
            <Section title="Past Appointments">
              <SimpleTable head={['Date', 'Clinic', 'Doctor', 'Status']} rows={[
                ['2026-04-22 09:14', 'OPD', 'Dr. Adewale', 'Attended'],
                ['2026-03-18 11:02', 'Adult Psychiatry', 'Dr. Bello', 'Attended'],
                ['2026-02-08 22:40', 'Emergency', 'Dr. Okafor', 'Attended'],
              ]} />
            </Section>
            <Section title="Missed Appointments">
              <SimpleTable head={['Date', 'Clinic', 'Doctor', 'Status']} rows={[
                ['2026-01-22 09:00', 'OPD Follow-up', 'Dr. Adewale', 'No-show'],
              ]} />
            </Section>
          </TabsContent>

          <TabsContent value="admissions" className="mt-4">
            <SimpleTable head={['Admission Date', 'Ward', 'Bed', 'Diagnosis / Reason', 'Discharge Status']} rows={[
              ['2026-02-09', 'Male Ward 2', 'B-04', 'Acute episode', 'Discharged 2026-02-14'],
              ['2025-11-02', 'Male Medical', 'M-12', 'Hypertensive crisis', 'Discharged 2025-11-07'],
            ]} />
          </TabsContent>

          <TabsContent value="docs" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => { dirAudit(`Upload requested for ${patient.hospitalId}`); toast.success('Upload dialog opened'); }}><Upload className="h-4 w-4 mr-1.5" />Upload Document</Button>
            </div>
            <SimpleTable head={['Type', 'File', 'Uploaded By', 'Date', 'Status', '']} rows={docs.map(d => [
              d.type, d.fileName, d.uploadedBy, d.date, d.status,
              <div key="da" className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toast.info(`Viewing ${d.fileName}`)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => toast.success(`Downloading ${d.fileName}`)}><Download className="h-3.5 w-3.5" /></Button>
              </div>,
            ])} />
          </TabsContent>

          <TabsContent value="referrals" className="mt-4 space-y-3">
            <Section title="Internal Referrals">
              <SimpleTable head={['Date', 'From', 'To', 'Reason', 'Status']} rows={[
                ['2026-01-12', 'OPD', 'Social Work', 'Counselling', 'Closed'],
                ['2026-02-09', 'Emergency', 'Male Ward 2', 'Admission', 'Completed'],
              ]} />
            </Section>
            <Section title="External Referrals">
              <SimpleTable head={['Date', 'Direction', 'Facility', 'Reason', 'Status']} rows={[
                ['2025-12-04', 'Outgoing', 'FMC Abeokuta', 'MRI Brain', 'Completed'],
                ['2026-03-01', 'Incoming', 'Primary Health Centre, Aro', 'Psychiatric eval', 'Accepted'],
              ]} />
            </Section>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <SimpleTable head={['When', 'Actor', 'Action']} rows={[
              ['2026-03-25 09:10', 'Adebola O.', 'Created patient record'],
              ['2026-03-25 09:12', 'Adebola O.', 'Uploaded NHIA card'],
              ['2026-04-22 09:14', 'Dr. Adewale', 'Viewed record (OPD visit)'],
              ['2026-04-22 11:30', 'Lab/Eze', 'Attached lab result'],
              ['2026-04-28 08:00', 'Records Officer', 'Printed patient card'],
            ]} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate('/records/directory')}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Directory</Button>
        <Button variant="outline" onClick={() => navigate(`/records/patient-directory/${patient.id}/history`)}><HistoryIcon className="h-4 w-4 mr-1.5" />View History</Button>
        <Button variant="outline" onClick={() => navigate(`/records/patient-directory/${patient.id}/documents`)}><FileText className="h-4 w-4 mr-1.5" />View Documents</Button>
      </div>

      {/* Edit modal */}
      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Patient — {patient.name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="bio">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="bio">Biodata</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
            </TabsList>
            <TabsContent value="bio" className="grid md:grid-cols-2 gap-3 mt-3">
              <div><Label>Hospital No</Label><Input value={patient.hospitalId} readOnly className="bg-muted/40" /></div>
              <div><Label>Patient ID</Label><Input value={patient.id} readOnly className="bg-muted/40" /></div>
              <div><Label>Full Name *</Label><Input value={form.name || ''} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Age</Label><Input type="number" value={form.age || ''} onChange={(e) => setForm((f: any) => ({ ...f, age: Number(e.target.value) }))} /></div>
              <div><Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f: any) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Blood Group</Label><Input value={form.bloodGroup || ''} onChange={(e) => setForm((f: any) => ({ ...f, bloodGroup: e.target.value }))} /></div>
            </TabsContent>
            <TabsContent value="contact" className="grid md:grid-cols-2 gap-3 mt-3">
              <div><Label>Phone *</Label><Input value={form.phone || ''} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Address</Label><Textarea value={form.address || ''} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} /></div>
            </TabsContent>
            <TabsContent value="medical" className="grid md:grid-cols-2 gap-3 mt-3">
              <div><Label>Allergies</Label><Input value={form.allergies || ''} onChange={(e) => setForm((f: any) => ({ ...f, allergies: e.target.value }))} /></div>
              <div><Label>Existing Conditions</Label><Input placeholder="e.g. Hypertension" /></div>
            </TabsContent>
            <TabsContent value="payment" className="grid md:grid-cols-2 gap-3 mt-3">
              <div><Label>Payment Category</Label>
                <Select value={form.insurance} onValueChange={(v) => setForm((f: any) => ({ ...f, insurance: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['Private', 'NHIS', 'HMO', 'None'].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

// ---------- helpers for profile page ----------
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border">
      <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right break-words">{v}</span></div>;
}
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'amber' | 'green' }) {
  const c = tone === 'amber' ? 'text-amber-700' : tone === 'green' ? 'text-emerald-700' : 'text-foreground';
  return <div className="border rounded-lg p-3 bg-card"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-lg font-bold ${c}`}>{value}</div></div>;
}
function SimpleTable({ head, rows }: { head: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0
            ? <tr><td colSpan={head.length} className="px-3 py-6 text-center text-muted-foreground">No records</td></tr>
            : rows.map((r, i) => <tr key={i} className="hover:bg-muted/30">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
