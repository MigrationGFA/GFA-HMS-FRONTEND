import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import SummaryCard from '@/components/SummaryCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import { ApiError } from '@/lib/api/client';
import {
  clearDoctorResearchMockStorage,
  createClinicalAuditProject,
  createResearchRegistry,
  createResearchTrial,
  fetchResearchAdmissionsByWard,
  fetchResearchDiagnoses,
  fetchResearchDrugUtilization,
  fetchResearchSummary,
  isDoctorResearchApiEnabled,
  listClinicalAuditProjects,
  listResearchRegistry,
  listResearchTrials,
  type AuditProject,
  type RegistryEntry,
  type ResearchDiagnosisRow,
  type ResearchDrugRow,
  type ResearchSummary,
  type ResearchWardRow,
  type TrialEntry,
} from '@/lib/api/doctorResearch';
import {
  FlaskConical, RefreshCw, Loader2, BarChart3, BedDouble, Pill, ClipboardList, Plus,
} from 'lucide-react';

const Shell = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout navItems={doctorClinicalNav} title="Doctor Clinical · Research & Audit">{children}</DashboardLayout>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

function emptySummary(): ResearchSummary {
  return {
    diagnosis: 0,
    admissions: 0,
    mortality: '0.0%',
    los: '0.0d',
    readmissions: 0,
    drugs: 0,
    registry: 0,
    trials: 0,
    auditProjects: 0,
    outcomes: 0,
    psychiatric: 0,
    exported: 0,
  };
}

