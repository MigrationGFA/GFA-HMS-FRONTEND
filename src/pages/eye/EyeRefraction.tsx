import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEye } from '@/contexts/EyeStore';
import { CLINICIANS, emptyRefractionEye, type Refraction, type RefractionEye, type RefractionType } from '@/data/eyeData';
import { eyeNotify, DemoBanner, EyeBadge, EyeShell, EyeStatus, PageIntro, PatientPicker, selectClass } from './shared';

const TYPES: RefractionType[] = ['Current spectacle prescription', 'Objective refraction', 'Subjective refraction', 'Final refraction', 'Cycloplegic refraction', 'Other'];
const KEYS: (keyof RefractionEye)[] = ['sphere', 'cylinder', 'axis', 'prism', 'base', 'add', 'distanceAcuity', 'nearAcuity', 'bestCorrected'];

function EyeFields({ side, value, onChange }: { side: 'OD' | 'OS'; value: RefractionEye; onChange: (next: RefractionEye) => void }) {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <EyeBadge side={side} />
      {KEYS.map((key) => (
        <div key={key}>
          <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
          <Input value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

export default function EyeRefraction() {
  const eye = useEye();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [type, setType] = useState<RefractionType>('Subjective refraction');
  const [clinician, setClinician] = useState(CLINICIANS[1].name);
  const [pd, setPd] = useState('');
  const [notes, setNotes] = useState('');
  const [od, setOd] = useState<RefractionEye>(emptyRefractionEye());
  const [os, setOs] = useState<RefractionEye>(emptyRefractionEye());
  const [editing, setEditing] = useState('');
  const [compare, setCompare] = useState<string[]>([]);

  const history = useMemo(() => eye.state.refractions.filter((row) => !patientId || row.patientId === patientId), [eye.state.refractions, patientId]);

  const load = (row: Refraction) => {
    setEditing(row.id); setPatientId(row.patientId); setType(row.type); setClinician(row.clinician);
    setPd(row.pd); setNotes(row.notes); setOd(row.od); setOs(row.os);
  };

  const save = (status: 'Draft' | 'Saved') => {
    const result = eye.saveRefraction({ id: editing || undefined, patientId, encounterId: '', date: eye.today, clinician, type, notes, pd, od, os, status });
    if (!result.ok) { eyeNotify('error', result.message); return; }
    setEditing(result.value.id);
    eyeNotify('success', status === 'Saved' ? 'Refraction saved in this browser.' : 'Refraction draft kept in this browser.');
  };

  const generate = (id: string) => {
    const result = eye.spectacleFromRefraction(id);
    if (!result.ok) { eyeNotify('error', result.message); return; }
    eyeNotify('success', 'Draft spectacle prescription created from the saved refraction.');
    navigate(`/dashboard/eye/spectacles?patient=${result.value.patientId}&rx=${result.value.id}`);
  };

  const compared = history.filter((row) => compare.includes(row.id));

  return (
    <EyeShell title="Refraction">
      <PageIntro title="Refraction" description="Sphere, cylinder, axis, prism, and addition are entered by the clinician. A spectacle prescription is copied only from a saved subjective or final result." />
      <DemoBanner text="Demonstration refraction. Generating spectacles does not authorise dispensing." />
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <div><Label>Patient</Label><PatientPicker value={patientId} onChange={setPatientId} /></div>
        <div><Label>Type</Label><select className={selectClass()} value={type} onChange={(e) => setType(e.target.value as RefractionType)}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><Label>Clinician</Label><select className={selectClass()} value={clinician} onChange={(e) => setClinician(e.target.value)}>{CLINICIANS.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><Label>PD (mm)</Label><Input value={pd} onChange={(e) => setPd(e.target.value)} /></div>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <EyeFields side="OD" value={od} onChange={setOd} />
        <EyeFields side="OS" value={os} onChange={setOs} />
      </div>
      <Label>Notes</Label>
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-3" />
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="outline" onClick={() => save('Draft')}>Save draft</Button>
        <Button onClick={() => save('Saved')}>Save refraction</Button>
        {editing && <Button variant="secondary" onClick={() => generate(editing)}>Generate spectacle prescription</Button>}
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>{['Compare', 'Date', 'Type', 'OD sphere', 'OS sphere', 'Status', ''].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2"><input type="checkbox" aria-label={`Compare ${row.id}`} checked={compare.includes(row.id)} onChange={(e) => setCompare((cur) => e.target.checked ? [...cur, row.id].slice(-2) : cur.filter((id) => id !== row.id))} /></td>
                <td className="p-2">{row.date}</td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.od.sphere || '—'}</td>
                <td className="p-2">{row.os.sphere || '—'}</td>
                <td className="p-2"><EyeStatus status={row.status} /></td>
                <td className="p-2 space-x-2"><Button size="sm" variant="outline" onClick={() => load(row)}>Open</Button><Button size="sm" variant="outline" onClick={() => generate(row.id)}>Spectacles</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compared.length === 2 && (
        <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm">
          {compared.map((row) => <div key={row.id} className="rounded-lg border p-3"><p className="font-medium">{row.date} · {row.type}</p><p>OD {row.od.sphere || '—'} / {row.od.cylinder || '—'} × {row.od.axis || '—'}</p><p>OS {row.os.sphere || '—'} / {row.os.cylinder || '—'} × {row.os.axis || '—'}</p></div>)}
        </div>
      )}
    </EyeShell>
  );
}
