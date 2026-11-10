export type Sex = 'Female' | 'Male';
export type PatientStatus = 'Active' | 'Inactive';
export type AgeGroup = 'Newborn' | 'Infant' | 'Child' | 'Adolescent';
export type AppointmentStatus = 'Scheduled' | 'Checked In' | 'Waiting' | 'In Consultation' | 'Completed' | 'Cancelled' | 'No Show';
export type VisitType = 'New consultation' | 'Follow-up' | 'Immunisation' | 'Growth monitoring' | 'Newborn review' | 'Emergency' | 'Admission review';
export type TriageCategory = 'Immediate' | 'Very urgent' | 'Urgent' | 'Standard' | 'Non-urgent';
export type RecordStatus = 'Draft' | 'Saved' | 'Completed';
export type FindingChoice = '' | 'Not assessed' | 'Normal' | 'Abnormal';
export type MilestoneMark = 'Achieved' | 'Not yet achieved' | 'Not assessed' | 'Concern identified';
export type DxStatus = 'Suspected' | 'Confirmed' | 'Resolved';
export type DxRank = 'Primary' | 'Secondary';
export type RxStatus = 'Draft' | 'Finalised' | 'Cancelled';
export type InvStatus = 'Requested' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type Priority = 'Routine' | 'Soon' | 'Urgent';
export type AdmissionStatus = 'Planned' | 'Admitted' | 'Under Care' | 'Ready for Discharge' | 'Discharged' | 'Transferred';
export type BedStatus = 'Available' | 'Occupied' | 'Cleaning';
export type PlanItemStatus = 'Proposed' | 'Awaiting Approval' | 'Approved' | 'Scheduled' | 'In Progress' | 'Completed' | 'Deferred' | 'Cancelled';
export type ProcedureStatus = 'Recorded' | 'Completed' | 'Cancelled';
export type ReferralStatus = 'Draft' | 'Sent' | 'Accepted' | 'Completed' | 'Cancelled';
export type FollowUpStatus = 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
export type VaccineStatus = 'Scheduled' | 'Administered' | 'Deferred' | 'Missed';
export type EmergencyDisposition = 'Awaiting Assessment' | 'Under Assessment' | 'Observation' | 'Admission Recommended' | 'Referred' | 'Discharged' | 'Transferred';
export type EquipmentStatus = 'Available' | 'In use' | 'Maintenance due' | 'Unavailable';

export interface Guardian {
  name: string;
  relationship: string;
  phone: string;
  altPhone: string;
  address: string;
  emergencyContact: string;
}

export interface BirthHistory {
  placeOfBirth: string;
  birthDateTime: string;
  gestationalAgeWeeks: string;
  birthWeightKg: string;
  birthLengthCm: string;
  complications: string;
  neonatalHistory: string;
}

export interface PaedsPatient {
  id: string;
  hospitalId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  address: string;
  guardian: Guardian;
  birth: BirthHistory;
  previousIllnesses: string;
  allergies: string;
  currentMedications: string;
  chronicConditions: string;
  hospitalisations: string;
  surgeries: string;
  familyHistory: string;
  feedingHistory: string;
  immunisationNote: string;
  status: PatientStatus;
  lastVisit: string;
  nextAppointment: string;
  createdAt: string;
}

export interface PaedsAppointment {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: VisitType;
  clinician: string;
  reason: string;
  status: AppointmentStatus;
}

export interface VitalSet {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  time: string;
  staff: string;
  complaint: string;
  duration: string;
  history: string;
  allergies: string;
  medications: string;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  systolic: string;
  diastolic: string;
  spo2: string;
  weightKg: string;
  lengthCm: string;
  headCm: string;
  painScore: string;
  consciousness: string;
  triage: TriageCategory | '';
  notes: string;
  status: RecordStatus;
}

export interface GrowthRecord {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  time: string;
  ageLabel: string;
  weightKg: string;
  lengthCm: string;
  heightCm: string;
  headCm: string;
  muacCm: string;
  method: string;
  staff: string;
  interpretation: string;
  notes: string;
}

export interface DevelopmentAssessment {
  id: string;
  patientId: string;
  date: string;
  ageLabel: string;
  clinician: string;
  type: string;
  marks: Record<string, MilestoneMark>;
  concerns: string;
  summary: string;
  reviewDate: string;
  referralNote: string;
  status: RecordStatus;
}

export interface NewbornExam {
  id: string;
  patientId: string;
  date: string;
  clinician: string;
  birthDateTime: string;
  gestationalAgeWeeks: string;
  birthWeightKg: string;
  birthLengthCm: string;
  headCm: string;
  deliveryMethod: string;
  maternalHistory: string;
  complications: string;
  resuscitation: string;
  feedingMethod: string;
  findings: Record<string, { choice: FindingChoice; notes: string }>;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  spo2: string;
  weightKg: string;
  feedingNotes: string;
  problems: string;
  investigations: string;
  feedingPlan: string;
  monitoringPlan: string;
  followUp: string;
  escalation: string;
  status: RecordStatus;
}

