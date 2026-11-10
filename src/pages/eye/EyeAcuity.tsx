import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEye } from '@/contexts/EyeStore';
import { ACUITY_VALUES, CLINICIANS, emptyAcuityEye, type AcuityEye, type VisualAcuity } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeBadge, EyeShell, EyeStatus, PageIntro, PatientPicker, selectClass } from './shared';

const FIELDS: { key: keyof AcuityEye; label: string }[] = [
  { key: 'unaided', label: 'Unaided' },
  { key: 'pinhole', label: 'Pinhole' },
  { key: 'presenting', label: 'Presenting' },
  { key: 'bestCorrected', label: 'Best corrected' },
  { key: 'near', label: 'Near' },
];

function EyeColumn({ title, side, value, onChange }: { title: string; side: 'OD' | 'OS' | 'OU'; value: AcuityEye; onChange: (next: AcuityEye) => void }) {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><EyeBadge side={side} /></div>
      {FIELDS.map((field) => (
        <div key={field.key}>
          <Label>{field.label}</Label>
          <select className={selectClass()} value={value[field.key]} onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}>
            <option value="">Not recorded</option>
            {ACUITY_VALUES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

export default function EyeAcuity() {
  const eye = useEye();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [method, setMethod] = useState('Snellen');
  const [clinician, setClinician] = useState(CLINICIANS[0].name);
  const [notes, setNotes] = useState('');
  const [od, setOd] = useState<AcuityEye>(emptyAcuityEye());
  const [os, setOs] = useState<AcuityEye>(emptyAcuityEye());
  const [ou, setOu] = useState<AcuityEye>(emptyAcuityEye());
  const [editing, setEditing] = useState('');
  const [compare, setCompare] = useState<string[]>([]);

  const history = useMemo(() => eye.state.acuity.filter((row) => !patientId || row.patientId === patientId), [eye.state.acuity, patientId]);

  const load = (row: VisualAcuity) => {
    setEditing(row.id);
    setPatientId(row.patientId);
    setMethod(row.method);
    setClinician(row.clinician);
    setNotes(row.notes);
    setOd(row.od);
    setOs(row.os);
    setOu(row.ou);
  };

  const save = (status: 'Draft' | 'Saved') => {
    const result = eye.saveAcuity({
      id: editing || undefined,
      patientId, encounterId: '', date: eye.today, time: '09:00', clinician, method,
      correctionUsed: Boolean(od.presenting || os.presenting), notes, od, os, ou, status,
    });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    setEditing(result.value.id);
    eyeNotify('success', status === 'Saved' ? 'Visual acuity saved in this browser.' : 'Draft kept in this browser.');
  };

  const compared = history.filter((row) => compare.includes(row.id));

  return (
    <EyeShell title="Visual acuity">
      <PageIntro title="Visual Acuity" description="Record OD (right), OS (left), and OU as labelled categories. The clinic does not calculate a diagnosis from these values." />
      <DemoBanner />
      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <div><Label>Patient</Label><PatientPicker value={patientId} onChange={setPatientId} /></div>
        <div><Label>Chart</Label><select className={selectClass()} value={method} onChange={(e) => setMethod(e.target.value)}><option>Snellen</option><option>LogMAR</option><option>Near card</option></select></div>
        <div><Label>Clinician</Label><select className={selectClass()} value={clinician} onChange={(e) => setClinician(e.target.value)}>{CLINICIANS.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
      </div>
      <div className="grid lg:grid-cols-3 gap-3 mb-4">
        <EyeColumn title="Right eye" side="OD" value={od} onChange={setOd} />
        <EyeColumn title="Left eye" side="OS" value={os} onChange={setOs} />
        <EyeColumn title="Both eyes" side="OU" value={ou} onChange={setOu} />
      </div>
      <Label>Notes</Label>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-3" />
      <div className="flex gap-2 mb-6">
        <Button variant="outline" onClick={() => save('Draft')}>Save draft</Button>
        <Button onClick={() => save('Saved')}>Save acuity</Button>
      </div>
      <h3 className="font-semibold mb-2">History</h3>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Compare', 'Date', 'Patient', 'OD unaided', 'OS unaided', 'Status', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={compare.includes(row.id)} aria-label={`Compare ${row.id}`} onChange={(e) => setCompare((cur) => e.target.checked ? [...cur, row.id].slice(-2) : cur.filter((id) => id !== row.id))} /></td>
                <td className="p-2">{row.date}</td>
                <td className="p-2">{eye.nameOf(row.patientId)}</td>
                <td className="p-2">{row.od.unaided || '—'}</td>
                <td className="p-2">{row.os.unaided || '—'}</td>
                <td className="p-2"><EyeStatus status={row.status} /></td>
                <td className="p-2"><Button size="sm" variant="outline" onClick={() => load(row)}>Open</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compared.length === 2 && (
        <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
          {compared.map((row) => (
            <div key={row.id} className="rounded-lg border p-3">
              <p className="font-medium">{row.date} · {row.method}</p>
              <p>OD unaided {row.od.unaided || '—'} · best {row.od.bestCorrected || '—'}</p>
              <p>OS unaided {row.os.unaided || '—'} · best {row.os.bestCorrected || '—'}</p>
            </div>
          ))}
        </div>
      )}
    </EyeShell>
  );
}
