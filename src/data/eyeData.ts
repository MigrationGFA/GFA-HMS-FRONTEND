import { patientRecords } from '@/data/hmsData';

export type Sex = 'Male' | 'Female';
export type PatientStatus = 'Active' | 'Inactive';
export type EyeSide = 'OD' | 'OS' | 'OU' | 'Unspecified' | 'Not applicable';
export type AppointmentStatus = 'Scheduled' | 'Checked In' | 'Waiting' | 'In Consultation' | 'Completed' | 'Cancelled' | 'No Show';
export type VisitType =
  | 'New eye consultation'
  | 'Routine review'
  | 'Refraction'
  | 'Visual acuity assessment'
  | 'Contact lens assessment'
  | 'Glaucoma review'
  | 'Cataract assessment'
  | 'Diagnostic testing'
  | 'Post-procedure review'
  | 'Emergency eye assessment';
export type RoomStatus = 'Available' | 'In Use' | 'Cleaning' | 'Closed';
export type AcuityValue =
  | '6/6' | '6/9' | '6/12' | '6/18' | '6/24' | '6/36' | '6/60'
  | 'Counting fingers' | 'Hand movements' | 'Light perception' | 'No light perception';
export type EncounterStatus = 'Draft' | 'Saved' | 'Completed';
export type DiagnosisStatus = 'Suspected' | 'Confirmed' | 'Resolved';
export type DiagnosisRank = 'Primary' | 'Secondary';
export type RefractionType = 'Current spectacle prescription' | 'Objective refraction' | 'Subjective refraction' | 'Final refraction' | 'Cycloplegic refraction' | 'Other';
export type RecordStatus = 'Draft' | 'Saved';
export type InvStatus = 'Requested' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type Priority = 'Routine' | 'Soon' | 'Urgent';
export type RxStatus = 'Draft' | 'Issued' | 'Cancelled';
export type PlanItemStatus = 'Proposed' | 'Awaiting Consent' | 'Approved' | 'Scheduled' | 'In Progress' | 'Completed' | 'Deferred' | 'Cancelled';
export type ProcedureStatus = 'Recorded' | 'Completed' | 'Cancelled';
export type ReferralStatus = 'Draft' | 'Sent' | 'Accepted' | 'Appointment Scheduled' | 'Completed' | 'Cancelled';
export type FollowUpStatus = 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
export type SpecStatus = 'Draft' | 'Final';
export type LensType = 'Single vision' | 'Bifocal' | 'Progressive' | 'Reading' | 'Other';
export type FindingChoice = '' | 'Not assessed' | 'Normal' | 'Abnormal';
export type EquipmentStatus = 'Available' | 'In use' | 'Maintenance due' | 'Unavailable';

export interface EyePatient {
  id: string;
  hospitalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  medicalHistory: string;
  drugAllergies: string;
  currentMedications: string;
  systemicConditions: string;
  previousEyeConditions: string;
  previousEyeSurgeries: string;
  currentCorrection: string;
  familyEyeHistory: string;
  presentingComplaint: string;
  preferredAppointmentDate: string;
  status: PatientStatus;
  lastVisit: string;
  nextAppointment: string;
  createdAt: string;
}

export interface EyeAppointment {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: VisitType;
  clinician: string;
  roomId: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
}

export interface EyeRoom {
  id: string;
  name: string;
  type: string;
  status: RoomStatus;
  clinician: string;
}

export interface AcuityEye {
  unaided: string;
  pinhole: string;
  presenting: string;
  bestCorrected: string;
  near: string;
}

export interface VisualAcuity {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  time: string;
  clinician: string;
  method: string;
  correctionUsed: boolean;
  notes: string;
  od: AcuityEye;
  os: AcuityEye;
  ou: AcuityEye;
  status: RecordStatus;
}

export interface RefractionEye {
  sphere: string;
  cylinder: string;
  axis: string;
  prism: string;
  base: string;
  add: string;
  distanceAcuity: string;
  nearAcuity: string;
  bestCorrected: string;
}

export interface Refraction {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  clinician: string;
  type: RefractionType;
  notes: string;
  pd: string;
  od: RefractionEye;
  os: RefractionEye;
  status: RecordStatus;
}

export interface EyeExam {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  clinician: string;
  complaint: string;
  affectedEye: EyeSide;
  onset: string;
  duration: string;
  severity: string;
  symptoms: string[];
  urgentReview: boolean;
  previousTreatment: string;
  historyNotes: string;
  diabetes: boolean;
  hypertension: boolean;
  trauma: string;
  surgery: string;
  glaucomaHistory: string;
  cataractHistory: string;
  retinalHistory: string;
  medications: string;
  allergies: string;
  familyHistory: string;
  external: Record<string, { choice: FindingChoice; notes: string }>;
  anteriorOd: Record<string, { choice: FindingChoice; notes: string }>;
  anteriorOs: Record<string, { choice: FindingChoice; notes: string }>;
  iopOd: string;
  iopOs: string;
  iopMethod: string;
  iopTime: string;
  iopNotes: string;
  pupilSizeOd: string;
  pupilSizeOs: string;
  pupilReaction: string;
  rapd: string;
  pupilNotes: string;
  fundusOd: Record<string, { choice: FindingChoice; notes: string }>;
  fundusOs: Record<string, { choice: FindingChoice; notes: string }>;
  fundusNotPerformed: boolean;
  visualFields: string;
  colourVision: string;
  binocular: string;
  otherFindings: string;
  status: RecordStatus;
}

export interface EyeEncounter {
  id: string;
  patientId: string;
  date: string;
  time: string;
  clinician: string;
  designation: string;
  chiefComplaint: string;
  hpc: string;
  medicalHistory: string;
  ophthalmicHistory: string;
  assessment: string;
  diagnosisSummary: string;
  differential: string;
  treatmentPlan: string;
  notes: string;
  followUp: string;
  status: EncounterStatus;
}

