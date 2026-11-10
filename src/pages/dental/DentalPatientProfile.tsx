import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDental } from '@/contexts/DentalStore';
import { ageFromDob, openPlanItems, patientName } from '@/data/dentalData';
import { formatCurrency } from '@/data/dummyData';
import { DentalChartPanel } from './DentalOdontogram';
import { DentalShell, DentalStatus, DemoBanner, EmptyRow } from './shared';

export function DentalPatientProfile() {
  const { patientId = '' } = useParams();
  const navigate = useNavigate();
  const { state, today, nameOf, addDocument } = useDental();
  const patient = state.patients.find((p) => p.id === patientId);
  const [docName, setDocName] = useState('');
  if (!patient) {
    return (
      <DentalShell title="Patient">
        <p className="text-sm">This patient is not in the dental demonstration register.</p>
        <Button className="mt-3" variant="outline" onClick={() => navigate('/dashboard/dental/patients')}>Back to patients</Button>
      </DentalShell>
    );
  }

  const encounters = state.encounters.filter((e) => e.patientId === patient.id);
  const plans = state.plans.filter((p) => p.patientId === patient.id);
  const procedures = state.procedures.filter((p) => p.patientId === patient.id);
  const prescriptions = state.prescriptions.filter((p) => p.patientId === patient.id);
  const investigations = state.investigations.filter((p) => p.patientId === patient.id);
  const appointments = state.appointments.filter((a) => a.patientId === patient.id);
  const documents = state.documents.filter((d) => d.patientId === patient.id);
  const outstanding = plans.reduce((sum, plan) => sum + openPlanItems(plan).length, 0);
  const estimated = plans.flatMap((p) => p.items).reduce((sum, item) => sum + item.estimatedCost, 0);
  const performed = procedures.filter((p) => p.status === 'Completed').reduce((sum, p) => sum + p.charge, 0);
  const upcoming = appointments.find((a) => a.date >= today && a.status !== 'Cancelled' && a.status !== 'Completed');

  return (
    <DentalShell title={patientName(patient)}>
      <p className="text-xs text-muted-foreground mb-2">Dental Clinic / Patients / {patientName(patient)}</p>
      <DemoBanner />
      <div className="rounded-xl border bg-card p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold">{patientName(patient)}</h2>
            <p className="text-sm text-muted-foreground">{patient.id} · {patient.hospitalId || 'No HMS identifier'} · {ageFromDob(patient.dateOfBirth, today)} years · {patient.sex}</p>
            <p className="text-sm mt-1">{patient.phone} · {patient.address}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <DentalStatus status={patient.status} />
              {patient.drugAllergies && patient.drugAllergies.toLowerCase() !== 'none' && <DentalStatus status={`Allergy: ${patient.drugAllergies}`} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate(`/dashboard/dental/encounters/new?patient=${patient.id}`)}>Start consultation</Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/dental/chart/${patient.id}`)}>Open dental chart</Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/dental/plans?patient=${patient.id}&new=1`)}>Create treatment plan</Button>
            <Button variant="outline" onClick={() => navigate(`/dashboard/dental/appointments?patient=${patient.id}&new=1`)}>Book appointment</Button>
            <Button variant="ghost" onClick={() => navigate(`/dashboard/dental/encounters?patient=${patient.id}`)}>View clinical history</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
          <Info label="Last visit" value={patient.lastVisit || 'None'} />
          <Info label="Next appointment" value={upcoming ? `${upcoming.date} ${upcoming.startTime}` : 'None'} />
          <Info label="Outstanding treatments" value={String(outstanding)} />
          <Info label="Allergies" value={patient.drugAllergies || 'None recorded'} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          {['overview', 'medical', 'dental', 'chart', 'encounters', 'plans', 'procedures', 'prescriptions', 'investigations', 'appointments', 'documents', 'billing'].map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">{tab === 'chart' ? 'Odontogram' : tab}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="mt-4 text-sm space-y-2">
          <p><strong>Emergency contact:</strong> {patient.emergencyContact} · {patient.emergencyPhone}</p>
          <p><strong>Medical conditions:</strong> {patient.medicalConditions || 'None recorded'}</p>
          <p><strong>Recent encounters:</strong> {encounters.slice(0, 3).map((e) => `${e.date} ${e.diagnosis || e.status}`).join(' · ') || 'None'}</p>
        </TabsContent>
        <TabsContent value="medical" className="mt-4 text-sm space-y-2">
          <p><strong>History:</strong> {patient.medicalHistory}</p>
          <p><strong>Medications:</strong> {patient.currentMedications || 'None'}</p>
          <p><strong>Allergies:</strong> {patient.drugAllergies}</p>
          <p><strong>Conditions:</strong> {patient.medicalConditions || 'None'}</p>
        </TabsContent>
        <TabsContent value="dental" className="mt-4 text-sm">
          <p>{patient.previousDentalHistory || 'No previous dental history recorded.'}</p>
        </TabsContent>
        <TabsContent value="chart" className="mt-4">
          <DentalChartPanel patientId={patient.id} />
        </TabsContent>
        <TabsContent value="encounters" className="mt-4">
          <SimpleTable headers={['Date', 'Dentist', 'Complaint', 'Diagnosis', 'Status']} empty="No encounters." rows={encounters.map((e) => [e.date, e.dentist, e.chiefComplaint || '—', e.diagnosis || '—', e.status])} links={encounters.map((e) => `/dashboard/dental/encounters/${e.id}`)} />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <SimpleTable headers={['Plan', 'Items open', 'Consent', 'Status']} empty="No treatment plans." rows={plans.map((p) => [p.title, String(openPlanItems(p).length), p.consentStatus, p.status])} />
        </TabsContent>
        <TabsContent value="procedures" className="mt-4">
          <SimpleTable headers={['Date', 'Procedure', 'Tooth', 'Outcome', 'Status']} empty="No procedures recorded." rows={procedures.map((p) => [p.date, p.procedure, p.tooth || '—', p.outcome || '—', p.status])} />
        </TabsContent>
        <TabsContent value="prescriptions" className="mt-4">
          <SimpleTable headers={['Date', 'Medications', 'Dentist', 'Status']} empty="No prescriptions." rows={prescriptions.map((p) => [p.date, p.medications.map((m) => m.name).join(', '), p.dentist, p.status])} />
        </TabsContent>
        <TabsContent value="investigations" className="mt-4">
          <SimpleTable headers={['Date', 'Type', 'Status', 'Result']} empty="No investigations." rows={investigations.map((i) => [i.requestedDate, i.type, i.status, i.result || '—'])} />
        </TabsContent>
        <TabsContent value="appointments" className="mt-4">
          <SimpleTable headers={['Date', 'Time', 'Type', 'Dentist', 'Status']} empty="No appointments." rows={appointments.map((a) => [a.date, a.startTime, a.type, a.dentist, a.status])} />
        </TabsContent>
        <TabsContent value="documents" className="mt-4 space-y-3">
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!docName.trim()) return; addDocument(patient.id, docName.trim(), 'Note', 'Added in the dental demonstration.'); setDocName(''); }}>
            <input className="h-10 rounded-md border px-3 text-sm" placeholder="Document name" value={docName} onChange={(e) => setDocName(e.target.value)} />
            <Button type="submit" variant="outline">Add note</Button>
          </form>
          <SimpleTable headers={['Date', 'Name', 'Kind', 'Note']} empty="No documents." rows={documents.map((d) => [d.date, d.name, d.kind, d.note])} />
        </TabsContent>
        <TabsContent value="billing" className="mt-4 text-sm space-y-2">
          <p>Estimated treatment-plan value: <strong>{formatCurrency(estimated)}</strong></p>
          <p>Illustrative charges for completed procedures: <strong>{formatCurrency(performed)}</strong></p>
          <p className="text-muted-foreground">These figures are not collected revenue and are not posted to the cashier.</p>
          <Link className="text-primary text-sm" to="/dashboard/dental/plans">Open treatment plans</Link>
          <p className="text-xs text-muted-foreground">Patient {nameOf(patient.id)}</p>
        </TabsContent>
      </Tabs>
    </DentalShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function SimpleTable({ headers, rows, empty, links }: { headers: string[]; rows: string[][]; empty: string; links?: string[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <EmptyRow colSpan={headers.length} label={empty} />}
          {rows.map((row, index) => (
            <TableRow key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>
                  {cellIndex === 0 && links?.[index] ? <Link className="text-primary hover:underline" to={links[index]}>{cell}</Link> : cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
