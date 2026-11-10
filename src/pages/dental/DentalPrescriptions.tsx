import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { DENTISTS, MED_CATALOGUE, patientName, type DentalPrescription, type RxMedication, type RxStatus } from '@/data/dentalData';
import { notify } from '@/lib/notify';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow, PageIntro, PatientLink, PatientPicker } from './shared';

function blankMed(): RxMedication {
  return { id: `tmp-${Math.random().toString(36).slice(2, 7)}`, name: '', strength: '', dosage: '', route: 'Oral', frequency: '', duration: '', quantity: '', instructions: '' };
}

export function DentalPrescriptions() {
  const { state, today, savePrescription, warningsFor } = useDental();
  const [params] = useSearchParams();
  const [patientId, setPatientId] = useState(params.get('patient') ?? '');
  const [dentist, setDentist] = useState(DENTISTS[0].name);
  const [meds, setMeds] = useState<RxMedication[]>([blankMed()]);
  const [ack, setAck] = useState(false);
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<DentalPrescription | null>(null);
  const [manual, setManual] = useState(false);

  const patient = state.patients.find((p) => p.id === patientId);
  const warnings = meds.map((m) => warningsFor(patientId, m.name)).filter(Boolean);
  const catalogue = MED_CATALOGUE.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  const addFromCatalogue = (name: string) => {
    const item = MED_CATALOGUE.find((m) => m.name === name);
    if (!item) return;
    setMeds((rows) => [...rows.filter((r) => r.name), {
      ...blankMed(),
      name: item.name,
      strength: item.strength,
      dosage: item.defaultDose,
      route: item.route,
      frequency: item.defaultFreq,
      duration: '5 days',
      quantity: '',
      instructions: 'Take as directed. Seek care if symptoms worsen.',
    }]);
    setAck(false);
  };

  const save = (status: RxStatus) => {
    const medications = meds.filter((m) => m.name.trim()).map((m, index) => ({
      ...m,
      id: m.id.startsWith('tmp-') ? `MED-${Date.now()}-${index}` : m.id,
    }));
    const result = savePrescription({
      patientId,
      encounterId: '',
      date: today,
      dentist,
      status,
      allergyAcknowledged: ack || warnings.length === 0,
      medications,
    });
    if (!result.ok) {
      notify.error('rx', result.message);
      return;
    }
    notify.success('rx', 'Prescription stored in the demonstration record. It is not a legal prescription.');
    setPreview(result.value);
    setMeds([blankMed()]);
    setAck(false);
  };

  const issued = useMemo(() => state.prescriptions, [state.prescriptions]);

  return (
    <DentalShell title="Prescriptions">
      <PageIntro title="Dental prescriptions" description="Illustrative medication entry for common dental workflows. Dosing is not a recommendation." />
      <DemoBanner text="Medication selection, dosing, contraindications, and prescribing decisions require professional clinical review. This preview is not a legally authorised prescription and has no signature." />
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
        <section className="rounded-xl border bg-card p-4 space-y-3">
          <Label>Patient</Label>
          <PatientPicker value={patientId} onChange={(id) => { setPatientId(id); setAck(false); }} />
          {patient && <p className="text-xs">Allergies on file: <strong>{patient.drugAllergies || 'None'}</strong></p>}
          <Label>Prescriber</Label>
          <select className="h-10 w-full rounded-md border bg-background px-2 text-sm" value={dentist} onChange={(e) => setDentist(e.target.value)}>
            {DENTISTS.map((d) => <option key={d.name}>{d.name}</option>)}
          </select>
          <Label>Medication catalogue</Label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search illustrative catalogue" />
          <div className="flex flex-wrap gap-1">
            {catalogue.map((m) => (
              <Button key={m.name} type="button" size="sm" variant="outline" onClick={() => addFromCatalogue(m.name)}>{m.name}</Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setManual(true)}>Manual entry</Button>
          </div>
          {warnings.map((warning) => (
            <p key={warning} className="text-sm border border-rose-300 bg-rose-50 text-rose-900 rounded-lg px-3 py-2">{warning}</p>
          ))}
          {meds.map((med, index) => (
            <div key={med.id} className="border rounded-lg p-3 grid grid-cols-2 gap-2">
              <div className="col-span-2 flex justify-between">
                <Label>Medication {index + 1}</Label>
                <button type="button" className="text-xs text-destructive" onClick={() => setMeds(meds.filter((row) => row.id !== med.id))}>Remove</button>
              </div>
              <Input placeholder="Name" value={med.name} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, name: e.target.value } : row))} />
              <Input placeholder="Strength" value={med.strength} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, strength: e.target.value } : row))} />
              <Input placeholder="Dosage" value={med.dosage} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, dosage: e.target.value } : row))} />
              <Input placeholder="Route" value={med.route} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, route: e.target.value } : row))} />
              <Input placeholder="Frequency" value={med.frequency} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, frequency: e.target.value } : row))} />
              <Input placeholder="Duration" value={med.duration} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, duration: e.target.value } : row))} />
              <Input placeholder="Quantity" value={med.quantity} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, quantity: e.target.value } : row))} />
              <Input className="col-span-2" placeholder="Instructions" value={med.instructions} onChange={(e) => setMeds(meds.map((row) => row.id === med.id ? { ...row, instructions: e.target.value } : row))} />
            </div>
          ))}
          {warnings.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1" />
              I have reviewed the allergy warning. This remains a demonstration entry.
            </label>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => save('Draft')}>Save draft</Button>
            <Button onClick={() => save('Issued')}>Review and save</Button>
          </div>
        </section>
        <section className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Medications</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {issued.length === 0 && <EmptyRow colSpan={5} label="No prescriptions yet." />}
              {issued.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell>{rx.date}</TableCell>
                  <TableCell><PatientLink id={rx.patientId} name={patientName(state.patients.find((p) => p.id === rx.patientId) ?? { firstName: 'Patient', lastName: '' })} /></TableCell>
                  <TableCell>{rx.medications.map((m) => m.name).join(', ')}</TableCell>
                  <TableCell><DentalStatus status={rx.status} /></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setPreview(rx)}>Preview</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>

      <Dialog open={manual} onOpenChange={setManual}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a blank medication row</DialogTitle></DialogHeader>
          <DialogFooter>
            <Button onClick={() => { setMeds([...meds, blankMed()]); setManual(false); }}>Add row</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Prescription preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="dental-rx-print text-sm space-y-2">
              <style>{`@media print { body * { visibility: hidden; } .dental-rx-print, .dental-rx-print * { visibility: visible; } .dental-rx-print { position: absolute; inset: 0; background: white; padding: 24px; } }`}</style>
              <p className="font-semibold">GFA Demo Hospital · Dental Clinic</p>
              <p>Demonstration prescription · {preview.id} · {preview.date}</p>
              <p>Patient: {patientName(state.patients.find((p) => p.id === preview.patientId) ?? { firstName: 'Unknown', lastName: '' })} ({preview.patientId})</p>
              <p>Prescriber name (not a signature): {preview.dentist}</p>
              <ul className="list-disc pl-4">
                {preview.medications.map((m) => (
                  <li key={m.id}>{m.name} {m.strength} — {m.dosage}, {m.route}, {m.frequency} for {m.duration}. Qty {m.quantity || '—'}. {m.instructions}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Not legally authorised. No signature is applied. Clinical review is required before any real prescription.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>Print preview</Button>
            <Button onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DentalShell>
  );
}