export interface EyeDiagnosis {
  id: string;
  patientId: string;
  encounterId: string;
  name: string;
  eye: EyeSide;
  rank: DiagnosisRank;
  status: DiagnosisStatus;
  date: string;
  notes: string;
}

export interface EyeInvestigation {
  id: string;
  patientId: string;
  encounterId: string;
  test: string;
  indication: string;
  eye: EyeSide;
  requestedDate: string;
  clinician: string;
  priority: Priority;
  status: InvStatus;
  result: string;
  reportDate: string;
  reviewer: string;
}

export interface RxItem {
  id: string;
  name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  eye: EyeSide;
  instructions: string;
}

export interface EyePrescription {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  clinician: string;
  status: RxStatus;
  allergyAcknowledged: boolean;
  items: RxItem[];
}

export interface SpectacleRx {
  id: string;
  patientId: string;
  refractionId: string;
  date: string;
  clinician: string;
  reviewDate: string;
  distanceOrNear: 'Distance' | 'Near' | 'Both';
  pd: string;
  lensType: LensType;
  material: string;
  coating: string;
  notes: string;
  instructions: string;
  od: RefractionEye;
  os: RefractionEye;
  status: SpecStatus;
}

export interface ContactLensEye {
  baseCurve: string;
  diameter: string;
  sphere: string;
  cylinder: string;
  axis: string;
}

export interface ContactLensRecord {
  id: string;
  patientId: string;
  date: string;
  clinician: string;
  lensType: string;
  material: string;
  replacement: string;
  od: ContactLensEye;
  os: ContactLensEye;
  fittingNotes: string;
  comfort: string;
  followUpDate: string;
  status: RecordStatus;
}

export interface TreatmentItem {
  id: string;
  diagnosis: string;
  treatment: string;
  eye: EyeSide;
  description: string;
  priority: Priority;
  plannedDate: string;
  clinician: string;
  durationMin: number;
  estimatedCost: number;
  status: PlanItemStatus;
  notes: string;
  procedureId: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  createdAt: string;
  clinician: string;
  status: 'Open' | 'Completed' | 'Cancelled';
  items: TreatmentItem[];
}

export interface EyeProcedure {
  id: string;
  patientId: string;
  encounterId: string;
  planId: string;
  planItemId: string;
  name: string;
  eye: EyeSide;
  indication: string;
  date: string;
  clinician: string;
  materials: string;
  notes: string;
  outcome: string;
  complications: string;
  postInstructions: string;
  followUpDate: string;
  status: ProcedureStatus;
  charge: number;
}

export interface EyeReferral {
  id: string;
  patientId: string;
  encounterId: string;
  clinician: string;
  destination: string;
  reason: string;
  symptoms: string;
  findings: string;
  diagnosis: string;
  priority: Priority;
  date: string;
  notes: string;
  status: ReferralStatus;
}

export interface EyeFollowUp {
  id: string;
  patientId: string;
  encounterId: string;
  reason: string;
  dueDate: string;
  clinician: string;
  status: FollowUpStatus;
  notes: string;
  appointmentId: string;
}

export interface EducationNote {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  topics: string[];
  notes: string;
}

export interface EyeEquipment {
  id: string;
  name: string;
  assetId: string;
  type: string;
  location: string;
  status: EquipmentStatus;
  lastMaintenance: string;
  nextMaintenance: string;
  notes: string;
}

export interface EyeStock {
  id: string;
  name: string;
  category: string;
  code: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  expiry: string;
  location: string;
}

export interface EyeDocument {
  id: string;
  patientId: string;
  name: string;
  kind: string;
  date: string;
  note: string;
}

export interface EyeState {
  patients: EyePatient[];
  appointments: EyeAppointment[];
  rooms: EyeRoom[];
  acuity: VisualAcuity[];
  refractions: Refraction[];
  exams: EyeExam[];
  encounters: EyeEncounter[];
  diagnoses: EyeDiagnosis[];
  investigations: EyeInvestigation[];
  prescriptions: EyePrescription[];
  spectacles: SpectacleRx[];
  contactLenses: ContactLensRecord[];
  plans: TreatmentPlan[];
  procedures: EyeProcedure[];
  referrals: EyeReferral[];
  followUps: EyeFollowUp[];
  education: EducationNote[];
  equipment: EyeEquipment[];
  inventory: EyeStock[];
  documents: EyeDocument[];
}

export const STORAGE_KEY = 'gfa_eye_v1';

export const CLINICIANS = [
  { name: 'Dr. Adaeze Okonkwo', designation: 'Ophthalmologist' },
  { name: 'Optom. Tunde Bello', designation: 'Optometrist' },
] as const;

export const ACUITY_VALUES: AcuityValue[] = [
  '6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60',
  'Counting fingers', 'Hand movements', 'Light perception', 'No light perception',
];

export const VISIT_TYPES: VisitType[] = [
  'New eye consultation', 'Routine review', 'Refraction', 'Visual acuity assessment',
  'Contact lens assessment', 'Glaucoma review', 'Cataract assessment', 'Diagnostic testing',
  'Post-procedure review', 'Emergency eye assessment',
];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'Scheduled', 'Checked In', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show',
];

export const DIAGNOSIS_CATALOGUE = [
  'Refractive error', 'Myopia', 'Hyperopia', 'Astigmatism', 'Presbyopia', 'Cataract',
  'Glaucoma or suspected glaucoma', 'Conjunctivitis', 'Dry eye disease', 'Blepharitis',
  'Corneal abrasion', 'Diabetic retinopathy', 'Age-related macular degeneration', 'Retinal disease',
  'Other eye condition',
];

export const INVESTIGATION_CATALOGUE = [
  'Optical coherence tomography (OCT)', 'Fundus photography', 'Visual field testing',
  'Corneal topography', 'Pachymetry', 'Gonioscopy', 'B-scan ultrasonography', 'A-scan biometry',
  'Keratometry', 'Colour vision testing', 'Other ophthalmic investigation',
];