export interface Immunisation {
  id: string;
  patientId: string;
  vaccine: string;
  dose: string;
  dateGiven: string;
  ageLabel: string;
  batch: string;
  expiry: string;
  route: string;
  site: string;
  staff: string;
  facility: string;
  notes: string;
  nextDue: string;
  deferReason: string;
  status: VaccineStatus;
  appointmentId: string;
}

export interface PaedsEncounter {
  id: string;
  patientId: string;
  date: string;
  time: string;
  clinician: string;
  complaint: string;
  hpc: string;
  medicalHistory: string;
  birthHistory: string;
  feedingHistory: string;
  developmentHistory: string;
  immunisationHistory: string;
  allergies: string;
  medications: string;
  examination: Record<string, { choice: FindingChoice; notes: string }>;
  assessment: string;
  diagnosis: string;
  differential: string;
  plan: string;
  notes: string;
  followUp: string;
  status: RecordStatus;
}

export interface PaedsDiagnosis {
  id: string;
  patientId: string;
  encounterId: string;
  name: string;
  description: string;
  rank: DxRank;
  system: string;
  date: string;
  status: DxStatus;
  clinician: string;
  notes: string;
}

export interface RxItem {
  id: string;
  name: string;
  formulation: string;
  strength: string;
  dose: string;
  doseUnit: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
  weightBased: boolean;
  weightKg: string;
  dosePerKg: string;
  dosePerKgUnit: string;
  calculated: string;
  reviewed: boolean;
}

export interface PaedsPrescription {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  clinician: string;
  status: RxStatus;
  allergyAcknowledged: boolean;
  items: RxItem[];
}

export interface PaedsInvestigation {
  id: string;
  patientId: string;
  encounterId: string;
  category: string;
  test: string;
  indication: string;
  requestedDate: string;
  clinician: string;
  priority: Priority;
  status: InvStatus;
  result: string;
  resultDate: string;
  reviewer: string;
  reviewed: boolean;
}

export interface PaedsBed {
  id: string;
  ward: string;
  number: string;
  status: BedStatus;
  patientId: string;
}

export interface PaedsAdmission {
  id: string;
  patientId: string;
  number: string;
  date: string;
  time: string;
  reason: string;
  referring: string;
  admitting: string;
  ward: string;
  bedId: string;
  diagnosis: string;
  status: AdmissionStatus;
  dischargeDate: string;
  dischargeDiagnosis: string;
  summary: string;
  medicationPlan: string;
  guardianInstructions: string;
  followUpPlan: string;
  dischargingClinician: string;
}

export interface NursingObs {
  id: string;
  patientId: string;
  admissionId: string;
  date: string;
  time: string;
  temperatureC: string;
  heartRate: string;
  respiratoryRate: string;
  systolic: string;
  diastolic: string;
  spo2: string;
  weightKg: string;
  pain: string;
  feeding: string;
  notes: string;
  staff: string;
}

export interface TreatmentItem {
  id: string;
  diagnosis: string;
  treatment: string;
  description: string;
  priority: Priority;
  plannedDate: string;
  clinician: string;
  status: PlanItemStatus;
  notes: string;
  procedureId: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  encounterId: string;
  title: string;
  createdAt: string;
  clinician: string;
  status: 'Open' | 'Completed' | 'Cancelled';
  items: TreatmentItem[];
}

export interface PaedsProcedure {
  id: string;
  patientId: string;
  encounterId: string;
  planId: string;
  planItemId: string;
  name: string;
  indication: string;
  date: string;
  clinician: string;
  notes: string;
  outcome: string;
  complications: string;
  instructions: string;
  followUp: string;
  status: ProcedureStatus;
}

export interface PaedsReferral {
  id: string;
  patientId: string;
  encounterId: string;
  clinician: string;
  destination: string;
  reason: string;
  findings: string;
  priority: Priority;
  date: string;
  notes: string;
  status: ReferralStatus;
}

