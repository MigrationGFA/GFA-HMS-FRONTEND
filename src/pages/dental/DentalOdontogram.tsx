import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useDental } from '@/contexts/DentalStore';
import {
  FINDING_COLOR,
  FINDINGS,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  bitingSurface,
  lingualLabel,
  surfacesFor,
  type Dentition,
  type FindingKind,
  type Surface,
  type ToothFinding,
} from '@/data/dentalData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DentalShell, DentalStatus, DemoBanner, PageIntro, PatientPicker } from './shared';
import { notify } from '@/lib/notify';

function worstFinding(rows: ToothFinding[]): FindingKind | null {
  if (rows.length === 0) return null;
  const rank: FindingKind[] = [
    'Extraction required', 'Missing tooth', 'Dental caries', 'Fracture', 'Impacted tooth',
    'Periodontal concern', 'Tooth mobility', 'Root canal treatment', 'Crown',
    'Existing restoration', 'Tooth sensitivity', 'Other', 'Healthy',
  ];
  return [...rows].sort((a, b) => rank.indexOf(a.finding) - rank.indexOf(b.finding))[0]?.finding ?? null;
}

function ToothButton({ fdi, selected, findings, onSelect }: { fdi: string; selected: boolean; findings: ToothFinding[]; onSelect: () => void }) {
  const kind = worstFinding(findings);
  const missing = findings.some((f) => f.finding === 'Missing tooth');
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Tooth ${fdi}${kind ? `, ${kind}` : ''}`}
      className={`h-12 w-9 sm:w-10 rounded-b-xl rounded-t-md border text-[11px] font-semibold flex items-end justify-center pb-1 ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{ background: kind ? FINDING_COLOR[kind] : '#fff', color: kind && kind !== 'Healthy' ? '#fff' : '#0f172a', opacity: missing ? 0.55 : 1 }}
    >
      {missing ? '×' : fdi}
    </button>
  );
}

function Arch({ teeth, findings, selected, onSelect }: { teeth: string[]; findings: ToothFinding[]; selected: string; onSelect: (fdi: string) => void }) {
  const mid = Math.ceil(teeth.length / 2);
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {teeth.map((fdi, index) => (
        <span key={fdi} className={index === mid ? 'ml-2' : ''}>
          <ToothButton fdi={fdi} selected={selected === fdi} findings={findings.filter((f) => f.tooth === fdi)} onSelect={() => onSelect(fdi)} />
        </span>
      ))}
    </div>
  );
}