export const SYMPTOMS = [
  'Blurred vision', 'Eye pain', 'Redness', 'Discharge', 'Itching', 'Watering', 'Photophobia',
  'Floaters', 'Flashes', 'Double vision', 'Visual field changes', 'Sudden visual loss',
];

export const URGENT_SYMPTOMS = ['Sudden visual loss', 'Flashes', 'Visual field changes', 'Eye pain'];

export const MED_CATALOGUE: { name: string; strength: string; route: string; category: string; allergyHints: string[] }[] = [
  { name: 'Hypromellose eye drops', strength: '0.3%', route: 'Topical ocular', category: 'Lubricating eye drops', allergyHints: [] },
  { name: 'Chloramphenicol eye drops', strength: '0.5%', route: 'Topical ocular', category: 'Antibiotic ophthalmic preparations', allergyHints: ['chloramphenicol'] },
  { name: 'Olopatadine eye drops', strength: '0.1%', route: 'Topical ocular', category: 'Anti-allergy ophthalmic preparations', allergyHints: [] },
  { name: 'Dexamethasone eye drops', strength: '0.1%', route: 'Topical ocular', category: 'Anti-inflammatory ophthalmic preparations', allergyHints: [] },
  { name: 'Timolol eye drops', strength: '0.5%', route: 'Topical ocular', category: 'Glaucoma medications', allergyHints: ['timolol', 'beta'] },
  { name: 'Latanoprost eye drops', strength: '0.005%', route: 'Topical ocular', category: 'Glaucoma medications', allergyHints: ['latanoprost'] },
  { name: 'Chloramphenicol eye ointment', strength: '1%', route: 'Topical ocular', category: 'Ophthalmic ointments', allergyHints: ['chloramphenicol'] },
  { name: 'Sodium cromoglicate eye drops', strength: '2%', route: 'Topical ocular', category: 'Anti-allergy ophthalmic preparations', allergyHints: [] },
];

export const EDUCATION_TOPICS = [
  'Eye drop administration instructions', 'Spectacle care', 'Contact lens hygiene',
  'Post-procedure care', 'General eye health information', 'Follow-up instructions',
];