export interface PaedsFollowUp {
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

export interface NutritionNote {
  id: string;
  patientId: string;
  date: string;
  feeding: string;
  notes: string;
  clinician: string;
}

export interface EmergencyCase {
  id: string;
  patientId: string;
  date: string;
  time: string;
  complaint: string;
  onset: string;
  history: string;
  allergies: string;
  observations: string;
  triage: TriageCategory | '';
  assessment: string;
  actions: string;
  investigations: string;
  escalation: string;
  disposition: EmergencyDisposition;
}

export interface PaedsService {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMin: number;
  price: number;
  active: boolean;
}

export interface PaedsEquipment {
  id: string;
  name: string;
  category: string;
  code: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  expiry: string;
  location: string;
  status: EquipmentStatus;
  nextMaintenance: string;
}

export interface PaedsDocument {
  id: string;
  patientId: string;
  name: string;
  date: string;
  note: string;
}

export interface PaedsState {
  patients: PaedsPatient[];
  appointments: PaedsAppointment[];
  vitals: VitalSet[];
  growth: GrowthRecord[];
  development: DevelopmentAssessment[];
  newborn: NewbornExam[];
  immunisations: Immunisation[];
  encounters: PaedsEncounter[];
  diagnoses: PaedsDiagnosis[];
  prescriptions: PaedsPrescription[];
  investigations: PaedsInvestigation[];
  beds: PaedsBed[];
  admissions: PaedsAdmission[];
  observations: NursingObs[];
  plans: TreatmentPlan[];
  procedures: PaedsProcedure[];
  referrals: PaedsReferral[];
  followUps: PaedsFollowUp[];
  nutrition: NutritionNote[];
  emergencies: EmergencyCase[];
  services: PaedsService[];
  equipment: PaedsEquipment[];
  documents: PaedsDocument[];
}

export const STORAGE_KEY = 'gfa_paeds_v1';

export const STAFF = [
  { name: 'Dr. Funmilayo Adeyemi', designation: 'Paediatrician' },
  { name: 'Nurse Halima Bello', designation: 'Paediatric Nurse' },
  { name: 'Ms. Kemi Oladipo', designation: 'Department Administrator' },
] as const;

export const VISIT_TYPES: VisitType[] = ['New consultation', 'Follow-up', 'Immunisation', 'Growth monitoring', 'Newborn review', 'Emergency', 'Admission review'];
export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['Scheduled', 'Checked In', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
export const TRIAGE: TriageCategory[] = ['Immediate', 'Very urgent', 'Urgent', 'Standard', 'Non-urgent'];
export const DIAGNOSIS_CATALOGUE = [
  'Upper respiratory tract infection', 'Gastroenteritis', 'Pneumonia', 'Malaria', 'Anaemia', 'Asthma',
  'Febrile illness', 'Otitis media', 'Skin infection', 'Dehydration', 'Nutritional concern', 'Neonatal condition', 'Other condition',
];
export const VACCINE_NAMES = ['BCG', 'Oral polio vaccine', 'Pentavalent', 'Pneumococcal conjugate', 'Rotavirus', 'Measles', 'Yellow fever', 'Hepatitis B', 'Other vaccine'];
export const MILESTONE_AREAS = ['Gross motor', 'Fine motor', 'Speech and language', 'Cognitive', 'Social interaction', 'Emotional and behavioural', 'Hearing and vision', 'Parent or guardian concerns'];
export const EXAM_SYSTEMS = ['General appearance', 'Respiratory', 'Cardiovascular', 'Gastrointestinal', 'Neurological', 'Musculoskeletal', 'Skin', 'Ear, nose and throat', 'Genitourinary', 'Other'];
export const NEWBORN_SECTIONS = ['General appearance', 'Activity and tone', 'Skin', 'Head and fontanelles', 'Eyes', 'Ears', 'Mouth and palate', 'Chest and breathing', 'Cardiovascular', 'Abdomen', 'Umbilical cord', 'Genitalia', 'Musculoskeletal', 'Neurological', 'Reflexes'];
export const INVESTIGATION_TESTS = [
  { category: 'Haematology', name: 'Full blood count' },
  { category: 'Clinical chemistry', name: 'Electrolytes' },
  { category: 'Microbiology', name: 'Blood culture' },
  { category: 'Parasitology', name: 'Malaria test' },
  { category: 'Urinalysis', name: 'Urinalysis' },
  { category: 'Imaging', name: 'Chest radiograph' },
  { category: 'Other investigations', name: 'Other test' },
];
export const PLAN_STATUSES: PlanItemStatus[] = ['Proposed', 'Awaiting Approval', 'Approved', 'Scheduled', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
export const REFERRAL_DESTINATIONS = ['Nutrition', 'Eye Clinic', 'Ear, nose and throat', 'Surgery', 'Emergency', 'Child and adolescent psychiatry', 'Other department'];
export const MED_CATALOGUE = [
  { name: 'Paracetamol suspension', hints: ['paracetamol'] },
  { name: 'Amoxicillin suspension', hints: ['amoxicillin', 'penicillin'] },
  { name: 'Oral rehydration salts', hints: [] },
  { name: 'Salbutamol inhaler', hints: [] },
  { name: 'Zinc tablet', hints: [] },
];

export function isoDate(offsetDays = 0, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dobForAgeDays(days: number, today = isoDate()): string {
  return isoDate(-days, new Date(`${today}T12:00:00`));
}

export function ageParts(dob: string, today = isoDate()): { days: number; months: number; years: number } {
  const start = new Date(`${dob}T12:00:00`);
  const end = new Date(`${today}T12:00:00`);
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  const totalMonths = Math.max(0, years * 12 + months);
  return { days, months: totalMonths, years: Math.max(0, years) };
}

export function formatAge(dob: string, today = isoDate()): string {
  const { days, months, years } = ageParts(dob, today);
  if (days < 56) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    return rem ? `${weeks} weeks ${rem} days` : `${weeks} weeks`;
  }
  if (months < 24) return `${months} months`;
  const extra = months - years * 12;
  return extra > 0 ? `${years} years ${extra} months` : `${years} years`;
}

export function ageGroup(dob: string, today = isoDate()): AgeGroup {
  const { days, months, years } = ageParts(dob, today);
  if (days < 28) return 'Newborn';
  if (months < 12) return 'Infant';
  if (years < 10) return 'Child';
  return 'Adolescent';
}

export function patientName(p: Pick<PaedsPatient, 'firstName' | 'middleName' | 'lastName'>): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

export function nextSerial(prefix: string, existing: string[]): string {
  const n = existing.reduce((max, id) => {
    const m = id.match(/(\d+)$/);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return `${prefix}${String(n + 1).padStart(4, '0')}`;
}

export function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function bmi(weightKg: string, statureCm: string): string {
  const w = Number(weightKg);
  const h = Number(statureCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '';
  const metres = h / 100;
  return (w / (metres * metres)).toFixed(1);
}

export function weightDose(weightKg: string, perKg: string): { ok: true; value: string } | { ok: false; message: string } {
  const w = Number(weightKg);
  const d = Number(perKg);
  if (!weightKg.trim() || !Number.isFinite(w) || w <= 0 || w > 200) return { ok: false, message: 'Enter a weight in kilograms between 0 and 200.' };
  if (!perKg.trim() || !Number.isFinite(d) || d <= 0 || d > 1000) return { ok: false, message: 'Enter a dose per kilogram greater than 0.' };
  return { ok: true, value: String(Math.round(w * d * 100) / 100) };
}

export function bedTaken(beds: PaedsBed[], bedId: string, patientId: string): boolean {
  const bed = beds.find((b) => b.id === bedId);
  return Boolean(bed && bed.status === 'Occupied' && bed.patientId && bed.patientId !== patientId);
}

export function allergyWarning(allergies: string, medicationName: string): string {
  const a = allergies.toLowerCase();
  if (!a || a === 'none' || a === 'nil' || a === 'nkda' || a === 'not recorded') return '';
  const med = MED_CATALOGUE.find((item) => medicationName.toLowerCase().includes(item.name.toLowerCase().split(' ')[0]));
  const hit = med?.hints.find((hint) => a.includes(hint));
  if (hit) return `Recorded allergy may relate to ${medicationName}: “${allergies}”.`;
  return '';
}

export function blankFindings(fields: string[]): Record<string, { choice: FindingChoice; notes: string }> {
  return Object.fromEntries(fields.map((field) => [field, { choice: '' as FindingChoice, notes: '' }]));
}

export function blankMarks(): Record<string, MilestoneMark> {
  return Object.fromEntries(MILESTONE_AREAS.map((area) => [area, 'Not assessed' as MilestoneMark]));
}

export function latestWeight(rows: Array<{ patientId: string; date: string; weightKg: string }>, patientId: string) {
  return rows.filter((row) => row.patientId === patientId && row.weightKg.trim()).sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function followUpDisplay(item: PaedsFollowUp, today: string): FollowUpStatus {
  if (item.status === 'Completed' || item.status === 'Cancelled') return item.status;
  return item.dueDate < today ? 'Overdue' : 'Upcoming';
}

export function stockStatus(item: PaedsEquipment, today: string): 'In stock' | 'Low stock' | 'Out of stock' | 'Expired' | 'Maintenance due' {
  if (item.status === 'Maintenance due' || (item.nextMaintenance && item.nextMaintenance <= today)) return 'Maintenance due';
  if (item.expiry && item.expiry < today) return 'Expired';
  if (item.quantity <= 0) return 'Out of stock';
  if (item.quantity <= item.reorderLevel) return 'Low stock';
  return 'In stock';
}

function child(partial: PaedsPatient): PaedsPatient {
  return partial;
}

export function buildPaedsSeed(today = isoDate()): PaedsState {
  const dr = STAFF[0].name;
  const nurse = STAFF[1].name;
  const emptyBirth = (): BirthHistory => ({ placeOfBirth: '', birthDateTime: '', gestationalAgeWeeks: '', birthWeightKg: '', birthLengthCm: '', complications: '', neonatalHistory: '' });
  const patients: PaedsPatient[] = [
    child({
      id: 'PAE-P-0001', hospitalId: '', firstName: 'Ada', middleName: '', lastName: 'Okonkwo', dateOfBirth: dobForAgeDays(10, today), sex: 'Female',
      address: '12 Hospital Road, Abeokuta', guardian: { name: 'Ngozi Okonkwo', relationship: 'Mother', phone: '08031110001', altPhone: '08031110002', address: '', emergencyContact: 'Father 08031110009' },
      birth: { placeOfBirth: 'GFA Demo Hospital', birthDateTime: `${dobForAgeDays(10, today)} 06:40`, gestationalAgeWeeks: '39', birthWeightKg: '3.1', birthLengthCm: '49', complications: 'None recorded', neonatalHistory: 'Cried at birth.' },
      previousIllnesses: 'None', allergies: 'None', currentMedications: 'None', chronicConditions: 'None', hospitalisations: 'Birth admission, discharged', surgeries: 'None', familyHistory: 'None known', feedingHistory: 'Breastfeeding', immunisationNote: 'Birth doses recorded separately.',
      status: 'Active', lastVisit: today, nextAppointment: '', createdAt: dobForAgeDays(10, today),
    }),
    child({
      id: 'PAE-P-0002', hospitalId: '', firstName: 'Tobi', middleName: 'James', lastName: 'Adeyemi', dateOfBirth: dobForAgeDays(180, today), sex: 'Male',
      address: '4 Lafenwa, Abeokuta', guardian: { name: 'Bisi Adeyemi', relationship: 'Mother', phone: '08032220002', altPhone: '', address: '', emergencyContact: 'Grandmother 08032220008' },
      birth: { ...emptyBirth(), placeOfBirth: 'Home, then hospital', gestationalAgeWeeks: '38', birthWeightKg: '2.9' },
      previousIllnesses: 'One febrile illness', allergies: 'Penicillin', currentMedications: 'None', chronicConditions: 'None', hospitalisations: 'None', surgeries: 'None', familyHistory: 'Father has asthma', feedingHistory: 'Complementary feeds started', immunisationNote: 'Some doses recorded. Next date is entered by staff.',
      status: 'Active', lastVisit: isoDate(-14), nextAppointment: '', createdAt: isoDate(-60),
    }),
    child({
      id: 'PAE-P-0003', hospitalId: 'GFA HMS/2026/00901', firstName: 'Zainab', middleName: '', lastName: 'Bello', dateOfBirth: dobForAgeDays(1400, today), sex: 'Female',
      address: '8 Ibara, Abeokuta', guardian: { name: 'Halima Bello', relationship: 'Mother', phone: '08033330003', altPhone: '08033330004', address: '', emergencyContact: 'Father 08033330007' },
      birth: emptyBirth(),
      previousIllnesses: 'Previous wheeze', allergies: 'None', currentMedications: 'Salbutamol inhaler when wheezy', chronicConditions: 'Wheeze under review', hospitalisations: 'One overnight stay, 2025', surgeries: 'None', familyHistory: 'None known', feedingHistory: 'Family diet', immunisationNote: 'History incomplete. Staff to record doses.',
      status: 'Active', lastVisit: isoDate(-2), nextAppointment: '', createdAt: isoDate(-200),
    }),
    child({
      id: 'PAE-P-0004', hospitalId: '', firstName: 'Chinedu', middleName: '', lastName: 'Eze', dateOfBirth: dobForAgeDays(4800, today), sex: 'Male',
      address: '21 Asero, Abeokuta', guardian: { name: 'Ifeoma Eze', relationship: 'Mother', phone: '08034440004', altPhone: '', address: '', emergencyContact: 'Uncle 08034440006' },
      birth: emptyBirth(),
      previousIllnesses: 'Malaria treated last year', allergies: 'Not recorded', currentMedications: 'None', chronicConditions: 'None', hospitalisations: 'None', surgeries: 'None', familyHistory: 'None known', feedingHistory: 'Family diet', immunisationNote: 'Adolescent. Earlier doses not all on file.',
      status: 'Active', lastVisit: '', nextAppointment: '', createdAt: isoDate(-10),
    }),
    child({
      id: 'PAE-P-0005', hospitalId: '', firstName: 'Amaka', middleName: '', lastName: 'Nwosu', dateOfBirth: dobForAgeDays(900, today), sex: 'Female',
      address: '3 Onikolobo, Abeokuta', guardian: { name: 'Chioma Nwosu', relationship: 'Aunt', phone: '08035550005', altPhone: '', address: 'Same', emergencyContact: 'Aunt 08035550005' },
      birth: emptyBirth(),
      previousIllnesses: 'Diarrhoea last month', allergies: 'None', currentMedications: 'None', chronicConditions: 'None', hospitalisations: 'Current paediatric ward stay', surgeries: 'None', familyHistory: 'None known', feedingHistory: 'Reduced appetite today', immunisationNote: '',
      status: 'Active', lastVisit: today, nextAppointment: '', createdAt: isoDate(-30),
    }),
  ];

  const beds: PaedsBed[] = [
    { id: 'PB1', ward: 'Paediatric ward', number: 'P-01', status: 'Occupied', patientId: 'PAE-P-0005' },
    { id: 'PB2', ward: 'Paediatric ward', number: 'P-02', status: 'Available', patientId: '' },
    { id: 'PB3', ward: 'Paediatric ward', number: 'P-03', status: 'Cleaning', patientId: '' },
    { id: 'PB4', ward: 'Nursery', number: 'N-01', status: 'Available', patientId: '' },
  ];

  const appointments: PaedsAppointment[] = [
    { id: 'PAP-0001', patientId: 'PAE-P-0001', date: today, startTime: '08:30', endTime: '09:00', type: 'Newborn review', clinician: dr, reason: 'Tenth-day review', status: 'Scheduled' },
    { id: 'PAP-0002', patientId: 'PAE-P-0002', date: today, startTime: '09:10', endTime: '09:30', type: 'Immunisation', clinician: nurse, reason: 'Staff-booked immunisation visit', status: 'Checked In' },
    { id: 'PAP-0003', patientId: 'PAE-P-0003', date: today, startTime: '09:40', endTime: '10:10', type: 'Follow-up', clinician: dr, reason: 'Wheeze review', status: 'Waiting' },
    { id: 'PAP-0004', patientId: 'PAE-P-0004', date: today, startTime: '10:20', endTime: '10:50', type: 'New consultation', clinician: dr, reason: 'Fever', status: 'In Consultation' },
    { id: 'PAP-0005', patientId: 'PAE-P-0005', date: today, startTime: '11:00', endTime: '11:20', type: 'Admission review', clinician: dr, reason: 'Ward round', status: 'Completed' },
  ];

  const vitals: VitalSet[] = [{
    id: 'PVT-0001', patientId: 'PAE-P-0003', encounterId: '', date: today, time: '09:35', staff: nurse,
    complaint: 'Cough for three days', duration: '3 days', history: 'Previous wheeze', allergies: 'None', medications: 'Salbutamol inhaler',
    temperatureC: '37.4', heartRate: '110', respiratoryRate: '28', systolic: '96', diastolic: '60', spo2: '97', weightKg: '14.2', lengthCm: '', headCm: '', painScore: '1', consciousness: 'Alert',
    triage: 'Standard', notes: 'Staff assessment. Not an automated score.', status: 'Completed',
  }];

  const growth: GrowthRecord[] = [
    { id: 'PGR-0001', patientId: 'PAE-P-0002', encounterId: '', date: isoDate(-60), time: '10:00', ageLabel: formatAge(patients[1].dateOfBirth, isoDate(-60)), weightKg: '6.4', lengthCm: '64', heightCm: '', headCm: '42', muacCm: '13.5', method: 'Infant scale and length board', staff: nurse, interpretation: '', notes: 'Recorded measurement only.' },
    { id: 'PGR-0002', patientId: 'PAE-P-0002', encounterId: '', date: isoDate(-14), time: '10:15', ageLabel: formatAge(patients[1].dateOfBirth, isoDate(-14)), weightKg: '7.1', lengthCm: '66', heightCm: '', headCm: '43', muacCm: '13.8', method: 'Infant scale and length board', staff: nurse, interpretation: 'Clinician has not added an interpretation.', notes: '' },
  ];

  const development: DevelopmentAssessment[] = [{
    id: 'PDV-0001', patientId: 'PAE-P-0002', date: isoDate(-14), ageLabel: formatAge(patients[1].dateOfBirth, isoDate(-14)), clinician: dr, type: 'Routine developmental review',
    marks: { ...blankMarks(), 'Gross motor': 'Achieved', 'Fine motor': 'Not assessed', 'Speech and language': 'Not yet achieved', 'Parent or guardian concerns': 'Concern identified' },
    concerns: 'Mother says he is quiet compared with an older cousin.', summary: 'Observation only. No developmental diagnosis assigned.', reviewDate: isoDate(30), referralNote: '', status: 'Saved',
  }];

  const newborn: NewbornExam[] = [{
    id: 'PNB-0001', patientId: 'PAE-P-0001', date: dobForAgeDays(9, today), clinician: dr,
    birthDateTime: patients[0].birth.birthDateTime, gestationalAgeWeeks: '39', birthWeightKg: '3.1', birthLengthCm: '49', headCm: '34',
    deliveryMethod: 'Vaginal', maternalHistory: 'Antenatal care attended. No diabetes recorded.', complications: 'None recorded', resuscitation: 'Not required', feedingMethod: 'Breast',
    findings: { ...blankFindings(NEWBORN_SECTIONS), 'General appearance': { choice: 'Normal', notes: 'Pink and active when examined.' }, Skin: { choice: 'Normal', notes: '' } },
    temperatureC: '36.8', heartRate: '138', respiratoryRate: '42', spo2: '', weightKg: '3.2', feedingNotes: 'Feeding well.', problems: '', investigations: '', feedingPlan: 'Continue breastfeeding', monitoringPlan: 'Routine review', followUp: 'Tenth-day visit', escalation: '', status: 'Completed',
  }];

  const immunisations: Immunisation[] = [
    { id: 'PIM-0001', patientId: 'PAE-P-0001', vaccine: 'BCG', dose: '1', dateGiven: dobForAgeDays(10, today), ageLabel: formatAge(patients[0].dateOfBirth, today), batch: 'BCG-DEMO-1', expiry: isoDate(200), route: 'Intradermal', site: 'Left upper arm', staff: nurse, facility: 'GFA Demo Hospital', notes: 'Demonstration record.', nextDue: '', deferReason: '', status: 'Administered', appointmentId: '' },
    { id: 'PIM-0002', patientId: 'PAE-P-0002', vaccine: 'Pentavalent', dose: '2', dateGiven: '', ageLabel: '', batch: '', expiry: '', route: '', site: '', staff: '', facility: 'GFA Demo Hospital', notes: 'Visit booked. Dose is not given until administration is recorded.', nextDue: today, deferReason: '', status: 'Scheduled', appointmentId: 'PAP-0002' },
    { id: 'PIM-0003', patientId: 'PAE-P-0003', vaccine: 'Measles', dose: '1', dateGiven: '', ageLabel: '', batch: '', expiry: '', route: '', site: '', staff: '', facility: '', notes: 'Due date entered by staff for review.', nextDue: isoDate(-5), deferReason: '', status: 'Scheduled', appointmentId: '' },
  ];

  const encounters: PaedsEncounter[] = [{
    id: 'PEN-0001', patientId: 'PAE-P-0005', date: today, time: '11:05', clinician: dr, complaint: 'Poor feeding and fever', hpc: 'Started yesterday.', medicalHistory: 'Recent diarrhoea', birthHistory: '', feedingHistory: 'Reduced intake', developmentHistory: '', immunisationHistory: '', allergies: 'None', medications: 'None',
    examination: { ...blankFindings(EXAM_SYSTEMS), 'General appearance': { choice: 'Abnormal', notes: 'Warm. Drinking small amounts.' } },
    assessment: 'Febrile illness under review.', diagnosis: 'Febrile illness', differential: 'Gastroenteritis', plan: 'Continue ward observations.', notes: '', followUp: 'Ward review', status: 'Completed',
  }];

  const diagnoses: PaedsDiagnosis[] = [
    { id: 'PDX-0001', patientId: 'PAE-P-0005', encounterId: 'PEN-0001', name: 'Febrile illness', description: 'Clinician recorded.', rank: 'Primary', system: 'General', date: today, status: 'Suspected', clinician: dr, notes: '' },
    { id: 'PDX-0002', patientId: 'PAE-P-0003', encounterId: '', name: 'Asthma', description: 'Wheeze under review. Not newly assigned from today’s cough.', rank: 'Secondary', system: 'Respiratory', date: isoDate(-40), status: 'Suspected', clinician: dr, notes: '' },
  ];

  const prescriptions: PaedsPrescription[] = [{
    id: 'PRX-0001', patientId: 'PAE-P-0005', encounterId: 'PEN-0001', date: today, clinician: dr, status: 'Draft', allergyAcknowledged: false,
    items: [{ id: 'PRI-0001', name: 'Paracetamol suspension', formulation: 'Suspension', strength: '120 mg/5 mL', dose: '', doseUnit: 'mg', route: 'Oral', frequency: '', duration: '', quantity: '', instructions: 'Demonstration draft. Not signed.', weightBased: true, weightKg: '12.4', dosePerKg: '15', dosePerKgUnit: 'mg/kg', calculated: '186', reviewed: false }],
  }];

  const investigations: PaedsInvestigation[] = [{
    id: 'PIN-0001', patientId: 'PAE-P-0005', encounterId: 'PEN-0001', category: 'Parasitology', test: 'Malaria test', indication: 'Fever', requestedDate: today, clinician: dr, priority: 'Soon', status: 'Requested', result: '', resultDate: '', reviewer: '', reviewed: false,
  }];

  const admissions: PaedsAdmission[] = [{
    id: 'PAD-0001', patientId: 'PAE-P-0005', number: 'PADM-0001', date: isoDate(-1), time: '18:20', reason: 'Fever and poor feeding', referring: 'Emergency', admitting: dr, ward: 'Paediatric ward', bedId: 'PB1', diagnosis: 'Febrile illness', status: 'Under Care',
    dischargeDate: '', dischargeDiagnosis: '', summary: '', medicationPlan: '', guardianInstructions: '', followUpPlan: '', dischargingClinician: '',
  }];

  const observations: NursingObs[] = [{
    id: 'POB-0001', patientId: 'PAE-P-0005', admissionId: 'PAD-0001', date: today, time: '06:00', temperatureC: '37.8', heartRate: '124', respiratoryRate: '32', systolic: '', diastolic: '', spo2: '98', weightKg: '12.4', pain: 'Mild', feeding: 'Took 80 mL', notes: 'Guardian at bedside.', staff: nurse,
  }];

  const plans: TreatmentPlan[] = [{
    id: 'PPL-0001', patientId: 'PAE-P-0005', encounterId: 'PEN-0001', title: 'Ward care', createdAt: today, clinician: dr, status: 'Open',
    items: [{ id: 'PTI-0001', diagnosis: 'Febrile illness', treatment: 'Observation and fluids', description: '', priority: 'Soon', plannedDate: today, clinician: nurse, status: 'In Progress', notes: '', procedureId: '' }],
  }];

  const procedures: PaedsProcedure[] = [];
  const referrals: PaedsReferral[] = [];
  const followUps: PaedsFollowUp[] = [
    { id: 'PFU-0001', patientId: 'PAE-P-0003', encounterId: '', reason: 'Wheeze review', dueDate: isoDate(-1), clinician: dr, status: 'Upcoming', notes: 'Overdue once the date is compared with today.', appointmentId: 'PAP-0003' },
    { id: 'PFU-0002', patientId: 'PAE-P-0002', encounterId: '', reason: 'Developmental review', dueDate: isoDate(30), clinician: dr, status: 'Upcoming', notes: '', appointmentId: '' },
  ];
  const nutrition: NutritionNote[] = [{ id: 'PNU-0001', patientId: 'PAE-P-0002', date: isoDate(-14), feeding: 'Breast milk plus soft family foods', notes: 'No nutrition diagnosis recorded.', clinician: dr }];
  const emergencies: EmergencyCase[] = [{
    id: 'PEM-0001', patientId: 'PAE-P-0004', date: today, time: '07:50', complaint: 'Fever since last night', onset: 'Last night', history: 'No convulsions recorded', allergies: 'Not recorded', observations: 'Warm. Alert.', triage: 'Urgent', assessment: '', actions: '', investigations: '', escalation: '', disposition: 'Awaiting Assessment',
  }];
  const services: PaedsService[] = [
    { id: 'PSV-0001', name: 'Paediatric consultation', category: 'Clinic', description: 'New or review visit', durationMin: 30, price: 5000, active: true },
    { id: 'PSV-0002', name: 'Growth monitoring', category: 'Clinic', description: 'Measurements only', durationMin: 15, price: 2000, active: true },
    { id: 'PSV-0003', name: 'Developmental assessment', category: 'Clinic', description: 'Clinician checklist', durationMin: 40, price: 7000, active: true },
    { id: 'PSV-0004', name: 'Immunisation visit', category: 'Prevention', description: 'Administration recorded separately', durationMin: 15, price: 1500, active: true },
    { id: 'PSV-0005', name: 'Newborn assessment', category: 'Newborn', description: 'Structured examination', durationMin: 30, price: 4000, active: true },
  ];
  const equipment: PaedsEquipment[] = [
    { id: 'PEQ-0001', name: 'Infant weighing scale', category: 'Equipment', code: 'SC-INF', quantity: 2, unit: 'unit', reorderLevel: 1, expiry: '', location: 'Clinic', status: 'Available', nextMaintenance: isoDate(40) },
    { id: 'PEQ-0002', name: 'Length board', category: 'Equipment', code: 'LB-01', quantity: 1, unit: 'unit', reorderLevel: 1, expiry: '', location: 'Clinic', status: 'Maintenance due', nextMaintenance: isoDate(-3) },
    { id: 'PEQ-0003', name: 'Examination gloves', category: 'Supplies', code: 'GL-M', quantity: 4, unit: 'box', reorderLevel: 10, expiry: isoDate(90), location: 'Store', status: 'Available', nextMaintenance: '' },
    { id: 'PEQ-0004', name: 'Paediatric BP cuff', category: 'Equipment', code: 'BP-P', quantity: 0, unit: 'unit', reorderLevel: 1, expiry: '', location: 'Ward', status: 'Unavailable', nextMaintenance: '' },
  ];
  const documents: PaedsDocument[] = [{ id: 'PDC-0001', patientId: 'PAE-P-0001', name: 'Birth summary note', date: dobForAgeDays(10, today), note: 'Demonstration document.' }];

  return { patients, appointments, vitals, growth, development, newborn, immunisations, encounters, diagnoses, prescriptions, investigations, beds, admissions, observations, plans, procedures, referrals, followUps, nutrition, emergencies, services, equipment, documents };
}
