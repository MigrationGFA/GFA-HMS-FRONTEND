import { hospitalId, normalizeLegacyHospitalId } from '@/lib/brand';
import type { Patient, Visit, Invoice, Payment, AuditEntry } from '@/data-access/types';
import { patientRecords as hmsPatients } from '@/data/hmsData';
import {
  visits as legacyVisits,
  billingInvoices as legacyInvoices,
  billingTxns as legacyPayments,
  billingAudit as legacyAudit,
} from '@/data/billingData';

const iso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}:00.000Z`);

// Canonical patients ported from hmsData.patientRecords (8 records).
export const seedPatients: Patient[] = hmsPatients.map((p, i) => {
  const seq = 145 + i;
  const allergies = p.allergies === 'None' ? [] : p.allergies.split(',').map(s => s.trim());
  return {
    id: `PT-${1001 + i}`,
    hospitalId: hospitalId(seq, 2026),
    name: p.name,
    phone: p.phone,
    nin: p.nin,
    sex: p.gender,
    age: p.age,
    address: p.address,
    bloodGroup: p.bloodGroup,
    allergies,
    insurance: p.insurance,
    source: p.source === 'Online' ? 'Online' : 'Walk-in',
    createdAt: iso(`${p.registeredOn} 08:00`),
    updatedAt: iso(`${p.registeredOn} 08:00`),
  };
});

const patientByLegacyHospitalId = new Map<string, Patient>();
seedPatients.forEach((p, i) => {
  const legacy = hmsPatients[i].hospitalId;
  patientByLegacyHospitalId.set(legacy, p);
  patientByLegacyHospitalId.set(normalizeLegacyHospitalId(legacy), p);
});

const resolvePatient = (legacyHospitalId: string, patientName: string): Patient | undefined =>
  patientByLegacyHospitalId.get(legacyHospitalId)
  ?? patientByLegacyHospitalId.get(normalizeLegacyHospitalId(legacyHospitalId))
  ?? seedPatients.find(p => p.name === patientName);

export const seedVisits: Visit[] = legacyVisits.map(v => {
  const patient = resolvePatient(v.hospitalId, v.patientName);
  return {
    ...v,
    patientId: patient?.id ?? 'PT-unknown',
    hospitalId: patient?.hospitalId ?? normalizeLegacyHospitalId(v.hospitalId),
  };
});

export const seedInvoices: Invoice[] = legacyInvoices.map(inv => {
  const patient = resolvePatient(inv.hospitalId, inv.patientName);
  return {
    ...inv,
    patientId: patient?.id ?? 'PT-unknown',
    hospitalId: patient?.hospitalId ?? normalizeLegacyHospitalId(inv.hospitalId),
    lines: [{
      desc: `${inv.department} consultation`,
      qty: 1,
      unitPrice: inv.amount,
      source: 'Billing',
    }],
  };
});

export const seedPayments: Payment[] = legacyPayments.map(t => ({ ...t }));

export const seedAudit: AuditEntry[] = legacyAudit.map(a => ({
  id: a.id,
  actor: a.actor,
  role: a.role,
  action: a.action,
  entity: 'invoice',
  entityId: a.invoiceRef,
  invoiceRef: a.invoiceRef,
  channel: a.channel,
  at: a.timestamp,
}));

export type SeedSnapshot = {
  patients: Patient[];
  visits: Visit[];
  invoices: Invoice[];
  payments: Payment[];
  audit: AuditEntry[];
};

export const buildSeed = (): SeedSnapshot => ({
  patients: seedPatients,
  visits: seedVisits,
  invoices: seedInvoices,
  payments: seedPayments,
  audit: seedAudit,
});
