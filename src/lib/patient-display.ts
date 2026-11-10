import { db } from '@/db/database';
import { normalizeLegacyHospitalId } from '@/lib/brand';
import { patientRecords } from '@/data/hmsData';
import type { Visit } from '@/data-access/types';

export type PatientDisplay = {
  name: string;
  hospitalId: string;
  phone: string;
  age: number;
  gender: string;
  bloodGroup: string;
  allergies: string;
  insurance: string;
};

/** Resolve patient for a visit — db canonical id first, then legacy hmsData. */
export function resolvePatientForVisit(visit: Visit): PatientDisplay | null {
  const fromDb = db.patients.getByHospitalId(visit.hospitalId)
    ?? db.patients.list().find(p => p.name === visit.patientName);
  if (fromDb) {
    return {
      name: fromDb.name,
      hospitalId: fromDb.hospitalId,
      phone: fromDb.phone,
      age: fromDb.age ?? 0,
      gender: fromDb.sex,
      bloodGroup: fromDb.bloodGroup ?? '—',
      allergies: fromDb.allergies.length ? fromDb.allergies.join(', ') : 'None',
      insurance: fromDb.insurance,
    };
  }
  const legacy = patientRecords.find(
    p => p.hospitalId === visit.hospitalId
      || normalizeLegacyHospitalId(p.hospitalId) === visit.hospitalId
      || p.name === visit.patientName,
  );
  if (!legacy) return null;
  return {
    name: legacy.name,
    hospitalId: normalizeLegacyHospitalId(legacy.hospitalId),
    phone: legacy.phone,
    age: legacy.age,
    gender: legacy.gender,
    bloodGroup: legacy.bloodGroup,
    allergies: legacy.allergies,
    insurance: legacy.insurance,
  };
}