export const EXTERNAL_FIELDS = ['Eyelids', 'Eyelashes', 'Conjunctiva', 'Sclera', 'Periorbital area', 'Eye alignment', 'Pupils', 'Extraocular movements'];
export const ANTERIOR_FIELDS = ['Cornea', 'Anterior chamber', 'Iris', 'Lens', 'Slit-lamp findings'];
export const FUNDUS_FIELDS = ['Optic disc', 'Cup-to-disc ratio', 'Macula', 'Retinal vessels', 'Peripheral retina', 'Vitreous', 'Other findings'];
export const PLAN_STATUSES: PlanItemStatus[] = ['Proposed', 'Awaiting Consent', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
export const REFERRAL_DESTINATIONS = [
  'Ophthalmology subspecialist', 'Retina specialist', 'Glaucoma specialist', 'Cornea specialist',
  'Paediatric ophthalmology', 'Oculoplastic services', 'Low-vision services', 'External eye centre', 'Other department',
];

export const emptyAcuityEye = (): AcuityEye => ({ unaided: '', pinhole: '', presenting: '', bestCorrected: '', near: '' });
export const emptyRefractionEye = (): RefractionEye => ({
  sphere: '', cylinder: '', axis: '', prism: '', base: '', add: '', distanceAcuity: '', nearAcuity: '', bestCorrected: '',
});
export const emptyContactEye = (): ContactLensEye => ({ baseCurve: '', diameter: '', sphere: '', cylinder: '', axis: '' });

export function blankFindings(fields: string[]): Record<string, { choice: FindingChoice; notes: string }> {
  return Object.fromEntries(fields.map((field) => [field, { choice: '' as FindingChoice, notes: '' }]));
}

export function isoDate(offsetDays = 0, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ageFromDob(dob: string, today = isoDate()): number {
  if (!dob) return 0;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  return age;
}

export function patientName(p: Pick<EyePatient, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function nextSerial(prefix: string, existing: string[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`);
  for (const id of existing) {
    const match = id.match(re);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function followUpDisplayStatus(item: EyeFollowUp, today: string): FollowUpStatus {
  if (item.status === 'Completed' || item.status === 'Cancelled') return item.status;
  if (item.dueDate < today) return 'Overdue';
  return 'Upcoming';
}

export function stockStatus(item: EyeStock, today: string): 'In stock' | 'Low stock' | 'Out of stock' | 'Expiring soon' | 'Expired' {
  if (item.expiry && item.expiry < today) return 'Expired';
  if (item.quantity <= 0) return 'Out of stock';
  if (item.quantity <= item.reorderLevel) return 'Low stock';
  if (item.expiry) {
    const days = (new Date(`${item.expiry}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
    if (days <= 90) return 'Expiring soon';
  }
  return 'In stock';
}

export function parseDioptre(value: string): number | null {
  const trimmed = value.trim().replace(/^\+/, '');
  if (!trimmed || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateEyeRefraction(eye: RefractionEye, label: string): string {
  if (!eye.sphere.trim() && !eye.cylinder.trim() && !eye.axis.trim() && !eye.add.trim()) return '';
  if (eye.sphere.trim()) {
    const sph = parseDioptre(eye.sphere);
    if (sph === null || sph < -30 || sph > 30) return `${label} sphere must be a number between -30 and +30.`;
  }
  if (eye.cylinder.trim()) {
    const cyl = parseDioptre(eye.cylinder);
    if (cyl === null || cyl < -20 || cyl > 20) return `${label} cylinder must be a number between -20 and +20.`;
    if (cyl !== 0) {
      const axis = Number(eye.axis);
      if (!eye.axis.trim() || !Number.isFinite(axis) || axis < 1 || axis > 180) {
        return `${label} axis must be between 1 and 180 when a cylinder is entered.`;
      }
    }
  }
  if (eye.add.trim()) {
    const add = parseDioptre(eye.add);
    if (add === null || add < 0 || add > 4) return `${label} addition must be between 0 and +4.00.`;
  }
  return '';
}

export function canGenerateSpectacle(ref: Refraction): string {
  if (ref.status !== 'Saved') return 'Save the refraction before generating a spectacle prescription.';
  if (ref.type !== 'Final refraction' && ref.type !== 'Subjective refraction') {
    return 'Use a saved subjective or final refraction. Measured drafts are not copied into a prescription.';
  }
  const odError = validateEyeRefraction(ref.od, 'OD');
  const osError = validateEyeRefraction(ref.os, 'OS');
  if (odError || osError) return odError || osError;
  if (!ref.od.sphere.trim() && !ref.os.sphere.trim()) return 'Enter a sphere for at least one eye before generating a prescription.';
  return '';
}

export function allergyWarning(allergies: string, medicationName: string): string {
  const a = allergies.toLowerCase();
  if (!a || a === 'none' || a === 'nil' || a === 'nkda') return '';
  const med = MED_CATALOGUE.find((item) => medicationName.toLowerCase().includes(item.name.toLowerCase()));
  const hit = med?.allergyHints.find((hint) => a.includes(hint));
  if (hit) return `Recorded allergy may relate to ${medicationName}: “${allergies}”.`;
  if (a.includes('sulfa') && /sulfa/.test(medicationName.toLowerCase())) return `Recorded sulfa allergy. Review ${medicationName}.`;
  return '';
}

export function latestAcuity(rows: VisualAcuity[], patientId: string): VisualAcuity | undefined {
  return rows.filter((row) => row.patientId === patientId && row.status === 'Saved').sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function primaryDiagnosis(rows: EyeDiagnosis[], patientId: string): string {
  const match = rows.find((row) => row.patientId === patientId && row.rank === 'Primary' && row.status !== 'Resolved');
  return match ? `${match.name} (${match.eye})` : '';
}

export function syncPatientDates(state: EyeState, today: string): EyeState {
  const patients = state.patients.map((p) => {
    const future = state.appointments
      .filter((a) => a.patientId === p.id && a.date >= today && a.status !== 'Cancelled' && a.status !== 'No Show' && a.status !== 'Completed')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    const visits = [
      ...state.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').map((a) => a.date),
      ...state.encounters.filter((e) => e.patientId === p.id && e.status === 'Completed').map((e) => e.date),
    ].sort();
    return {
      ...p,
      nextAppointment: future[0] ? `${future[0].date} ${future[0].startTime}` : '',
      lastVisit: visits.at(-1) || p.lastVisit,
    };
  });
  return { ...state, patients };
}

function dobForAge(age: number, today: string): string {
  const [y, m, d] = today.split('-');
  return `${Number(y) - age}-${m}-${d}`;
}

export function buildEyeSeed(today = isoDate()): EyeState {
  const op = CLINICIANS[0].name;
  const opt = CLINICIANS[1].name;
  const patients: EyePatient[] = patientRecords.slice(0, 8).map((record, index) => {
    const [firstName, ...rest] = record.name.split(' ');
    return {
      id: `EYE-P-${String(index + 1).padStart(4, '0')}`,
      hospitalId: record.hospitalId,
      firstName,
      lastName: rest.join(' ') || firstName,
      dateOfBirth: dobForAge(record.age, today),
      sex: record.gender,
      phone: record.phone,
      email: '',
      address: record.address,
      emergencyContact: 'Next of kin',
      emergencyPhone: `0809${String(2000000 + index)}`,
      medicalHistory: record.allergies === 'None' ? 'No significant systemic history recorded.' : `Known allergy: ${record.allergies}.`,
      drugAllergies: record.allergies,
      currentMedications: index === 4 ? 'Lisinopril 10 mg daily' : 'None recorded',
      systemicConditions: index === 0 ? 'Type 2 diabetes' : index === 4 ? 'Hypertension' : 'None recorded',
      previousEyeConditions: index === 0 ? 'Blurred distance vision. No previous laser.' : 'None recorded',
      previousEyeSurgeries: index === 5 ? 'Right cataract surgery, 2024' : 'None',
      currentCorrection: index === 1 ? 'Distance spectacles, about 3 years old' : 'None',
      familyEyeHistory: index === 2 ? 'Father treated for glaucoma' : 'None known',
      presentingComplaint: index === 0 ? 'Gradual blurring, both eyes' : 'Routine eye review',
      preferredAppointmentDate: '',
      status: 'Active',
      lastVisit: index < 3 ? isoDate(-20 + index) : '',
      nextAppointment: '',
      createdAt: record.registeredOn,
    };
  });
  patients.push(
    {
      id: 'EYE-P-0009', hospitalId: '', firstName: 'Seyi', lastName: 'Adebanjo', dateOfBirth: dobForAge(19, today), sex: 'Male',
      phone: '08123400991', email: '', address: '9 Adeniran Ogunsanya, Surulere', emergencyContact: 'Mother', emergencyPhone: '08123400900',
      medicalHistory: 'None', drugAllergies: 'None', currentMedications: 'None', systemicConditions: 'None',
      previousEyeConditions: 'Increasing myopia', previousEyeSurgeries: 'None', currentCorrection: 'Soft contact lenses, monthly',
      familyEyeHistory: 'Mother is myopic', presentingComplaint: 'Contact lens discomfort', preferredAppointmentDate: today,
      status: 'Active', lastVisit: isoDate(-60), nextAppointment: '', createdAt: isoDate(-60),
    },
    {
      id: 'EYE-P-0010', hospitalId: 'GFA HMS/2026/00170', firstName: 'Ruth', lastName: 'Danladi', dateOfBirth: dobForAge(67, today), sex: 'Female',
      phone: '08033322110', email: '', address: '2 Hospital Road, Ikeja', emergencyContact: 'Daughter', emergencyPhone: '08033322111',
      medicalHistory: 'Hypertension', drugAllergies: 'None', currentMedications: 'Amlodipine 5 mg', systemicConditions: 'Hypertension',
      previousEyeConditions: 'Suspected glaucoma', previousEyeSurgeries: 'None', currentCorrection: 'Reading glasses',
      familyEyeHistory: 'None known', presentingComplaint: 'Glaucoma review', preferredAppointmentDate: '',
      status: 'Active', lastVisit: isoDate(-90), nextAppointment: '', createdAt: isoDate(-90),
    },
  );
  const ngozi = patients.find((p) => p.id === 'EYE-P-0006');
  if (ngozi) ngozi.drugAllergies = 'Latex, Chloramphenicol';

  const rooms: EyeRoom[] = [
    { id: 'RM1', name: 'Visual Acuity Station', type: 'Visual acuity', status: 'In Use', clinician: opt },
    { id: 'RM2', name: 'Refraction Room', type: 'Refraction', status: 'Available', clinician: opt },
    { id: 'RM3', name: 'Ophthalmology Consultation Room', type: 'Consultation', status: 'In Use', clinician: op },
    { id: 'RM4', name: 'Slit-Lamp Examination Room', type: 'Slit lamp', status: 'Available', clinician: '' },
    { id: 'RM5', name: 'Diagnostic Testing Room', type: 'Diagnostics', status: 'Cleaning', clinician: '' },
    { id: 'RM6', name: 'Minor Procedure Room', type: 'Procedure', status: 'Available', clinician: '' },
  ];

  const appointments: EyeAppointment[] = [
    { id: 'EAP-0001', patientId: 'EYE-P-0001', date: today, startTime: '08:00', endTime: '08:30', type: 'New eye consultation', clinician: op, roomId: 'RM3', reason: 'Gradual blur, diabetes', notes: '', status: 'Scheduled' },
    { id: 'EAP-0002', patientId: 'EYE-P-0002', date: today, startTime: '08:40', endTime: '09:10', type: 'Visual acuity assessment', clinician: opt, roomId: 'RM1', reason: 'Acuity before refraction', notes: '', status: 'Checked In' },
    { id: 'EAP-0003', patientId: 'EYE-P-0003', date: today, startTime: '09:20', endTime: '09:50', type: 'Routine review', clinician: op, roomId: 'RM3', reason: 'Family history of glaucoma', notes: 'Acuity already recorded.', status: 'Waiting' },
    { id: 'EAP-0004', patientId: 'EYE-P-0004', date: today, startTime: '10:00', endTime: '10:40', type: 'Refraction', clinician: opt, roomId: 'RM2', reason: 'Update spectacles', notes: 'Aspirin allergy.', status: 'In Consultation' },
    { id: 'EAP-0005', patientId: 'EYE-P-0005', date: today, startTime: '10:40', endTime: '11:10', type: 'Routine review', clinician: op, roomId: 'RM4', reason: 'Hypertension eye review', notes: '', status: 'Completed' },
    { id: 'EAP-0006', patientId: 'EYE-P-0010', date: today, startTime: '11:20', endTime: '11:50', type: 'Glaucoma review', clinician: op, roomId: 'RM5', reason: 'IOP and fields', notes: '', status: 'Scheduled' },
    { id: 'EAP-0007', patientId: 'EYE-P-0007', date: today, startTime: '13:00', endTime: '13:20', type: 'Emergency eye assessment', clinician: op, roomId: 'RM3', reason: 'Cancelled by patient', notes: '', status: 'Cancelled' },
    { id: 'EAP-0008', patientId: 'EYE-P-0009', date: today, startTime: '14:00', endTime: '14:30', type: 'Contact lens assessment', clinician: opt, roomId: 'RM2', reason: 'Lens discomfort', notes: '', status: 'Scheduled' },
    { id: 'EAP-0009', patientId: 'EYE-P-0006', date: today, startTime: '15:00', endTime: '15:20', type: 'Post-procedure review', clinician: op, roomId: 'RM4', reason: 'Post-cataract review', notes: '', status: 'Scheduled' },
    { id: 'EAP-0010', patientId: 'EYE-P-0002', date: isoDate(-1), startTime: '09:00', endTime: '09:40', type: 'Refraction', clinician: opt, roomId: 'RM2', reason: 'Final refraction', notes: '', status: 'Completed' },
    { id: 'EAP-0011', patientId: 'EYE-P-0001', date: isoDate(2), startTime: '11:00', endTime: '11:30', type: 'Diagnostic testing', clinician: op, roomId: 'RM5', reason: 'OCT if indicated', notes: '', status: 'Scheduled' },
  ];

  const acuity: VisualAcuity[] = [
    {
      id: 'VAC-0001', patientId: 'EYE-P-0003', encounterId: 'EEN-0002', date: today, time: '09:05', clinician: opt, method: 'Snellen chart at 6 metres',
      correctionUsed: false, notes: 'Demonstration acuity. Not a diagnosis.', status: 'Saved',
      od: { unaided: '6/12', pinhole: '6/9', presenting: '6/12', bestCorrected: '', near: 'N8' },
      os: { unaided: '6/9', pinhole: '6/6', presenting: '6/9', bestCorrected: '', near: 'N6' },
      ou: { unaided: '6/9', pinhole: '', presenting: '6/9', bestCorrected: '', near: 'N6' },
    },
    {
      id: 'VAC-0002', patientId: 'EYE-P-0005', encounterId: '', date: isoDate(-30), time: '10:00', clinician: opt, method: 'Snellen chart at 6 metres',
      correctionUsed: true, notes: 'Previous visit.', status: 'Saved',
      od: { unaided: '6/18', pinhole: '6/9', presenting: '6/12', bestCorrected: '6/9', near: 'N8' },
      os: { unaided: '6/12', pinhole: '6/9', presenting: '6/9', bestCorrected: '6/9', near: 'N6' },
      ou: emptyAcuityEye(),
    },
  ];

  const refractions: Refraction[] = [
    {
      id: 'REF-0001', patientId: 'EYE-P-0002', encounterId: 'EEN-0001', date: isoDate(-1), clinician: opt, type: 'Final refraction',
      notes: 'Accepted subjective result. Demonstration only.', pd: '62', status: 'Saved',
      od: { sphere: '-1.25', cylinder: '-0.50', axis: '180', prism: '', base: '', add: '+1.00', distanceAcuity: '6/6', nearAcuity: 'N5', bestCorrected: '6/6' },
      os: { sphere: '-1.00', cylinder: '-0.25', axis: '175', prism: '', base: '', add: '+1.00', distanceAcuity: '6/6', nearAcuity: 'N5', bestCorrected: '6/6' },
    },
    {
      id: 'REF-0002', patientId: 'EYE-P-0004', encounterId: '', date: today, clinician: opt, type: 'Objective refraction',
      notes: 'Autorefractor reading only. Not a final prescription.', pd: '60', status: 'Draft',
      od: { sphere: '+0.75', cylinder: '-0.50', axis: '90', prism: '', base: '', add: '', distanceAcuity: '', nearAcuity: '', bestCorrected: '' },
      os: { sphere: '+1.00', cylinder: '', axis: '', prism: '', base: '', add: '', distanceAcuity: '', nearAcuity: '', bestCorrected: '' },
    },
  ];

  const exams: EyeExam[] = [{
    id: 'EXM-0001', patientId: 'EYE-P-0005', encounterId: 'EEN-0003', date: today, clinician: op,
    complaint: 'Routine review', affectedEye: 'OU', onset: '', duration: '', severity: '', symptoms: [], urgentReview: false,
    previousTreatment: '', historyNotes: 'Hypertension.', diabetes: false, hypertension: true, trauma: 'None', surgery: 'None',
    glaucomaHistory: 'None', cataractHistory: 'Early lens changes', retinalHistory: 'None', medications: 'Lisinopril', allergies: 'None', familyHistory: 'None',
    external: Object.fromEntries(EXTERNAL_FIELDS.map((field) => [field, { choice: 'Normal' as FindingChoice, notes: '' }])),
    anteriorOd: Object.fromEntries(ANTERIOR_FIELDS.map((field) => [field, { choice: (field === 'Lens' ? 'Abnormal' : 'Normal') as FindingChoice, notes: field === 'Lens' ? 'Early cortical spokes' : '' }])),
    anteriorOs: Object.fromEntries(ANTERIOR_FIELDS.map((field) => [field, { choice: 'Normal' as FindingChoice, notes: '' }])),
    iopOd: '16', iopOs: '15', iopMethod: 'Goldmann applanation', iopTime: '10:50', iopNotes: 'Single reading. Not a glaucoma diagnosis.',
    pupilSizeOd: '3', pupilSizeOs: '3', pupilReaction: 'Brisk, both eyes', rapd: 'None', pupilNotes: '',
    fundusOd: Object.fromEntries(FUNDUS_FIELDS.map((field) => [field, { choice: 'Normal' as FindingChoice, notes: field === 'Cup-to-disc ratio' ? '0.3' : '' }])),
    fundusOs: Object.fromEntries(FUNDUS_FIELDS.map((field) => [field, { choice: 'Normal' as FindingChoice, notes: field === 'Cup-to-disc ratio' ? '0.3' : '' }])),
    fundusNotPerformed: false, visualFields: 'Not assessed today', colourVision: 'Not assessed', binocular: 'Not assessed', otherFindings: '', status: 'Saved',
  }];

  const encounters: EyeEncounter[] = [
    { id: 'EEN-0001', patientId: 'EYE-P-0002', date: isoDate(-1), time: '09:20', clinician: opt, designation: 'Optometrist', chiefComplaint: 'Wants new spectacles', hpc: 'Distance blur with current glasses.', medicalHistory: 'None', ophthalmicHistory: 'Myopia', assessment: 'Final refraction accepted.', diagnosisSummary: 'Myopia with astigmatism', differential: '', treatmentPlan: 'Update spectacles', notes: 'Demonstration encounter.', followUp: '1 year or sooner if blur returns', status: 'Completed' },
    { id: 'EEN-0002', patientId: 'EYE-P-0003', date: today, time: '09:25', clinician: op, designation: 'Ophthalmologist', chiefComplaint: 'Family history of glaucoma', hpc: 'No pain or haloes.', medicalHistory: 'Sulfa allergy', ophthalmicHistory: 'No previous surgery', assessment: '', diagnosisSummary: '', differential: '', treatmentPlan: '', notes: '', followUp: '', status: 'Draft' },
    { id: 'EEN-0003', patientId: 'EYE-P-0005', date: today, time: '10:45', clinician: op, designation: 'Ophthalmologist', chiefComplaint: 'Routine review', hpc: 'No new symptoms.', medicalHistory: 'Hypertension', ophthalmicHistory: 'Early lens changes', assessment: 'Stable. IOP within the recorded reading.', diagnosisSummary: 'Early cataract, right eye', differential: '', treatmentPlan: 'Observe. Review in 12 months.', notes: 'Demonstration encounter.', followUp: '12 months', status: 'Completed' },
  ];

  const diagnoses: EyeDiagnosis[] = [
    { id: 'DGX-0001', patientId: 'EYE-P-0002', encounterId: 'EEN-0001', name: 'Myopia', eye: 'OU', rank: 'Primary', status: 'Confirmed', date: isoDate(-1), notes: '' },
    { id: 'DGX-0002', patientId: 'EYE-P-0002', encounterId: 'EEN-0001', name: 'Astigmatism', eye: 'OU', rank: 'Secondary', status: 'Confirmed', date: isoDate(-1), notes: '' },
    { id: 'DGX-0003', patientId: 'EYE-P-0005', encounterId: 'EEN-0003', name: 'Cataract', eye: 'OD', rank: 'Primary', status: 'Confirmed', date: today, notes: 'Early. Observation.' },
    { id: 'DGX-0004', patientId: 'EYE-P-0010', encounterId: '', name: 'Glaucoma or suspected glaucoma', eye: 'OU', rank: 'Primary', status: 'Suspected', date: isoDate(-90), notes: 'Awaiting fields. Not confirmed from one pressure reading.' },
  ];

  const investigations: EyeInvestigation[] = [
    { id: 'EIN-0001', patientId: 'EYE-P-0001', encounterId: '', test: 'Optical coherence tomography (OCT)', indication: 'Diabetic macular screen', eye: 'OU', requestedDate: today, clinician: op, priority: 'Soon', status: 'Requested', result: '', reportDate: '', reviewer: '' },
    { id: 'EIN-0002', patientId: 'EYE-P-0010', encounterId: '', test: 'Visual field testing', indication: 'Suspected glaucoma', eye: 'OU', requestedDate: isoDate(-7), clinician: op, priority: 'Soon', status: 'Completed', result: 'Demonstration report: reliable fields, no repeatable defect described in this sample. Not an image interpretation.', reportDate: isoDate(-2), reviewer: op },
  ];

  const prescriptions: EyePrescription[] = [
    { id: 'ERX-0001', patientId: 'EYE-P-0005', encounterId: 'EEN-0003', date: today, clinician: op, status: 'Issued', allergyAcknowledged: true, items: [
      { id: 'EMI-0001', name: 'Hypromellose eye drops', strength: '0.3%', dosage: '1 drop', route: 'Topical ocular', frequency: '4 times daily', duration: 'As needed', quantity: '1 bottle', eye: 'OU', instructions: 'Illustrative only. Blink and close the eye for a minute.' },
    ] },
  ];

  const spectacles: SpectacleRx[] = [{
    id: 'SPX-0001', patientId: 'EYE-P-0002', refractionId: 'REF-0001', date: isoDate(-1), clinician: opt, reviewDate: isoDate(365),
    distanceOrNear: 'Both', pd: '62', lensType: 'Progressive', material: 'Plastic', coating: 'Anti-reflective',
    notes: 'Generated from saved final refraction REF-0001.', instructions: 'Demonstration prescription. Not legally authorised.',
    od: { ...refractions[0].od }, os: { ...refractions[0].os }, status: 'Final',
  }];

  const contactLenses: ContactLensRecord[] = [{
    id: 'CTL-0001', patientId: 'EYE-P-0009', date: isoDate(-60), clinician: opt, lensType: 'Soft monthly', material: 'Silicone hydrogel', replacement: 'Monthly',
    od: { baseCurve: '8.6', diameter: '14.2', sphere: '-2.00', cylinder: '', axis: '' },
    os: { baseCurve: '8.6', diameter: '14.2', sphere: '-1.75', cylinder: '', axis: '' },
    fittingNotes: 'Centration acceptable at last fit.', comfort: 'Now reports dryness by evening.', followUpDate: today, status: 'Saved',
  }];

  const plans: TreatmentPlan[] = [{
    id: 'EPL-0001', patientId: 'EYE-P-0002', title: 'Spectacle update — Amina Yusuf', createdAt: isoDate(-1), clinician: opt, status: 'Open',
    items: [
      { id: 'ETI-0001', diagnosis: 'Myopia', treatment: 'Spectacle correction', eye: 'OU', description: 'Progressive lenses from final refraction.', priority: 'Routine', plannedDate: today, clinician: opt, durationMin: 20, estimatedCost: 45000, status: 'Approved', notes: '', procedureId: '' },
      { id: 'ETI-0002', diagnosis: 'Dryness with lenses not applicable', treatment: 'Follow-up examination', eye: 'OU', description: 'Review adaptation in 6 weeks if new lenses are collected.', priority: 'Routine', plannedDate: isoDate(42), clinician: opt, durationMin: 15, estimatedCost: 8000, status: 'Proposed', notes: '', procedureId: '' },
    ],
  }];

  const procedures: EyeProcedure[] = [{
    id: 'EPR-0001', patientId: 'EYE-P-0006', encounterId: '', planId: '', planItemId: '', name: 'Post-cataract review examination', eye: 'OD',
    indication: 'Review after cataract surgery', date: isoDate(-14), clinician: op, materials: 'Slit lamp', notes: 'Wound quiet in the demonstration note.',
    outcome: 'Review completed', complications: 'None recorded', postInstructions: 'Continue prescribed drops as previously advised.', followUpDate: today, status: 'Completed', charge: 15000,
  }];

  const referrals: EyeReferral[] = [{
    id: 'ERF-0001', patientId: 'EYE-P-0010', encounterId: '', clinician: op, destination: 'Glaucoma specialist',
    reason: 'Suspected glaucoma for subspecialty opinion', symptoms: 'No pain', findings: 'Previous fields report on file', diagnosis: 'Suspected glaucoma',
    priority: 'Soon', date: isoDate(-7), notes: 'Demonstration referral. Not transmitted outside this browser.', status: 'Sent',
  }];

  const followUps: EyeFollowUp[] = [
    { id: 'EFU-0001', patientId: 'EYE-P-0001', encounterId: '', reason: 'Diabetic eye review', dueDate: isoDate(-2), clinician: op, status: 'Upcoming', notes: 'Overdue for illustration.', appointmentId: '' },
    { id: 'EFU-0002', patientId: 'EYE-P-0005', encounterId: 'EEN-0003', reason: 'Cataract observation', dueDate: isoDate(365), clinician: op, status: 'Upcoming', notes: '', appointmentId: '' },
    { id: 'EFU-0003', patientId: 'EYE-P-0006', encounterId: '', reason: 'Post-cataract review', dueDate: today, clinician: op, status: 'Upcoming', notes: 'Booked this afternoon.', appointmentId: 'EAP-0009' },
  ];

  const education: EducationNote[] = [{
    id: 'EDU-0001', patientId: 'EYE-P-0005', encounterId: 'EEN-0003', date: today,
    topics: ['Eye drop administration instructions', 'General eye health information'],
    notes: 'Leaflet discussed. Illustrative content, not personalised advice.',
  }];

  const equipment: EyeEquipment[] = [
    { id: 'EQP-0001', name: 'Slit lamp', assetId: 'SL-01', type: 'Slit lamp', location: 'Slit-Lamp Examination Room', status: 'Available', lastMaintenance: isoDate(-200), nextMaintenance: isoDate(160), notes: '' },
    { id: 'EQP-0002', name: 'Goldmann tonometer', assetId: 'TN-02', type: 'Tonometer', location: 'Slit-Lamp Examination Room', status: 'Available', lastMaintenance: isoDate(-40), nextMaintenance: isoDate(140), notes: '' },
    { id: 'EQP-0003', name: 'Autorefractor', assetId: 'AR-01', type: 'Autorefractor', location: 'Refraction Room', status: 'Maintenance due', lastMaintenance: isoDate(-400), nextMaintenance: isoDate(-5), notes: 'Service due. Do not treat readings as calibrated.' },
    { id: 'EQP-0004', name: 'Phoropter', assetId: 'PH-01', type: 'Phoropter', location: 'Refraction Room', status: 'Available', lastMaintenance: isoDate(-100), nextMaintenance: isoDate(200), notes: '' },
    { id: 'EQP-0005', name: 'Trial lens set', assetId: 'TL-01', type: 'Trial lens set', location: 'Refraction Room', status: 'Available', lastMaintenance: '', nextMaintenance: '', notes: '' },
    { id: 'EQP-0006', name: 'Snellen chart', assetId: 'VA-01', type: 'Visual acuity chart', location: 'Visual Acuity Station', status: 'Available', lastMaintenance: '', nextMaintenance: '', notes: '6 metre lane' },
    { id: 'EQP-0007', name: 'Direct ophthalmoscope', assetId: 'DO-01', type: 'Ophthalmoscope', location: 'Consultation Room', status: 'Available', lastMaintenance: isoDate(-80), nextMaintenance: isoDate(280), notes: '' },
    { id: 'EQP-0008', name: 'Indirect ophthalmoscope', assetId: 'IO-01', type: 'Ophthalmoscope', location: 'Consultation Room', status: 'Unavailable', lastMaintenance: isoDate(-20), nextMaintenance: isoDate(20), notes: 'Bulb replaced. Awaiting check.' },
    { id: 'EQP-0009', name: 'OCT device', assetId: 'OCT-01', type: 'OCT', location: 'Diagnostic Testing Room', status: 'Available', lastMaintenance: isoDate(-60), nextMaintenance: isoDate(120), notes: 'No image link in this demo.' },
    { id: 'EQP-0010', name: 'Visual field analyser', assetId: 'VF-01', type: 'Visual field analyser', location: 'Diagnostic Testing Room', status: 'Available', lastMaintenance: isoDate(-30), nextMaintenance: isoDate(150), notes: '' },
  ];

  const inventory: EyeStock[] = [
    { id: 'EST-0001', name: 'Examination gloves', category: 'PPE', code: 'GLV-E', quantity: 20, unit: 'boxes', reorderLevel: 8, expiry: isoDate(400), location: 'Store' },
    { id: 'EST-0002', name: 'Sterile gauze', category: 'Dressing', code: 'GAU-E', quantity: 30, unit: 'packs', reorderLevel: 10, expiry: isoDate(500), location: 'Store' },
    { id: 'EST-0003', name: 'Fluorescein strips', category: 'Diagnostic', code: 'FLR-S', quantity: 4, unit: 'boxes', reorderLevel: 5, expiry: isoDate(80), location: 'Slit-lamp drawer' },
    { id: 'EST-0004', name: 'Tonometry disposable prisms', category: 'Tonometry', code: 'TON-P', quantity: 2, unit: 'boxes', reorderLevel: 3, expiry: isoDate(40), location: 'Slit-lamp drawer' },
    { id: 'EST-0005', name: 'Ophthalmic lubricants', category: 'Medication sample', code: 'LUB-1', quantity: 12, unit: 'bottles', reorderLevel: 6, expiry: isoDate(200), location: 'Clinic cupboard' },
    { id: 'EST-0006', name: 'Eye pads', category: 'Dressing', code: 'PAD-E', quantity: 0, unit: 'packs', reorderLevel: 4, expiry: isoDate(300), location: 'Procedure room' },
    { id: 'EST-0007', name: 'Eye dressings', category: 'Dressing', code: 'DRS-E', quantity: 8, unit: 'packs', reorderLevel: 4, expiry: isoDate(20), location: 'Procedure room' },
    { id: 'EST-0008', name: 'Alcohol swabs', category: 'Examination', code: 'ALC-S', quantity: 15, unit: 'boxes', reorderLevel: 5, expiry: isoDate(250), location: 'Each room' },
  ];

  const documents: EyeDocument[] = [
    { id: 'EDC-0001', patientId: 'EYE-P-0002', name: 'Spectacle advice note', kind: 'Note', date: isoDate(-1), note: 'Demonstration document.' },
  ];

  return syncPatientDates({
    patients, appointments, rooms, acuity, refractions, exams, encounters, diagnoses, investigations,
    prescriptions, spectacles, contactLenses, plans, procedures, referrals, followUps, education, equipment, inventory, documents,
  }, today);
}
