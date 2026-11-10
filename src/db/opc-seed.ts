import type { OpcVisit, PsychDiagnosis, OpcAppointment } from '@/data-access/types';
import { seedPatients } from './seed';

const iso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}:00.000Z`);
const P = seedPatients;

export const seedOpcVisits: OpcVisit[] = P.length >= 3 ? [
  {
    id: 'OPC-8201', patientId: P[0].id, patientName: P[0].name, hospitalId: P[0].hospitalId,
    visitType: 'Follow-up', payer: 'NHIS', priority: 'Normal', status: 'WAITING',
    assignedDoctor: 'Dr. Okonkwo', clinic: 'Adult Psychiatry OPC', reason: 'Medication review — schizophrenia',
    checkInAt: iso('2026-06-28 08:10'), createdAt: iso('2026-06-28 08:10'), updatedAt: iso('2026-06-28 08:10'),
    audit: [{ action: 'Checked in (seed)', by: 'Records', at: iso('2026-06-28 08:10') }],
  },
  {
    id: 'OPC-8202', patientId: P[1].id, patientName: P[1].name, hospitalId: P[1].hospitalId,
    visitType: 'New', payer: 'Cash', priority: 'Urgent', status: 'WITH_NURSE',
    assignedDoctor: 'Dr. Balogun', clinic: 'Adult Psychiatry OPC', reason: 'First presentation — low mood, poor sleep',
    checkInAt: iso('2026-06-28 08:25'), createdAt: iso('2026-06-28 08:25'), updatedAt: iso('2026-06-28 08:25'),
    audit: [{ action: 'Checked in (seed)', by: 'Records', at: iso('2026-06-28 08:25') }],
  },
  {
    id: 'OPC-8203', patientId: P[2].id, patientName: P[2].name, hospitalId: P[2].hospitalId,
    visitType: 'Emergency', payer: 'Private', priority: 'Crisis', status: 'WITH_DOCTOR',
    assignedDoctor: 'Dr. Okonkwo', clinic: 'Adult Psychiatry OPC', reason: 'Acute agitation, possible relapse',
    checkInAt: iso('2026-06-28 09:05'), createdAt: iso('2026-06-28 09:05'), updatedAt: iso('2026-06-28 09:05'),
    audit: [{ action: 'Checked in (seed)', by: 'Emergency', at: iso('2026-06-28 09:05') }],
  },
] : [];

export const seedPsychDiagnoses: PsychDiagnosis[] = P.length >= 1 ? [
  {
    id: 'PDX-9201', patientId: P[0].id, patientName: P[0].name, code: 'F20.0', label: 'Paranoid schizophrenia',
    category: 'Schizophrenia spectrum disorders', type: 'Primary', status: 'Active', by: 'Dr. Okonkwo',
    createdAt: iso('2026-05-01 10:00'), updatedAt: iso('2026-05-01 10:00'),
    history: [{ action: 'Diagnosed (seed)', by: 'Dr. Okonkwo', at: iso('2026-05-01 10:00') }],
  },
] : [];

export const seedOpcAppointments: OpcAppointment[] = P.length >= 1 ? [
  {
    id: 'OAP-9601', patientId: P[0].id, patientName: P[0].name, doctor: 'Dr. Okonkwo',
    date: iso('2026-07-26 09:00'), reason: 'Depot review', status: 'SCHEDULED',
    createdAt: iso('2026-06-28 08:30'), updatedAt: iso('2026-06-28 08:30'),
  },
] : [];