export function DentalChartPanel({ patientId, encounterId }: { patientId: string; encounterId?: string }) {
  const { state, setDentition, addFinding, updateFinding, removeFinding, today } = useDental();
  const chart = state.charts.find((c) => c.patientId === patientId);
  const patient = state.patients.find((p) => p.id === patientId);
  const dentition: Dentition = chart?.dentition ?? 'permanent';
  const findings = chart?.findings ?? [];
  const [tooth, setTooth] = useState('');
  const [scope, setScope] = useState<'all' | 'current' | 'previous'>('all');
  const [surface, setSurface] = useState<Surface | 'Whole'>('Whole');
  const [finding, setFinding] = useState<FindingKind>('Dental caries');
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [restoration, setRestoration] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const visible = findings.filter((f) => {
    if (scope === 'current') return f.recordedAt === today || f.visitId === encounterId || f.visitLabel === 'Current encounter';
    if (scope === 'previous') return f.recordedAt !== today && f.visitLabel !== 'Current encounter';
    return true;
  });
  const toothRows = visible.filter((f) => f.tooth === tooth);
  const upper = dentition === 'primary' ? PRIMARY_UPPER : PERMANENT_UPPER;
  const lower = dentition === 'primary' ? PRIMARY_LOWER : PERMANENT_LOWER;
  const surfaceOptions: (Surface | 'Whole')[] = tooth ? ['Whole', ...surfacesFor(tooth)] : ['Whole'];

  const resetForm = () => {
    setEditing(null);
    setNotes('');
    setDiagnosis('');
    setTreatment('');
    setRestoration('');
    setSurface('Whole');
    setFinding('Dental caries');
  };

  const save = () => {
    if (!tooth) {
      notify.error('chart', 'Select a tooth first.');
      return;
    }
    const payload = {
      tooth,
      surface,
      finding,
      notes,
      visitId: encounterId || 'chart',
      visitLabel: encounterId ? 'Current encounter' : 'Chart update',
      diagnosis,
      recommendedTreatment: treatment,
      restoration,
    };
    if (editing) {
      updateFinding(patientId, editing, payload);
      notify.success('chart', 'Finding updated in the demonstration chart.');
    } else {
      addFinding(patientId, payload);
      notify.success('chart', 'Finding added to the demonstration chart.');
    }
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <p className="text-sm font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : patientId}</p>
            <p className="text-xs text-muted-foreground">FDI numbering. Select a tooth, then record a surface finding.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant={dentition === 'permanent' ? 'default' : 'outline'} onClick={() => setDentition(patientId, 'permanent')}>Adult</Button>
            <Button type="button" size="sm" variant={dentition === 'primary' ? 'default' : 'outline'} onClick={() => setDentition(patientId, 'primary')}>Primary</Button>
          </div>
        </div>
        <div className="space-y-3">
          <Arch teeth={upper} findings={visible} selected={tooth} onSelect={setTooth} />
          <div className="h-px bg-border" />
          <Arch teeth={lower} findings={visible} selected={tooth} onSelect={setTooth} />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {FINDINGS.map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-3 w-3 rounded-sm border" style={{ background: FINDING_COLOR[kind] }} />
              {kind}
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-3 text-xs">
          {(['all', 'current', 'previous'] as const).map((key) => (
            <button key={key} type="button" className={`px-2 py-1 rounded-md border ${scope === key ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setScope(key)}>
              {key === 'all' ? 'All findings' : key === 'current' ? 'Current encounter' : 'Previous findings'}
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-xl border bg-card p-4 space-y-3">
        <h3 className="font-semibold">{tooth ? `Tooth ${tooth}` : 'Tooth detail'}</h3>
        {!tooth && <p className="text-sm text-muted-foreground">Select a tooth on the chart.</p>}
        {tooth && (
          <>
            <p className="text-xs text-muted-foreground">
              Biting surface is labelled {bitingSurface(tooth).toLowerCase()}. The inner surface is {lingualLabel(tooth).toLowerCase()}.
            </p>
            <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto text-[10px]">
              <span />
              <SurfaceChip label="Buccal" active={surface === 'Buccal'} onClick={() => setSurface('Buccal')} />
              <span />
              <SurfaceChip label="Mesial" active={surface === 'Mesial'} onClick={() => setSurface('Mesial')} />
              <SurfaceChip label={bitingSurface(tooth)} active={surface === bitingSurface(tooth)} onClick={() => setSurface(bitingSurface(tooth))} />
              <SurfaceChip label="Distal" active={surface === 'Distal'} onClick={() => setSurface('Distal')} />
              <span />
              <SurfaceChip label={lingualLabel(tooth)} active={surface === 'Lingual'} onClick={() => setSurface('Lingual')} />
              <span />
            </div>
            <div className="space-y-2">
              {toothRows.length === 0 && <p className="text-sm text-muted-foreground">No findings in this view.</p>}
              {toothRows.map((row) => (
                <div key={row.id} className="border rounded-lg p-2 text-xs space-y-1">
                  <div className="flex justify-between gap-2">
                    <DentalStatus status={row.finding} />
                    <span>{row.surface === 'Lingual' ? lingualLabel(row.tooth) : row.surface}</span>
                  </div>
                  <p>{row.visitLabel} · {row.recordedAt}</p>
                  {row.diagnosis && <p>Diagnosis: {row.diagnosis}</p>}
                  {row.recommendedTreatment && <p>Plan: {row.recommendedTreatment}</p>}
                  {row.restoration && <p>Restoration: {row.restoration}</p>}
                  {row.notes && <p className="text-muted-foreground">{row.notes}</p>}
                  <div className="flex gap-2">
                    <button type="button" className="text-primary" onClick={() => {
                      setEditing(row.id);
                      setSurface(row.surface);
                      setFinding(row.finding);
                      setNotes(row.notes);
                      setDiagnosis(row.diagnosis);
                      setTreatment(row.recommendedTreatment);
                      setRestoration(row.restoration);
                    }}>Edit</button>
                    <button type="button" className="text-destructive" onClick={() => removeFinding(patientId, row.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3">
              <Label>Finding</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={finding} onChange={(e) => setFinding(e.target.value as FindingKind)}>
                {FINDINGS.map((item) => <option key={item}>{item}</option>)}
              </select>
              <Label>Surface</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={surface} onChange={(e) => setSurface(e.target.value as Surface | 'Whole')}>
                {surfaceOptions.map((item) => (
                  <option key={item} value={item}>{item === 'Lingual' ? lingualLabel(tooth) : item}</option>
                ))}
              </select>
              <Label>Diagnosis</Label>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              <Label>Recommended treatment</Label>
              <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} />
              <Label>Existing restoration</Label>
              <Input value={restoration} onChange={(e) => setRestoration(e.target.value)} />
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <Button type="button" onClick={save}>{editing ? 'Update finding' : 'Add finding'}</Button>
                {editing && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function SurfaceChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`h-10 rounded-md border text-[10px] ${active ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
      {label}
    </button>
  );
}

export function DentalChartPage() {
  const { patientId: routeId } = useParams();
  const [params] = useSearchParams();
  const { state } = useDental();
  const [picked, setPicked] = useState(routeId || params.get('patient') || state.patients[0]?.id || '');
  const patientId = routeId || picked;
  const encounterId = params.get('encounter') || undefined;
  const ages = useMemo(() => state.patients.find((p) => p.id === patientId), [state.patients, patientId]);

  return (
    <DentalShell title="Dental Chart">
      <PageIntro
        title="Dental chart"
        description="Interactive odontogram for adult and primary teeth. Findings are demonstration entries stored in this browser."
      />
      <DemoBanner text="Charting and diagnosis entries are demonstration data. They are not a clinical record and are not sent to a hospital server." />
      {!routeId && (
        <div className="max-w-sm mb-4">
          <Label>Patient</Label>
          <PatientPicker value={patientId} onChange={setPicked} />
          {ages && <p className="text-xs text-muted-foreground mt-1">Age {new Date().getFullYear() - Number(ages.dateOfBirth.slice(0, 4))} — choose Adult or Primary as appropriate.</p>}
        </div>
      )}
      {patientId ? <DentalChartPanel patientId={patientId} encounterId={encounterId} /> : <p className="text-sm text-muted-foreground">Register a patient to open a chart.</p>}
    </DentalShell>
  );
}