export const DoctorResearch = () => {
  const apiOn = isDoctorResearchApiEnabled();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ResearchSummary>(emptySummary);
  const [diagnoses, setDiagnoses] = useState<ResearchDiagnosisRow[]>([]);
  const [wards, setWards] = useState<ResearchWardRow[]>([]);
  const [drugs, setDrugs] = useState<ResearchDrugRow[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [trials, setTrials] = useState<TrialEntry[]>([]);
  const [projects, setProjects] = useState<AuditProject[]>([]);

  const [regOpen, setRegOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [regForm, setRegForm] = useState({
    patientLabel: '',
    diagnosis: '',
    studyGroup: '',
    clinic: 'OPC',
  });
  const [trialForm, setTrialForm] = useState({ name: '', pi: '', eligibleCount: '0', enrolledCount: '0' });
  const [projForm, setProjForm] = useState({
    title: '',
    department: '',
    lead: '',
    indicator: '',
    standard: '',
  });

  const load = useCallback(async () => {
    if (!apiOn) {
      setError('Backend API is not configured. Set VITE_USE_API and VITE_API_BASE_URL.');
      setSummary(emptySummary());
      setLoading(false);
      return;
    }
    clearDoctorResearchMockStorage();
    setLoading(true);
    setError(null);
    try {
      const [s, d, w, dr, r, t, p] = await Promise.all([
        fetchResearchSummary(),
        fetchResearchDiagnoses(),
        fetchResearchAdmissionsByWard(),
        fetchResearchDrugUtilization(),
        listResearchRegistry(),
        listResearchTrials(),
        listClinicalAuditProjects(),
      ]);
      setSummary(s);
      setDiagnoses(d);
      setWards(w);
      setDrugs(dr);
      setRegistry(r);
      setTrials(t);
      setProjects(p);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load research data';
      setError(msg);
      setSummary(emptySummary());
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRegistry = async () => {
    if (!regForm.patientLabel || !regForm.diagnosis || !regForm.studyGroup) {
      toast.error('Patient, diagnosis, and study group are required');
      return;
    }
    setBusy(true);
    try {
      await createResearchRegistry(regForm);
      setRegOpen(false);
      setRegForm({ patientLabel: '', diagnosis: '', studyGroup: '', clinic: 'OPC' });
      toast.success('Registry entry created');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const saveTrial = async () => {
    if (!trialForm.name || !trialForm.pi) {
      toast.error('Name and PI are required');
      return;
    }
    setBusy(true);
    try {
      await createResearchTrial({
        name: trialForm.name,
        pi: trialForm.pi,
        eligibleCount: Number(trialForm.eligibleCount) || 0,
        enrolledCount: Number(trialForm.enrolledCount) || 0,
      });
      setTrialOpen(false);
      setTrialForm({ name: '', pi: '', eligibleCount: '0', enrolledCount: '0' });
      toast.success('Trial created');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const saveProject = async () => {
    if (!projForm.title || !projForm.department || !projForm.lead || !projForm.indicator || !projForm.standard) {
      toast.error('All project fields are required');
      return;
    }
    setBusy(true);
    try {
      await createClinicalAuditProject(projForm);
      setProjOpen(false);
      setProjForm({ title: '', department: '', lead: '', indicator: '', standard: '' });
      toast.success('Audit project created');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Research & Audit
            </h1>
            <p className="text-sm text-muted-foreground">
              Live aggregates from clinical data. Empty database shows 0.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error ? (
          <Card className="border-destructive/40 bg-destructive/5 text-sm text-destructive">{error}</Card>
        ) : null}

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <SummaryCard label="Diagnoses" value={String(summary.diagnosis)} icon={BarChart3} />
          <SummaryCard label="Admissions" value={String(summary.admissions)} icon={BedDouble} />
          <SummaryCard label="Mortality" value={summary.mortality} icon={BarChart3} />
          <SummaryCard label="Avg LOS" value={summary.los} icon={BedDouble} />
          <SummaryCard label="Readmissions" value={String(summary.readmissions)} icon={BedDouble} />
          <SummaryCard label="Prescriptions" value={String(summary.drugs)} icon={Pill} />
          <SummaryCard label="Registry" value={String(summary.registry)} icon={ClipboardList} />
          <SummaryCard label="Trials" value={String(summary.trials)} icon={FlaskConical} />
          <SummaryCard label="Audit projects" value={String(summary.auditProjects)} icon={ClipboardList} />
          <SummaryCard label="Outcomes" value={String(summary.outcomes)} icon={BarChart3} />
          <SummaryCard label="Psychiatric dx" value={String(summary.psychiatric)} icon={BarChart3} />
          <SummaryCard label="Exported" value={String(summary.exported)} icon={BarChart3} />
        </div>

        <Card>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-3 flex h-auto flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
              <TabsTrigger value="admissions">Admissions</TabsTrigger>
              <TabsTrigger value="drugs">Drugs</TabsTrigger>
              <TabsTrigger value="registry">Registry</TabsTrigger>
              <TabsTrigger value="trials">Trials</TabsTrigger>
              <TabsTrigger value="audits">Audit projects</TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="overview">
                  <p className="text-sm text-muted-foreground">
                    KPIs above reflect live database counts. Use the tabs for detail tables and governance CRUD.
                  </p>
                </TabsContent>

                <TabsContent value="diagnosis">
                  {diagnoses.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Diagnosis', 'Code', 'Patients']}
                      rows={diagnoses.map((d) => [d.diagnosis, d.code, String(d.patients)])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="admissions">
                  {wards.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Ward', 'Admissions', 'Discharges']}
                      rows={wards.map((w) => [w.ward, String(w.admissions), String(w.discharges)])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="drugs">
                  {drugs.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Drug', 'Rx lines', 'Patients']}
                      rows={drugs.map((d) => [d.drug, String(d.rx), String(d.patients)])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="registry" className="space-y-3">
                  <Button size="sm" onClick={() => setRegOpen(true)}><Plus className="h-4 w-4" /> Add entry</Button>
                  {registry.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Patient', 'Diagnosis', 'Study', 'Consent', 'Status']}
                      rows={registry.map((r) => [r.patient, r.diagnosis, r.studyGroup, r.consent, r.status])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="trials" className="space-y-3">
                  <Button size="sm" onClick={() => setTrialOpen(true)}><Plus className="h-4 w-4" /> Add trial</Button>
                  {trials.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Name', 'PI', 'Eligible', 'Enrolled', 'Status']}
                      rows={trials.map((t) => [t.name, t.pi, String(t.eligible), String(t.enrolled), t.status])}
                    />
                  )}
                </TabsContent>

                <TabsContent value="audits" className="space-y-3">
                  <Button size="sm" onClick={() => setProjOpen(true)}><Plus className="h-4 w-4" /> Add project</Button>
                  {projects.length === 0 ? <Empty /> : (
                    <SimpleTable
                      headers={['Title', 'Department', 'Lead', 'Indicator', 'Status']}
                      rows={projects.map((p) => [p.title, p.department, p.lead, p.indicator, p.status])}
                    />
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </Card>
      </div>

      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New registry entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Patient" value={regForm.patientLabel} onChange={(v) => setRegForm({ ...regForm, patientLabel: v })} />
            <Field label="Diagnosis" value={regForm.diagnosis} onChange={(v) => setRegForm({ ...regForm, diagnosis: v })} />
            <Field label="Study group" value={regForm.studyGroup} onChange={(v) => setRegForm({ ...regForm, studyGroup: v })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveRegistry()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New trial</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Name" value={trialForm.name} onChange={(v) => setTrialForm({ ...trialForm, name: v })} />
            <Field label="PI" value={trialForm.pi} onChange={(v) => setTrialForm({ ...trialForm, pi: v })} />
            <Field label="Eligible" value={trialForm.eligibleCount} onChange={(v) => setTrialForm({ ...trialForm, eligibleCount: v })} />
            <Field label="Enrolled" value={trialForm.enrolledCount} onChange={(v) => setTrialForm({ ...trialForm, enrolledCount: v })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTrialOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveTrial()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projOpen} onOpenChange={setProjOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New audit project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Title" value={projForm.title} onChange={(v) => setProjForm({ ...projForm, title: v })} />
            <Field label="Department" value={projForm.department} onChange={(v) => setProjForm({ ...projForm, department: v })} />
            <Field label="Lead" value={projForm.lead} onChange={(v) => setProjForm({ ...projForm, lead: v })} />
            <Field label="Indicator" value={projForm.indicator} onChange={(v) => setProjForm({ ...projForm, indicator: v })} />
            <Field label="Standard" value={projForm.standard} onChange={(v) => setProjForm({ ...projForm, standard: v })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setProjOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveProject()} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-muted-foreground">No records yet (0).</p>;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {headers.map((h) => (
              <th key={h} className="p-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60">
              {row.map((cell, j) => (
                <td key={j} className="p-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DoctorResearch;
