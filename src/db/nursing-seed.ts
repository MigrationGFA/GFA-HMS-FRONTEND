import type {
  Ward, Bed, Admission, NursingFormTemplate, MarEntry, NursingTask,
} from '@/data-access/types';
import { seedPatients } from './seed';

const iso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}:00.000Z`);

// ---- Wards ----
export const seedWards: Ward[] = [
  { id: 'WRD-1', name: 'Male Psychiatric 3B', type: 'Psychiatric', capacity: 12 },
  { id: 'WRD-2', name: 'Female Psychiatric 1C', type: 'Psychiatric', capacity: 12 },
  { id: 'WRD-3', name: 'ICU', type: 'ICU', capacity: 6 },
  { id: 'WRD-4', name: 'Child & Adolescent Ward', type: 'Child', capacity: 8 },
  { id: 'WRD-5', name: 'Psychogeriatric Ward', type: 'Psychogeriatric', capacity: 10 },
  { id: 'WRD-6', name: 'Rehabilitation Ward', type: 'Rehab', capacity: 10 },
];

// ---- Beds (a few occupied by real seed patients, rest available/other statuses) ----
const bedNow = iso('2026-06-28 08:00');
export const seedBeds: Bed[] = [
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `BED-1-${i + 1}`, wardId: 'WRD-1', wardName: 'Male Psychiatric 3B',
    label: `3B-${String(i + 1).padStart(2, '0')}`,
    status: 'AVAILABLE' as const, updatedAt: bedNow,
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `BED-2-${i + 1}`, wardId: 'WRD-2', wardName: 'Female Psychiatric 1C',
    label: `1C-${String(i + 1).padStart(2, '0')}`,
    status: 'AVAILABLE' as const, updatedAt: bedNow,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `BED-3-${i + 1}`, wardId: 'WRD-3', wardName: 'ICU',
    label: `ICU-${String(i + 1).padStart(2, '0')}`,
    status: 'AVAILABLE' as const, isIcu: true, updatedAt: bedNow,
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `BED-5-${i + 1}`, wardId: 'WRD-5', wardName: 'Psychogeriatric Ward',
    label: `PG-${String(i + 1).padStart(2, '0')}`,
    status: 'AVAILABLE' as const, updatedAt: bedNow,
  })),
];

// Admit the first 3 seed patients so nursing has live, real, cross-linked data.
const admittable = seedPatients.slice(0, 3);
const wardAssignments = [
  { ward: seedWards[0], bed: seedBeds[0], type: 'Psychiatric' as const, dx: 'Schizophrenia — acute relapse', consultant: 'Dr. Lawal', sup: 'Close' as const },
  { ward: seedWards[1], bed: seedBeds[6], type: 'Psychiatric' as const, dx: 'Bipolar I — manic episode', consultant: 'Dr. Bello', sup: 'General' as const },
  { ward: seedWards[2], bed: seedBeds[12], type: 'ICU' as const, dx: 'Catatonia — ICU observation', consultant: 'Dr. Okafor', sup: 'Constant' as const },
];

export const seedAdmissions: Admission[] = admittable.map((p, i) => {
  const a = wardAssignments[i];
  return {
    id: `ADM-${2001 + i}`,
    patientId: p.id,
    patientName: p.name,
    hospitalId: p.hospitalId,
    wardId: a.ward.id,
    wardName: a.ward.name,
    bedId: a.bed.id,
    bedLabel: a.bed.label,
    diagnosis: a.dx,
    consultant: a.consultant,
    assignedNurse: 'NO Adaeze',
    admittedAt: iso('2026-06-20 09:30'),
    type: a.type,
    status: 'ADMITTED' as const,
    supervisionLevel: a.sup,
    audit: [{ action: 'Admitted', by: 'Records', at: iso('2026-06-20 09:30') }],
    updatedAt: iso('2026-06-20 09:30'),
  };
});

// Mark the seeded beds occupied by their admitted patients.
seedAdmissions.forEach(adm => {
  const bed = seedBeds.find(b => b.id === adm.bedId);
  if (bed) { bed.status = 'OCCUPIED'; bed.patientId = adm.patientId; }
});

// A couple of MAR entries + tasks so the ward isn't empty on first load.
export const seedMar: MarEntry[] = seedAdmissions.length
  ? [
      {
        id: 'MAR-5001', admissionId: seedAdmissions[0].id, patientId: seedAdmissions[0].patientId,
        drug: 'Olanzapine 10mg', dose: '10mg', route: 'PO', frequency: 'Daily', scheduledTime: '08:00',
        kind: 'Scheduled', status: 'DUE', pharmacyDispensed: true, updatedAt: bedNow,
      },
      {
        id: 'MAR-5002', admissionId: seedAdmissions[0].id, patientId: seedAdmissions[0].patientId,
        drug: 'Sertraline 50mg', dose: '50mg', route: 'PO', frequency: 'Daily', scheduledTime: '12:00',
        kind: 'Scheduled', status: 'PENDING', pharmacyDispensed: true, updatedAt: bedNow,
      },
    ]
  : [];

export const seedNursingTasks: NursingTask[] = seedAdmissions.length
  ? [
      {
        id: 'NTK-6001', admissionId: seedAdmissions[0].id, patientId: seedAdmissions[0].patientId,
        patientName: seedAdmissions[0].patientName, title: 'Record morning vitals',
        category: 'Vitals', status: 'PENDING', dueAt: '08:00', createdAt: bedNow, updatedAt: bedNow,
      },
      {
        id: 'NTK-6002', admissionId: seedAdmissions[2].id, patientId: seedAdmissions[2].patientId,
        patientName: seedAdmissions[2].patientName, title: 'Hourly ICU observation',
        category: 'Monitoring', status: 'IN_PROGRESS', dueAt: 'hourly', createdAt: bedNow, updatedAt: bedNow,
      },
    ]
  : [];

// ---- Form templates (schema-driven; Super Admin can extend) ----
const t = iso('2026-06-01 00:00');
export const seedFormTemplates: NursingFormTemplate[] = [
  {
    id: 'FT-ADM', code: 'NAA-01', title: 'Nursing Admission Assessment', category: 'Assessment', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'chiefComplaint', label: 'Chief Complaint', type: 'textarea', required: true, section: 'Assessment' },
      { key: 'consciousness', label: 'Consciousness Level', type: 'select', options: ['Alert', 'Drowsy', 'Confused', 'Unresponsive'], section: 'Physical' },
      { key: 'mobility', label: 'Mobility', type: 'select', options: ['Independent', 'Assisted', 'Bedbound'], section: 'Physical' },
      { key: 'nutrition', label: 'Nutrition / Feeding', type: 'select', options: ['Normal', 'Poor', 'NPO', 'Tube Feed'], section: 'Physical' },
      { key: 'fallRisk', label: 'Fall Risk', type: 'select', options: ['Low', 'Moderate', 'High'], section: 'Risk' },
      { key: 'suicideRisk', label: 'Suicide Risk', type: 'select', options: ['None', 'Low', 'Moderate', 'High'], section: 'Risk' },
      { key: 'suicidePlan', label: 'Suicide Precautions Plan', type: 'textarea', showIf: { key: 'suicideRisk', equals: 'High' }, section: 'Risk' },
      { key: 'allergies', label: 'Allergies', type: 'text', section: 'History' },
      { key: 'nokName', label: 'Next of Kin', type: 'text', section: 'History' },
      { key: 'initialPlan', label: 'Initial Nursing Care Plan', type: 'textarea', section: 'Plan' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true, section: 'Sign-off' },
    ],
  },
  {
    id: 'FT-PAIN', code: 'PAIN-01', title: 'Pain Assessment', category: 'Assessment', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'score', label: 'Pain Score (0-10)', type: 'number', required: true },
      { key: 'location', label: 'Pain Location', type: 'text' },
      { key: 'character', label: 'Character', type: 'select', options: ['Sharp', 'Dull', 'Throbbing', 'Burning'] },
      { key: 'relief', label: 'Relieving Factors', type: 'text' },
      { key: 'medGiven', label: 'Medication Given', type: 'text' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'FT-FALL', code: 'FALL-01', title: 'Fall Risk Assessment (Morse)', category: 'Safety', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'historyFalls', label: 'History of Falling', type: 'checkbox' },
      { key: 'gait', label: 'Gait', type: 'select', options: ['Normal', 'Weak', 'Impaired'] },
      { key: 'mentalStatus', label: 'Mental Status', type: 'select', options: ['Oriented', 'Overestimates ability'] },
      { key: 'score', label: 'Total Risk Score', type: 'number' },
      { key: 'plan', label: 'Prevention Plan', type: 'textarea' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'FT-WOUND', code: 'WND-01', title: 'Wound Assessment', category: 'Procedure', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'type', label: 'Wound Type', type: 'select', options: ['Pressure Ulcer', 'Surgical', 'Traumatic', 'Other'] },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'size', label: 'Size (L×W×D cm)', type: 'text' },
      { key: 'drainage', label: 'Drainage', type: 'select', options: ['None', 'Serous', 'Purulent', 'Bloody'] },
      { key: 'infection', label: 'Signs of Infection', type: 'checkbox' },
      { key: 'dressing', label: 'Dressing Used', type: 'text' },
      { key: 'nextDate', label: 'Next Dressing Date', type: 'date' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'FT-PSY', code: 'PSY-OBS-01', title: 'Psychiatric Observation', category: 'Psychiatry', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'mood', label: 'Mood', type: 'select', options: ['Euthymic', 'Depressed', 'Elevated', 'Irritable', 'Labile'] },
      { key: 'affect', label: 'Affect', type: 'select', options: ['Appropriate', 'Blunted', 'Flat', 'Restricted'] },
      { key: 'hallucinations', label: 'Hallucinations', type: 'checkbox' },
      { key: 'delusions', label: 'Delusions', type: 'checkbox' },
      { key: 'selfHarmRisk', label: 'Self-harm Risk', type: 'select', options: ['None', 'Low', 'Moderate', 'High'] },
      { key: 'supervision', label: 'Level of Supervision', type: 'select', options: ['General', 'Close', 'Constant'] },
      { key: 'behaviour', label: 'Behaviour During Shift', type: 'textarea' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'FT-SECLUSION', code: 'SEC-01', title: 'Seclusion Monitoring', category: 'Psychiatry', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'reason', label: 'Reason for Seclusion', type: 'textarea', required: true },
      { key: 'authorizedBy', label: 'Authorized By', type: 'text', required: true },
      { key: 'startTime', label: 'Start Time', type: 'time' },
      { key: 'vitals', label: 'Vital Signs', type: 'text' },
      { key: 'behaviour', label: 'Behaviour', type: 'textarea' },
      { key: 'intake', label: 'Food / Water Intake', type: 'text' },
      { key: 'endTime', label: 'End Time', type: 'time' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'FT-DISCH', code: 'DIS-01', title: 'Nursing Discharge Summary', category: 'Discharge', active: true, version: 1, updatedAt: t,
    fields: [
      { key: 'admissionDx', label: 'Admission Diagnosis', type: 'text' },
      { key: 'treatment', label: 'Treatment Received', type: 'textarea' },
      { key: 'condition', label: 'Condition at Discharge', type: 'select', options: ['Improved', 'Stable', 'Unchanged', 'Referred'] },
      { key: 'education', label: 'Patient Education Given', type: 'textarea' },
      { key: 'followUp', label: 'Follow-up Appointment', type: 'date' },
      { key: 'nurseSignature', label: 'Nurse Signature', type: 'signature', required: true },
    ],
  },
];
