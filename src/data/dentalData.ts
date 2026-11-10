import { patientRecords } from '@/data/hmsData';

export type Sex = 'Male' | 'Female';
export type PatientStatus = 'Active' | 'Inactive';
export type AppointmentStatus =
  | 'Scheduled'
  | 'Checked In'
  | 'Waiting'
  | 'In Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';
export type AppointmentType =
  | 'New patient examination'
  | 'Routine check-up'
  | 'Dental cleaning'
  | 'Restoration'
  | 'Extraction'
  | 'Root canal treatment'
  | 'Follow-up'
  | 'Emergency dental visit';
export type ChairStatus = 'In Use' | 'Available' | 'Cleaning' | 'Reserved';
export type FindingKind =
  | 'Healthy'
  | 'Dental caries'
  | 'Existing restoration'
  | 'Missing tooth'
  | 'Fracture'
  | 'Tooth mobility'
  | 'Crown'
  | 'Root canal treatment'
  | 'Extraction required'
  | 'Impacted tooth'
  | 'Tooth sensitivity'
  | 'Periodontal concern'
  | 'Other';
export type Surface = 'Mesial' | 'Distal' | 'Occlusal' | 'Incisal' | 'Buccal' | 'Lingual';
export type EncounterStatus = 'Draft' | 'Saved' | 'Completed';
export type PlanItemStatus =
  | 'Proposed'
  | 'Awaiting Patient Consent'
  | 'Approved'
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Deferred'
  | 'Cancelled';
export type Priority = 'Routine' | 'Soon' | 'Urgent';
export type ConsentStatus = 'Pending' | 'Given' | 'Declined';
export type ProcedureStatus = 'Recorded' | 'Completed' | 'Cancelled';
export type RxStatus = 'Draft' | 'Issued' | 'Cancelled';
export type InvType =
  | 'Periapical radiograph'
  | 'Bitewing radiograph'
  | 'Panoramic radiograph'
  | 'CBCT referral'
  | 'Laboratory investigation'
  | 'Other investigation';
export type InvStatus = 'Requested' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
export type ReferralStatus = 'Draft' | 'Sent' | 'Accepted' | 'Completed' | 'Cancelled';
export type FollowUpStatus = 'Upcoming' | 'Overdue' | 'Completed' | 'Cancelled';
export type Dentition = 'permanent' | 'primary';

export interface DentalPatient {
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
  medicalConditions: string;
  previousDentalHistory: string;
  preferredAppointmentDate: string;
  status: PatientStatus;
  lastVisit: string;
  nextAppointment: string;
  createdAt: string;
}

export interface DentalAppointment {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  dentist: string;
  chairId: string;
  reason: string;
  notes: string;
  status: AppointmentStatus;
}

export interface DentalChair {
  id: string;
  name: string;
  status: ChairStatus;
}

export interface ToothFinding {
  id: string;
  tooth: string;
  surface: Surface | 'Whole';
  finding: FindingKind;
  notes: string;
  visitId: string;
  visitLabel: string;
  recordedAt: string;
  diagnosis: string;
  recommendedTreatment: string;
  restoration: string;
}

export interface DentalChart {
  patientId: string;
  dentition: Dentition;
  findings: ToothFinding[];
}

export interface DentalEncounter {
  id: string;
  patientId: string;
  date: string;
  time: string;
  dentist: string;
  designation: string;
  chiefComplaint: string;
  hpc: string;
  medicalHistory: string;
  dentalHistory: string;
  allergies: string;
  medications: string;
  vitals: string;
  extraoral: string;
  intraoral: string;
  periodontal: string;
  chartSummary: string;
  diagnosis: string;
  differential: string;
  treatmentPlan: string;
  proceduresPerformed: string;
  prescriptionsNote: string;
  investigationsNote: string;
  referralsNote: string;
  followUp: string;
  notes: string;
  status: EncounterStatus;
}

export interface TreatmentItem {
  id: string;
  tooth: string;
  condition: string;
  procedure: string;
  description: string;
  priority: Priority;
  plannedDate: string;
  dentist: string;
  durationMin: number;
  estimatedCost: number;
  status: PlanItemStatus;
  notes: string;
  consent: ConsentStatus;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  createdAt: string;
  dentist: string;
  status: 'Open' | 'Completed' | 'Cancelled';
  consentStatus: ConsentStatus;
  nextSessionDate: string;
  items: TreatmentItem[];
}

export interface DentalProcedure {
  id: string;
  patientId: string;
  encounterId: string;
  planId: string;
  planItemId: string;
  tooth: string;
  procedure: string;
  indication: string;
  anaesthesia: string;
  date: string;
  dentist: string;
  materials: string;
  notes: string;
  outcome: string;
  complications: string;
  postOp: string;
  followUp: string;
  status: ProcedureStatus;
  charge: number;
}

export interface RxMedication {
  id: string;
  name: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

export interface DentalPrescription {
  id: string;
  patientId: string;
  encounterId: string;
  date: string;
  dentist: string;
  status: RxStatus;
  allergyAcknowledged: boolean;
  medications: RxMedication[];
}

export interface DentalInvestigation {
  id: string;
  patientId: string;
  encounterId: string;
  type: InvType;
  indication: string;
  requestedDate: string;
  dentist: string;
  priority: Priority;
  status: InvStatus;
  result: string;
}

export interface DentalReferral {
  id: string;
  patientId: string;
  encounterId: string;
  destination: string;
  reason: string;
  findings: string;
  urgency: Priority;
  notes: string;
  status: ReferralStatus;
  date: string;
  dentist: string;
}

export interface DentalFollowUp {
  id: string;
  patientId: string;
  encounterId: string;
  procedureId: string;
  dueDate: string;
  reason: string;
  dentist: string;
  status: FollowUpStatus;
  notes: string;
  appointmentId: string;
}

export interface DentalService {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMin: number;
  price: number;
  active: boolean;
}

export interface InventoryItem {
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

export interface DentalDocument {
  id: string;
  patientId: string;
  name: string;
  kind: string;
  date: string;
  note: string;
}

export interface DentalState {
  patients: DentalPatient[];
  appointments: DentalAppointment[];
  chairs: DentalChair[];
  charts: DentalChart[];
  encounters: DentalEncounter[];
  plans: TreatmentPlan[];
  procedures: DentalProcedure[];
  prescriptions: DentalPrescription[];
  investigations: DentalInvestigation[];
  referrals: DentalReferral[];
  followUps: DentalFollowUp[];
  services: DentalService[];
  inventory: InventoryItem[];
  documents: DentalDocument[];
}

export const STORAGE_KEY = 'gfa_dental_v1';

export const DENTISTS = [
  { name: 'Dr. Yetunde Akinola', designation: 'Dental Surgeon' },
  { name: 'Dr. Kunle Adeyemi', designation: 'Dental Officer' },
] as const;

export const APPOINTMENT_TYPES: AppointmentType[] = [
  'New patient examination',
  'Routine check-up',
  'Dental cleaning',
  'Restoration',
  'Extraction',
  'Root canal treatment',
  'Follow-up',
  'Emergency dental visit',
];

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'Scheduled',
  'Checked In',
  'Waiting',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
];

export const FINDINGS: FindingKind[] = [
  'Healthy',
  'Dental caries',
  'Existing restoration',
  'Missing tooth',
  'Fracture',
  'Tooth mobility',
  'Crown',
  'Root canal treatment',
  'Extraction required',
  'Impacted tooth',
  'Tooth sensitivity',
  'Periodontal concern',
  'Other',
];

export const FINDING_COLOR: Record<FindingKind, string> = {
  Healthy: '#e2e8f0',
  'Dental caries': '#d97706',
  'Existing restoration': '#2563eb',
  'Missing tooth': '#94a3b8',
  Fracture: '#ea580c',
  'Tooth mobility': '#7c3aed',
  Crown: '#4f46e5',
  'Root canal treatment': '#0f766e',
  'Extraction required': '#e11d48',
  'Impacted tooth': '#57534e',
  'Tooth sensitivity': '#ca8a04',
  'Periodontal concern': '#be123c',
  Other: '#64748b',
};

export const PLAN_STATUSES: PlanItemStatus[] = [
  'Proposed',
  'Awaiting Patient Consent',
  'Approved',
  'Scheduled',
  'In Progress',
  'Completed',
  'Deferred',
  'Cancelled',
];

export const INV_TYPES: InvType[] = [
  'Periapical radiograph',
  'Bitewing radiograph',
  'Panoramic radiograph',
  'CBCT referral',
  'Laboratory investigation',
  'Other investigation',
];

export const MED_CATALOGUE: { name: string; strength: string; route: string; defaultDose: string; defaultFreq: string; allergyHints: string[] }[] = [
  { name: 'Amoxicillin', strength: '500 mg', route: 'Oral', defaultDose: '500 mg', defaultFreq: '8 hourly', allergyHints: ['penicillin', 'amoxicillin'] },
  { name: 'Amoxicillin/Clavulanate', strength: '625 mg', route: 'Oral', defaultDose: '625 mg', defaultFreq: '12 hourly', allergyHints: ['penicillin', 'amoxicillin'] },
  { name: 'Metronidazole', strength: '400 mg', route: 'Oral', defaultDose: '400 mg', defaultFreq: '8 hourly', allergyHints: ['metronidazole'] },
  { name: 'Clindamycin', strength: '300 mg', route: 'Oral', defaultDose: '300 mg', defaultFreq: '8 hourly', allergyHints: ['clindamycin'] },
  { name: 'Ibuprofen', strength: '400 mg', route: 'Oral', defaultDose: '400 mg', defaultFreq: '8 hourly', allergyHints: ['ibuprofen', 'nsaid', 'aspirin'] },
  { name: 'Diclofenac', strength: '50 mg', route: 'Oral', defaultDose: '50 mg', defaultFreq: '8 hourly', allergyHints: ['diclofenac', 'nsaid', 'aspirin'] },
  { name: 'Paracetamol', strength: '500 mg', route: 'Oral', defaultDose: '1 g', defaultFreq: '8 hourly', allergyHints: ['paracetamol'] },
  { name: 'Chlorhexidine mouthwash', strength: '0.2%', route: 'Oral rinse', defaultDose: '10 ml', defaultFreq: '12 hourly', allergyHints: ['chlorhexidine'] },
];

export const PERMANENT_UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
export const PERMANENT_LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
export const PRIMARY_UPPER = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
export const PRIMARY_LOWER = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];

export const CHAIR_STATUSES: ChairStatus[] = ['Available', 'In Use', 'Cleaning', 'Reserved'];

export function isoDate(offsetDays = 0, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ageFromDob(dob: string, today = isoDate()): number {
  if (!dob) return 0;
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age -= 1;
  return age;
}

export function patientName(p: Pick<DentalPatient, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function bitingSurface(tooth: string): 'Occlusal' | 'Incisal' {
  const n = Number(tooth[1] ?? '0');
  return n <= 3 ? 'Incisal' : 'Occlusal';
}

export function lingualLabel(tooth: string): 'Palatal' | 'Lingual' {
  const q = tooth[0];
  return q === '1' || q === '2' || q === '5' || q === '6' ? 'Palatal' : 'Lingual';
}

export function surfacesFor(tooth: string): Surface[] {
  return ['Mesial', bitingSurface(tooth), 'Distal', 'Buccal', 'Lingual'];
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

export function followUpDisplayStatus(item: DentalFollowUp, today: string): FollowUpStatus {
  if (item.status === 'Completed' || item.status === 'Cancelled') return item.status;
  if (item.dueDate < today) return 'Overdue';
  return 'Upcoming';
}

export function stockStatus(item: InventoryItem, today: string): 'In stock' | 'Low stock' | 'Out of stock' | 'Expiring soon' | 'Expired' {
  if (item.expiry && item.expiry < today) return 'Expired';
  if (item.quantity <= 0) return 'Out of stock';
  if (item.quantity <= item.reorderLevel) return 'Low stock';
  if (item.expiry) {
    const exp = new Date(`${item.expiry}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    const days = (exp.getTime() - now.getTime()) / 86400000;
    if (days <= 90) return 'Expiring soon';
  }
  return 'In stock';
}

export function allergyWarning(allergies: string, medicationName: string): string {
  const a = allergies.toLowerCase();
  if (!a || a === 'none' || a === 'nil' || a === 'nkda') return '';
  const name = medicationName.toLowerCase();
  const catalogue = MED_CATALOGUE.find((m) => name.includes(m.name.toLowerCase()));
  const hints = catalogue?.allergyHints ?? [];
  const hit = hints.find((hint) => a.includes(hint));
  if (hit) return `Recorded allergy may relate to ${medicationName}: patient allergies include “${allergies}”.`;
  if (a.includes('penicillin') && /amox|clavulanate|penicillin/.test(name)) {
    return `Recorded penicillin allergy. Do not issue ${medicationName} without clinical review.`;
  }
  if ((a.includes('aspirin') || a.includes('nsaid')) && /ibuprofen|diclofenac|aspirin/.test(name)) {
    return `Recorded aspirin/NSAID allergy. Review ${medicationName} before prescribing.`;
  }
  if (a.includes('sulfa') && /sulfa|co-trimoxazole|septrin/.test(name)) {
    return `Recorded sulfa allergy. Review ${medicationName} before prescribing.`;
  }
  return '';
}

export function openPlanItems(plan: TreatmentPlan): TreatmentItem[] {
  return plan.items.filter((item) => item.status !== 'Completed' && item.status !== 'Cancelled');
}

export function syncPatientDates(state: DentalState, today: string): DentalState {
  const patients = state.patients.map((p) => {
    const appts = state.appointments.filter(
      (a) => a.patientId === p.id && a.status !== 'Cancelled' && a.status !== 'No Show',
    );
    const future = appts
      .filter((a) => a.date >= today && a.status !== 'Completed')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    const visits = [
      ...appts.filter((a) => a.status === 'Completed').map((a) => a.date),
      ...state.encounters.filter((e) => e.patientId === p.id && e.status === 'Completed').map((e) => e.date),
      ...state.procedures.filter((proc) => proc.patientId === p.id && proc.status === 'Completed').map((proc) => proc.date),
    ].filter(Boolean).sort();
    return {
      ...p,
      nextAppointment: future[0] ? `${future[0].date} ${future[0].startTime}` : '',
      lastVisit: visits.length ? visits[visits.length - 1] : p.lastVisit,
    };
  });
  return { ...state, patients };
}

function dobForAge(age: number, today: string): string {
  const [y, m, d] = today.split('-');
  return `${Number(y) - age}-${m}-${d}`;
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') || parts[0] || '' };
}

export function buildDentalSeed(today = isoDate()): DentalState {
  const basePatients = patientRecords.slice(0, 8).map((record, index) => {
    const { firstName, lastName } = splitName(record.name);
    return {
      id: `DEN-P-${String(index + 1).padStart(4, '0')}`,
      hospitalId: record.hospitalId,
      firstName,
      lastName,
      dateOfBirth: dobForAge(record.age, today),
      sex: record.gender,
      phone: record.phone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@mail.demo`,
      address: record.address,
      emergencyContact: index % 2 === 0 ? 'Spouse' : 'Sibling',
      emergencyPhone: `0809${String(1000000 + index).slice(0, 7)}`,
      medicalHistory: record.allergies === 'None' ? 'No significant medical history recorded.' : `Known allergy: ${record.allergies}.`,
      drugAllergies: record.allergies,
      currentMedications: index === 4 ? 'Lisinopril 10 mg daily' : index === 0 ? 'None' : 'None recorded',
      medicalConditions: index === 4 ? 'Hypertension' : index === 6 ? 'None' : 'None recorded',
      previousDentalHistory: index === 0 ? 'Composite restoration on 26 two years ago. Intermittent pain from upper right molar.' : 'Routine scaling. No previous extractions recorded.',
      preferredAppointmentDate: '',
      status: 'Active' as PatientStatus,
      lastVisit: index < 4 ? isoDate(-14 + index, new Date(`${today}T12:00:00`)) : '',
      nextAppointment: '',
      createdAt: record.registeredOn,
    };
  });

  const paediatric: DentalPatient[] = [
    {
      id: 'DEN-P-0009',
      hospitalId: 'GFA HMS/2026/00160',
      firstName: 'Chiamaka',
      lastName: 'Eze',
      dateOfBirth: dobForAge(7, today),
      sex: 'Female',
      phone: '08091234567',
      email: '',
      address: '12 Ojuelegba Rd, Lagos',
      emergencyContact: 'Mrs. Ada Eze (mother)',
      emergencyPhone: '08091234500',
      medicalHistory: 'Childhood asthma, well controlled.',
      drugAllergies: 'None',
      currentMedications: 'Salbutamol inhaler as needed',
      medicalConditions: 'Asthma',
      previousDentalHistory: 'First dental visit. Mother reports sensitivity to sweets.',
      preferredAppointmentDate: today,
      status: 'Active',
      lastVisit: '',
      nextAppointment: '',
      createdAt: isoDate(-3),
    },
    {
      id: 'DEN-P-0010',
      hospitalId: 'GFA HMS/2026/00161',
      firstName: 'David',
      lastName: 'Okonkwo',
      dateOfBirth: dobForAge(6, today),
      sex: 'Male',
      phone: '08160011223',
      email: '',
      address: '4 Bode Thomas, Surulere',
      emergencyContact: 'Mr. Chuka Okonkwo (father)',
      emergencyPhone: '08160011200',
      medicalHistory: 'No known medical conditions.',
      drugAllergies: 'None',
      currentMedications: 'None',
      medicalConditions: 'None',
      previousDentalHistory: 'Fluoride varnish at a school screening last year.',
      preferredAppointmentDate: '',
      status: 'Active',
      lastVisit: isoDate(-40),
      nextAppointment: '',
      createdAt: isoDate(-40),
    },
  ];

  const patients = [...basePatients, ...paediatric];

  const chairs: DentalChair[] = [
    { id: 'CH1', name: 'Dental Chair 1', status: 'In Use' },
    { id: 'CH2', name: 'Dental Chair 2', status: 'Available' },
    { id: 'CH3', name: 'Dental Chair 3', status: 'Cleaning' },
    { id: 'CH4', name: 'Dental Chair 4', status: 'Reserved' },
  ];

  const y = DENTISTS[0].name;
  const k = DENTISTS[1].name;

  const appointments: DentalAppointment[] = [
    { id: 'APT-0001', patientId: 'DEN-P-0001', date: today, startTime: '08:00', endTime: '08:30', type: 'New patient examination', dentist: y, chairId: 'CH1', reason: 'Pain upper right molar', notes: 'Bring previous radiograph if available.', status: 'Scheduled' },
    { id: 'APT-0002', patientId: 'DEN-P-0002', date: today, startTime: '08:40', endTime: '09:10', type: 'Dental cleaning', dentist: y, chairId: 'CH2', reason: 'Scaling and polishing', notes: '', status: 'Checked In' },
    { id: 'APT-0003', patientId: 'DEN-P-0003', date: today, startTime: '09:20', endTime: '10:00', type: 'Extraction', dentist: k, chairId: 'CH1', reason: 'Retained 38', notes: 'Sulfa allergy on file.', status: 'Waiting' },
    { id: 'APT-0004', patientId: 'DEN-P-0004', date: today, startTime: '10:00', endTime: '10:40', type: 'Restoration', dentist: y, chairId: 'CH3', reason: 'Composite 36', notes: 'Aspirin allergy.', status: 'In Consultation' },
    { id: 'APT-0005', patientId: 'DEN-P-0005', date: today, startTime: '10:40', endTime: '11:10', type: 'Routine check-up', dentist: k, chairId: 'CH2', reason: 'Six-month review', notes: '', status: 'Completed' },
    { id: 'APT-0006', patientId: 'DEN-P-0006', date: today, startTime: '11:20', endTime: '12:20', type: 'Root canal treatment', dentist: y, chairId: 'CH4', reason: 'Irreversible pulpitis 46', notes: 'Latex allergy — use nitrile gloves.', status: 'Scheduled' },
    { id: 'APT-0007', patientId: 'DEN-P-0007', date: today, startTime: '13:00', endTime: '13:30', type: 'Emergency dental visit', dentist: k, chairId: 'CH2', reason: 'Avulsed filling', notes: 'Patient called to cancel.', status: 'Cancelled' },
    { id: 'APT-0008', patientId: 'DEN-P-0009', date: today, startTime: '14:00', endTime: '14:30', type: 'New patient examination', dentist: y, chairId: 'CH2', reason: 'Paediatric exam', notes: 'Parent will attend.', status: 'Scheduled' },
    { id: 'APT-0009', patientId: 'DEN-P-0008', date: today, startTime: '15:00', endTime: '15:20', type: 'Follow-up', dentist: k, chairId: 'CH3', reason: 'Review extraction socket', notes: '', status: 'Scheduled' },
    { id: 'APT-0010', patientId: 'DEN-P-0001', date: isoDate(-1), startTime: '09:00', endTime: '09:30', type: 'Routine check-up', dentist: y, chairId: 'CH1', reason: 'Pain review', notes: '', status: 'Completed' },
    { id: 'APT-0011', patientId: 'DEN-P-0002', date: isoDate(-1), startTime: '11:00', endTime: '11:40', type: 'Dental cleaning', dentist: k, chairId: 'CH2', reason: 'Scaling', notes: '', status: 'Completed' },
    { id: 'APT-0012', patientId: 'DEN-P-0005', date: isoDate(-2), startTime: '10:00', endTime: '10:30', type: 'Follow-up', dentist: y, chairId: 'CH1', reason: 'Post-scaling review', notes: '', status: 'Completed' },
    { id: 'APT-0013', patientId: 'DEN-P-0006', date: isoDate(-3), startTime: '14:00', endTime: '14:30', type: 'Restoration', dentist: k, chairId: 'CH3', reason: 'Filling review', notes: '', status: 'No Show' },
    { id: 'APT-0014', patientId: 'DEN-P-0010', date: isoDate(1), startTime: '09:30', endTime: '10:00', type: 'Follow-up', dentist: y, chairId: 'CH2', reason: 'Fluoride review', notes: '', status: 'Scheduled' },
    { id: 'APT-0015', patientId: 'DEN-P-0003', date: isoDate(2), startTime: '11:00', endTime: '11:40', type: 'Extraction', dentist: k, chairId: 'CH1', reason: 'Planned extraction if consented', notes: '', status: 'Scheduled' },
  ];

  for (let i = 4; i <= 6; i += 1) {
    appointments.push({
      id: `APT-00${15 + i}`,
      patientId: patients[i % 6].id,
      date: isoDate(-i),
      startTime: '09:00',
      endTime: '09:30',
      type: 'Routine check-up',
      dentist: i % 2 === 0 ? y : k,
      chairId: 'CH1',
      reason: 'Clinic review',
      notes: '',
      status: 'Completed',
    });
  }

  const charts: DentalChart[] = patients.map((p) => ({
    patientId: p.id,
    dentition: p.id === 'DEN-P-0009' || p.id === 'DEN-P-0010' ? 'primary' : 'permanent',
    findings: [],
  }));

  const john = charts.find((c) => c.patientId === 'DEN-P-0001');
  if (john) {
    john.findings = [
      { id: 'FND-0001', tooth: '16', surface: 'Occlusal', finding: 'Dental caries', notes: 'Deep occlusal cavity, cold sensitive.', visitId: 'ENC-0001', visitLabel: 'Previous visit', recordedAt: isoDate(-1), diagnosis: 'Occlusal caries 16', recommendedTreatment: 'Composite restoration', restoration: '' },
      { id: 'FND-0002', tooth: '26', surface: 'Mesial', finding: 'Existing restoration', notes: 'Sound composite, margins intact.', visitId: 'baseline', visitLabel: 'Baseline', recordedAt: isoDate(-400), diagnosis: '', recommendedTreatment: 'Monitor', restoration: 'Composite' },
      { id: 'FND-0003', tooth: '18', surface: 'Whole', finding: 'Missing tooth', notes: 'Extracted previously.', visitId: 'baseline', visitLabel: 'Baseline', recordedAt: isoDate(-400), diagnosis: '', recommendedTreatment: '', restoration: '' },
    ];
  }
  const chiamaka = charts.find((c) => c.patientId === 'DEN-P-0009');
  if (chiamaka) {
    chiamaka.findings = [
      { id: 'FND-0004', tooth: '54', surface: 'Occlusal', finding: 'Dental caries', notes: 'Small occlusal lesion.', visitId: 'baseline', visitLabel: 'Baseline', recordedAt: isoDate(-3), diagnosis: 'Caries 54', recommendedTreatment: 'Composite or Hall crown', restoration: '' },
      { id: 'FND-0005', tooth: '64', surface: 'Whole', finding: 'Healthy', notes: '', visitId: 'baseline', visitLabel: 'Baseline', recordedAt: isoDate(-3), diagnosis: '', recommendedTreatment: '', restoration: '' },
    ];
  }
  const chidi = charts.find((c) => c.patientId === 'DEN-P-0003');
  if (chidi) {
    chidi.findings = [
      { id: 'FND-0006', tooth: '38', surface: 'Whole', finding: 'Impacted tooth', notes: 'Mesioangular impaction, recurrent pericoronitis.', visitId: 'ENC-0003', visitLabel: 'Current encounter', recordedAt: today, diagnosis: 'Impacted 38', recommendedTreatment: 'Surgical extraction', restoration: '' },
    ];
  }

  const encounters: DentalEncounter[] = [
    {
      id: 'ENC-0001',
      patientId: 'DEN-P-0001',
      date: isoDate(-1),
      time: '09:10',
      dentist: y,
      designation: 'Dental Surgeon',
      chiefComplaint: 'Pain on biting, upper right',
      hpc: 'Three weeks of cold sensitivity, worse with sweets.',
      medicalHistory: 'No significant medical history.',
      dentalHistory: 'Restoration on 26 two years ago.',
      allergies: 'Penicillin',
      medications: 'None',
      vitals: 'BP 118/76, pulse 78',
      extraoral: 'No swelling or lymphadenopathy.',
      intraoral: 'Carious 16 occlusal. Oral hygiene fair.',
      periodontal: 'Localised plaque. BPE 1 in sextant 1.',
      chartSummary: 'Caries 16; existing restoration 26; missing 18.',
      diagnosis: 'Occlusal dental caries, tooth 16',
      differential: 'Cracked tooth syndrome',
      treatmentPlan: 'Composite restoration 16 after radiograph.',
      proceduresPerformed: 'Oral examination',
      prescriptionsNote: 'Analgesia discussed; not issued at this visit.',
      investigationsNote: 'Periapical radiograph requested.',
      referralsNote: '',
      followUp: 'Return for restoration within 7 days.',
      notes: 'Demonstration encounter. Not saved to a hospital server.',
      status: 'Completed',
    },
    {
      id: 'ENC-0002',
      patientId: 'DEN-P-0002',
      date: today,
      time: '08:45',
      dentist: y,
      designation: 'Dental Surgeon',
      chiefComplaint: 'Routine cleaning',
      hpc: 'No pain. Requests scaling.',
      medicalHistory: 'None recorded.',
      dentalHistory: 'Last scale 8 months ago.',
      allergies: 'None',
      medications: 'None',
      vitals: '',
      extraoral: '',
      intraoral: '',
      periodontal: '',
      chartSummary: '',
      diagnosis: '',
      differential: '',
      treatmentPlan: '',
      proceduresPerformed: '',
      prescriptionsNote: '',
      investigationsNote: '',
      referralsNote: '',
      followUp: '',
      notes: '',
      status: 'Draft',
    },
    {
      id: 'ENC-0003',
      patientId: 'DEN-P-0003',
      date: today,
      time: '09:30',
      dentist: k,
      designation: 'Dental Officer',
      chiefComplaint: 'Swelling behind lower left molar',
      hpc: 'Two episodes of pericoronitis in six months.',
      medicalHistory: 'Sulfa allergy.',
      dentalHistory: 'Wisdom tooth symptoms only.',
      allergies: 'Sulfa drugs',
      medications: 'None',
      vitals: 'BP 124/80',
      extraoral: 'Mild left submandibular tenderness.',
      intraoral: 'Partially erupted 38, inflamed operculum.',
      periodontal: 'Localised inflammation 38.',
      chartSummary: 'Impacted 38.',
      diagnosis: 'Recurrent pericoronitis, impacted 38',
      differential: 'Periapical abscess 37',
      treatmentPlan: 'Surgical extraction after consent.',
      proceduresPerformed: '',
      prescriptionsNote: '',
      investigationsNote: 'Panoramic radiograph if not already available.',
      referralsNote: 'Oral surgery if surgical complexity increases.',
      followUp: 'Review 7 days after extraction.',
      notes: 'Awaiting consent.',
      status: 'Saved',
    },
  ];

  const plans: TreatmentPlan[] = [
    {
      id: 'PLN-0001',
      patientId: 'DEN-P-0001',
      title: 'Caries management — John Doe',
      createdAt: isoDate(-1),
      dentist: y,
      status: 'Open',
      consentStatus: 'Pending',
      nextSessionDate: today,
      items: [
        { id: 'ITM-0001', tooth: '16', condition: 'Occlusal caries', procedure: 'Composite restoration', description: 'Remove caries and restore 16 with composite.', priority: 'Soon', plannedDate: today, dentist: y, durationMin: 45, estimatedCost: 25000, status: 'Proposed', notes: '', consent: 'Pending' },
        { id: 'ITM-0002', tooth: '', condition: 'Gingivitis', procedure: 'Dental scaling and polishing', description: 'Full-mouth scale and polish.', priority: 'Routine', plannedDate: isoDate(3), dentist: y, durationMin: 40, estimatedCost: 15000, status: 'Approved', notes: 'Consent given verbally at last visit.', consent: 'Given' },
      ],
    },
    {
      id: 'PLN-0002',
      patientId: 'DEN-P-0003',
      title: 'Extraction plan — Chidi Eze',
      createdAt: today,
      dentist: k,
      status: 'Open',
      consentStatus: 'Pending',
      nextSessionDate: isoDate(2),
      items: [
        { id: 'ITM-0003', tooth: '38', condition: 'Impacted tooth with pericoronitis', procedure: 'Tooth extraction', description: 'Surgical removal of 38.', priority: 'Urgent', plannedDate: isoDate(2), dentist: k, durationMin: 60, estimatedCost: 45000, status: 'Awaiting Patient Consent', notes: 'Explain risks: nerve injury, dry socket.', consent: 'Pending' },
      ],
    },
  ];

  const procedures: DentalProcedure[] = [
    { id: 'PRC-0001', patientId: 'DEN-P-0002', encounterId: '', planId: '', planItemId: '', tooth: '', procedure: 'Dental scaling and polishing', indication: 'Calculus and staining', anaesthesia: 'None', date: isoDate(-1), dentist: k, materials: 'Ultrasonic tips, prophylaxis paste', notes: 'Tolerated well.', outcome: 'Calculus removed', complications: 'None', postOp: 'Soft diet today. Warm saline rinses.', followUp: '6 months', status: 'Completed', charge: 15000 },
    { id: 'PRC-0002', patientId: 'DEN-P-0005', encounterId: '', planId: '', planItemId: '', tooth: '', procedure: 'Oral examination', indication: 'Routine review', anaesthesia: 'None', date: today, dentist: k, materials: 'Mirror, probe', notes: 'No new caries.', outcome: 'Examination completed', complications: 'None', postOp: 'Continue brushing twice daily.', followUp: '6 months', status: 'Completed', charge: 8000 },
    { id: 'PRC-0003', patientId: 'DEN-P-0004', encounterId: '', planId: '', planItemId: '', tooth: '46', procedure: 'Composite restoration', indication: 'Occlusal caries', anaesthesia: 'Lidocaine 2% cartridge', date: isoDate(-6), dentist: y, materials: 'Composite resin A2, etch, bond', notes: 'Aspirin allergy — NSAIDs avoided.', outcome: 'Restored', complications: 'None', postOp: 'Avoid chewing on the side for 2 hours.', followUp: 'As needed', status: 'Completed', charge: 25000 },
    { id: 'PRC-0004', patientId: 'DEN-P-0010', encounterId: '', planId: '', planItemId: '', tooth: '', procedure: 'Fluoride application', indication: 'Caries prevention', anaesthesia: 'None', date: isoDate(-40), dentist: y, materials: 'Fluoride varnish', notes: 'School-age prevention visit.', outcome: 'Varnish applied', complications: 'None', postOp: 'No eating for 30 minutes.', followUp: '6 months', status: 'Completed', charge: 5000 },
    { id: 'PRC-0005', patientId: 'DEN-P-0008', encounterId: '', planId: '', planItemId: '', tooth: '28', procedure: 'Tooth extraction', indication: 'Gross caries, unrestorable', anaesthesia: 'Lidocaine 2% with adrenaline', date: isoDate(-10), dentist: k, materials: 'Forceps, gauze', notes: 'Iodine allergy noted; no iodine dressing.', outcome: 'Tooth delivered', complications: 'None', postOp: 'Bite on gauze 30 minutes. Review if bleeding persists.', followUp: isoDate(0), status: 'Completed', charge: 20000 },
  ];

  const prescriptions: DentalPrescription[] = [
    {
      id: 'RX-0001',
      patientId: 'DEN-P-0001',
      encounterId: 'ENC-0001',
      date: isoDate(-1),
      dentist: y,
      status: 'Draft',
      allergyAcknowledged: false,
      medications: [
        { id: 'MED-0001', name: 'Amoxicillin', strength: '500 mg', dosage: '500 mg', route: 'Oral', frequency: '8 hourly', duration: '5 days', quantity: '15 capsules', instructions: 'Finish the course. Stop and seek care if rash occurs.' },
      ],
    },
    {
      id: 'RX-0002',
      patientId: 'DEN-P-0008',
      encounterId: '',
      date: isoDate(-10),
      dentist: k,
      status: 'Issued',
      allergyAcknowledged: true,
      medications: [
        { id: 'MED-0002', name: 'Paracetamol', strength: '500 mg', dosage: '1 g', route: 'Oral', frequency: '8 hourly', duration: '3 days', quantity: '18 tablets', instructions: 'Take after food if needed for pain. Do not exceed 4 g in 24 hours.' },
        { id: 'MED-0003', name: 'Chlorhexidine mouthwash', strength: '0.2%', dosage: '10 ml', route: 'Oral rinse', frequency: '12 hourly', duration: '5 days', quantity: '1 bottle', instructions: 'Rinse for 1 minute and spit. Do not swallow.' },
      ],
    },
  ];

  const investigations: DentalInvestigation[] = [
    { id: 'INV-0001', patientId: 'DEN-P-0001', encounterId: 'ENC-0001', type: 'Periapical radiograph', indication: 'Assess caries depth 16', requestedDate: isoDate(-1), dentist: y, priority: 'Soon', status: 'Requested', result: '' },
    { id: 'INV-0002', patientId: 'DEN-P-0005', encounterId: '', type: 'Bitewing radiograph', indication: 'Interproximal caries screen', requestedDate: isoDate(-2), dentist: k, priority: 'Routine', status: 'Completed', result: 'No interproximal radiolucency. Crestal bone within normal limits. Demonstration report only — not a diagnostic image interpretation.' },
    { id: 'INV-0003', patientId: 'DEN-P-0003', encounterId: 'ENC-0003', type: 'Panoramic radiograph', indication: 'Assess 38 position', requestedDate: today, dentist: k, priority: 'Urgent', status: 'Scheduled', result: '' },
  ];

  const referrals: DentalReferral[] = [
    { id: 'REF-0001', patientId: 'DEN-P-0003', encounterId: 'ENC-0003', destination: 'Oral and Maxillofacial Surgery', reason: 'Possible surgical extraction of impacted 38', findings: 'Recurrent pericoronitis, mesioangular impaction suspected.', urgency: 'Soon', notes: 'Sulfa allergy. Demonstration referral only.', status: 'Sent', date: today, dentist: k },
    { id: 'REF-0002', patientId: 'DEN-P-0006', encounterId: '', destination: 'Endodontics', reason: 'Complex root canal 46', findings: 'Irreversible pulpitis, curved mesial canals suspected.', urgency: 'Soon', notes: 'Latex allergy.', status: 'Draft', date: isoDate(-3), dentist: y },
  ];

  const followUps: DentalFollowUp[] = [
    { id: 'FU-0001', patientId: 'DEN-P-0001', encounterId: 'ENC-0001', procedureId: '', dueDate: isoDate(-1), reason: 'Book restoration of 16', dentist: y, status: 'Upcoming', notes: 'Patient has not yet booked the filling.', appointmentId: '' },
    { id: 'FU-0002', patientId: 'DEN-P-0002', encounterId: '', procedureId: 'PRC-0001', dueDate: isoDate(3), reason: 'Review gingival healing after scaling', dentist: y, status: 'Upcoming', notes: '', appointmentId: '' },
    { id: 'FU-0003', patientId: 'DEN-P-0008', encounterId: '', procedureId: 'PRC-0005', dueDate: today, reason: 'Socket review after extraction of 28', dentist: k, status: 'Upcoming', notes: 'Appointment booked this afternoon.', appointmentId: 'APT-0009' },
    { id: 'FU-0004', patientId: 'DEN-P-0010', encounterId: '', procedureId: 'PRC-0004', dueDate: isoDate(1), reason: 'Fluoride recall', dentist: y, status: 'Upcoming', notes: '', appointmentId: 'APT-0014' },
  ];

  const services: DentalService[] = [
    { id: 'SRV-0001', name: 'Consultation', category: 'Examination', description: 'New or review dental consultation.', durationMin: 30, price: 8000, active: true },
    { id: 'SRV-0002', name: 'Dental cleaning', category: 'Prevention', description: 'Scaling and polishing.', durationMin: 40, price: 15000, active: true },
    { id: 'SRV-0003', name: 'Tooth extraction', category: 'Surgery', description: 'Simple extraction under local anaesthesia.', durationMin: 40, price: 20000, active: true },
    { id: 'SRV-0004', name: 'Dental filling', category: 'Restoration', description: 'Composite or amalgam restoration.', durationMin: 45, price: 25000, active: true },
    { id: 'SRV-0005', name: 'Root canal treatment', category: 'Endodontics', description: 'Single-tooth root canal, illustrative fee.', durationMin: 90, price: 80000, active: true },
    { id: 'SRV-0006', name: 'Dental X-ray', category: 'Investigation', description: 'Intraoral periapical or bitewing radiograph.', durationMin: 15, price: 5000, active: true },
    { id: 'SRV-0007', name: 'Crown placement', category: 'Prosthodontics', description: 'Single crown, illustrative fee.', durationMin: 60, price: 120000, active: true },
    { id: 'SRV-0008', name: 'Fluoride application', category: 'Prevention', description: 'Topical fluoride varnish.', durationMin: 15, price: 5000, active: true },
    { id: 'SRV-0009', name: 'Denture fitting', category: 'Prosthodontics', description: 'Partial denture review and fit.', durationMin: 45, price: 90000, active: true },
    { id: 'SRV-0010', name: 'Periodontal treatment', category: 'Periodontics', description: 'Non-surgical periodontal therapy, one sextant.', durationMin: 45, price: 30000, active: false },
  ];

  const inventory: InventoryItem[] = [
    { id: 'STK-0001', name: 'Examination gloves (nitrile)', category: 'PPE', code: 'GLV-NIT-M', quantity: 24, unit: 'boxes', reorderLevel: 10, expiry: isoDate(400), location: 'Store A' },
    { id: 'STK-0002', name: 'Surgical masks', category: 'PPE', code: 'MSK-SUR', quantity: 18, unit: 'boxes', reorderLevel: 8, expiry: isoDate(500), location: 'Store A' },
    { id: 'STK-0003', name: 'Lidocaine 2% cartridges', category: 'Anaesthetic', code: 'LA-LIDO-2', quantity: 6, unit: 'boxes', reorderLevel: 8, expiry: isoDate(120), location: 'Clinic fridge' },
    { id: 'STK-0004', name: 'Composite resin A2', category: 'Restorative', code: 'CMP-A2', quantity: 3, unit: 'syringes', reorderLevel: 4, expiry: isoDate(200), location: 'Chair 1 drawer' },
    { id: 'STK-0005', name: 'Diamond burs (assorted)', category: 'Instruments', code: 'BUR-DIA', quantity: 40, unit: 'pieces', reorderLevel: 15, expiry: '', location: 'Sterile store' },
    { id: 'STK-0006', name: 'Alginate impression material', category: 'Impression', code: 'IMP-ALG', quantity: 5, unit: 'tubs', reorderLevel: 2, expiry: isoDate(45), location: 'Store B' },
    { id: 'STK-0007', name: 'Sterilisation pouches', category: 'Sterilisation', code: 'STE-PCH', quantity: 200, unit: 'pieces', reorderLevel: 50, expiry: isoDate(700), location: 'CSSD shelf' },
    { id: 'STK-0008', name: 'High-volume suction tips', category: 'Consumable', code: 'SUC-HVE', quantity: 0, unit: 'packs', reorderLevel: 4, expiry: isoDate(300), location: 'Store A' },
    { id: 'STK-0009', name: 'Fluoride varnish', category: 'Prevention', code: 'FL-VAR', quantity: 9, unit: 'tubes', reorderLevel: 3, expiry: isoDate(60), location: 'Paediatric cupboard' },
    { id: 'STK-0010', name: 'Gauze packs', category: 'Consumable', code: 'GAU-5', quantity: 30, unit: 'packs', reorderLevel: 10, expiry: isoDate(800), location: 'Store A' },
    { id: 'STK-0011', name: 'Etchant gel', category: 'Restorative', code: 'ETC-37', quantity: 2, unit: 'syringes', reorderLevel: 2, expiry: isoDate(20), location: 'Chair 3 drawer' },
    { id: 'STK-0012', name: 'Articulating paper', category: 'Consumable', code: 'ART-PPR', quantity: 12, unit: 'books', reorderLevel: 4, expiry: '', location: 'Each chair' },
  ];

  const documents: DentalDocument[] = [
    { id: 'DOC-0001', patientId: 'DEN-P-0001', name: 'Consent discussion note', kind: 'Note', date: isoDate(-1), note: 'Restoration options discussed. Demonstration document.' },
    { id: 'DOC-0002', patientId: 'DEN-P-0008', name: 'Post-extraction advice', kind: 'Instruction', date: isoDate(-10), note: 'Printed advice given to patient.' },
  ];

  return syncPatientDates({
    patients,
    appointments,
    chairs,
    charts,
    encounters,
    plans,
    procedures,
    prescriptions,
    investigations,
    referrals,
    followUps,
    services,
    inventory,
    documents,
  }, today);
}
