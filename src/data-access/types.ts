import { z } from 'zod';

// ---- shared primitives ----
export const Id = z.string();
export const Timestamps = z.object({
  id: Id,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
});
export type WithMeta<T> = T & z.infer<typeof Timestamps>;

export const Query = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(50),
  search: z.string().optional(),
  sort: z.string().optional(),
  filters: z.record(z.any()).optional(),
});
export type Query = z.infer<typeof Query>;
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- enums (mirror existing union types in billingData.ts) ----
export const PaymentStatus = z.enum(['UNPAID', 'PENDING', 'PAID', 'FAILED', 'PARTIAL']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const PaymentChannel = z.enum([
  'POS Card', 'Cash', 'Bank Transfer', 'SMS Pay Link', 'USSD', 'Online Card', 'Wallet', 'NHIA', 'HMO',
]);
export type PaymentChannel = z.infer<typeof PaymentChannel>;

export const Role = z.enum([
  'superadmin', 'admin', 'staff', 'student', 'patient', 'cmd', 'board', 'finance', 'hr', 'doctor', 'it',
  'nurse', 'pharmacist', 'lab', 'radiology', 'psychology', 'cap', 'addiction', 'psychogeriatrics',
  'physiotherapy', 'speech', 'nutrition', 'socialwork', 'icu', 'cashier', 'records',
]);
export type Role = z.infer<typeof Role>;

// ---- Patient / Person (canonical = PERSONS table on backend) ----
export const PatientCreate = z.object({
  /** Display name; prefer firstName + lastName when available. */
  name: z.string().min(2),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleName: z.string().optional(),
  /** Backend PERSON_ID when synced from API. */
  personId: z.number().optional(),
  nin: z.string().optional(),
  nhia: z.string().optional(),
  phone: z.string().min(7),
  sex: z.enum(['Male', 'Female']),
  dob: z.string().optional(),
  age: z.number().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  insurance: z.enum(['NHIS', 'Private', 'HMO', 'None']).default('None'),
  nextOfKin: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string(),
  }).optional(),
  source: z.enum(['Walk-in', 'Online', 'Referral', 'Emergency']).default('Walk-in'),
  maritalStatus: z.string().optional(),
  religion: z.string().optional(),
  stateOfOrigin: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().optional(),
});
export type PatientCreate = z.infer<typeof PatientCreate>;

export interface Patient extends z.infer<typeof PatientCreate> {
  id: string;
  hospitalId: string;
  ninVerified?: boolean;
  flags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- Visit / Invoice / Payment (field-compatible with billingData.ts) ----
export interface Visit {
  id: string;
  visitCode: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  type: 'OPD' | 'Surgery' | 'Maternity' | 'Pediatric' | 'Emergency';
  triagePriority: 'Routine' | 'Urgent' | 'Emergency';
  attendingDoctor: string;
  consultationFee: number;
  invoiceId: string;
  paymentStatus: PaymentStatus;
  consultationUnlocked: boolean;
  emergencyOverride?: { doctor: string; reason: string; timestamp: string; reviewed: boolean };
  createdAt: string;
}

export interface InvoiceLine {
  desc: string;
  qty: number;
  unitPrice: number;
  source: string;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  visitCode: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  phone: string;
  department: string;
  lines?: InvoiceLine[];
  amount: number;
  amountPaid: number;
  balance: number;
  status: PaymentStatus;
  channelsActive: PaymentChannel[];
  channelUsed?: PaymentChannel;
  ussdCode: string;
  smsSent: boolean;
  virtualAccount: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  ref: string;
  invoiceId: string;
  patientName: string;
  channel: PaymentChannel;
  amount: number;
  status: PaymentStatus;
  posTerminal?: string;
  bankRef?: string;
  cashier?: string;
  timestamp: string;
  matched: boolean;
}

// ---- Cross-module glue ----
export interface LabOrderMeta {
  patientName: string;
  age: number;
  gender: 'Male' | 'Female';
  hospitalNo: string;
  department: string;
  ward?: string;
  source: 'Doctor' | 'Walk-In';
  priority: 'Routine' | 'Urgent' | 'Stat';
  paymentType?: 'Cash' | 'POS' | 'Transfer' | 'Wallet' | 'NHIA' | 'HMO';
  paymentRef?: string;
  cashier?: string;
  nhia?: { number?: string; authCode?: string; copay?: number; approvedBy?: string };
  hmo?: { name?: string; authCode?: string; approvedBy?: string };
  sampleId?: string;
  rejectReason?: string;
  clinicalNote?: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export interface Order {
  id: string;
  patientId: string;
  visitId?: string;
  kind: 'lab' | 'drug' | 'imaging';
  items: { code: string; name: string; price: number; covered?: boolean }[];
  status: string;
  invoiceId?: string;
  orderedBy: string;
  createdAt: string;
  updatedAt: string;
  labMeta?: LabOrderMeta;
}

export interface Referral {
  id: string;
  patientId: string;
  fromDept: string;
  toDept: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED';
  acceptedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  entity?: string;
  entityId?: string;
  invoiceRef?: string;
  channel?: PaymentChannel;
  at: string;
}

export interface SyncEvent {
  id: string;
  type: string;
  module: string;
  target: 'EMR' | 'NHIS' | 'NIBSS' | 'NPHCDA';
  status: 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'RETRY' | 'FAILED' | 'DEAD_LETTER';
  retryCount: number;
  maxRetries: number;
  hmsRef: string;
  patientId?: string;
  createdAt: string;
}

// =====================================================================
// WARD / BED / ADMISSION — shared single source of truth for the
// Admission module AND the Nursing module (bed writes emit BED_TRANSFER).
// =====================================================================
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'ISOLATION' | 'RESERVED' | 'OUT_OF_SERVICE';

export interface Ward {
  id: string;
  name: string;
  type: 'Psychiatric' | 'ICU' | 'Child' | 'Psychogeriatric' | 'Addiction' | 'General' | 'Rehab';
  capacity: number;
}

export interface Bed {
  id: string;
  wardId: string;
  wardName: string;
  label: string;
  status: BedStatus;
  patientId?: string;
  isIsolation?: boolean;
  isIcu?: boolean;
  updatedAt: string;
}

export type AdmissionStatus =
  | 'PENDING' | 'BED_ALLOCATED' | 'ADMITTED' | 'ON_LEAVE' | 'DISCHARGE_ORDERED' | 'DISCHARGED' | 'CANCELLED';

export interface Admission {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  wardId?: string;
  wardName?: string;
  bedId?: string;
  bedLabel?: string;
  diagnosis: string;
  consultant: string;
  assignedNurse?: string;
  admittedAt: string;
  type: 'Psychiatric' | 'ICU' | 'Child' | 'Psychogeriatric' | 'Addiction' | 'General' | 'Rehab';
  status: AdmissionStatus;
  supervisionLevel?: 'General' | 'Close' | 'Constant';
  dischargeOrder?: { by: string; at: string; reason?: string };
  audit: { action: string; by: string; at: string; note?: string }[];
  updatedAt: string;
}

// =====================================================================
// NURSING clinical records — all keyed by admissionId + patientId.
// =====================================================================
export interface Vital {
  id: string;
  admissionId: string;
  patientId: string;
  temp?: number;
  pulse?: number;
  resp?: number;
  bpSys?: number;
  bpDia?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodSugar?: number;
  painScore?: number;
  gcs?: number;
  abnormal: boolean;
  flags: string[];
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export type MarStatus = 'DUE' | 'GIVEN' | 'MISSED' | 'REFUSED' | 'HELD' | 'PENDING';

export interface MarEntry {
  id: string;
  admissionId: string;
  patientId: string;
  orderId?: string;          // links to db.orders (kind:'drug') from doctor
  drug: string;
  dose: string;
  route: string;
  frequency: string;
  scheduledTime: string;
  kind: 'Scheduled' | 'PRN' | 'Emergency' | 'External';
  status: MarStatus;
  reason?: string;
  sideEffects?: string;
  pharmacyDispensed?: boolean;
  administeredBy?: string;
  administeredAt?: string;
  updatedAt: string;
}

export type NursingNoteType =
  | 'General' | 'Shift' | 'Incident' | 'Progress' | 'MentalHealth'
  | 'Emergency' | 'WoundCare' | 'Medication' | 'Discharge';

export interface NursingNote {
  id: string;
  admissionId: string;
  patientId: string;
  type: NursingNoteType;
  format: 'Narrative' | 'SOAP' | 'DAR';
  body: string;
  authorBy: string;
  createdAt: string;
  edits?: { by: string; at: string }[];
}

export interface CarePlanEntry {
  id: string;
  admissionId: string;
  patientId: string;
  diagnosis: string;
  problem: string;
  goal: string;
  intervention: string;
  actionTaken?: string;
  evaluation?: string;
  reviewDate?: string;
  status: 'active' | 'ongoing' | 'resolved';
  linkedOrderId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type NursingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'ESCALATED';

export interface NursingTask {
  id: string;
  admissionId?: string;
  patientId?: string;
  patientName?: string;
  title: string;
  category: 'Vitals' | 'Medication' | 'Sample' | 'Procedure' | 'Round' | 'Discharge' | 'Monitoring' | 'Feeding' | 'Dressing' | 'Other';
  status: NursingTaskStatus;
  dueAt?: string;
  sourceOrderId?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  admissionId: string;
  patientId: string;
  chart: 'Observation' | 'Psychiatric' | 'Seclusion' | 'Restraint' | 'Turning' | 'IntakeOutput' | 'ICU';
  interval?: '15min' | '30min' | 'hourly' | '2hourly';
  fields: Record<string, string | number>;
  recordedBy: string;
  recordedAt: string;
}

export interface IntakeOutputEntry {
  id: string;
  admissionId: string;
  patientId: string;
  kind: 'intake' | 'output';
  category: string;
  volumeMl: number;
  recordedBy: string;
  recordedAt: string;
}

export interface Handover {
  id: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
  wardId?: string;
  wardName?: string;
  summary: string;
  criticalPatients: string[];
  pendingMeds: string;
  pendingLabs: string;
  incidents: string;
  specialInstructions: string;
  handedOverBy: string;
  receivedBy?: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface Incident {
  id: string;
  admissionId?: string;
  patientId?: string;
  patientName?: string;
  type: 'Fall' | 'MedicationError' | 'Aggression' | 'Absconding' | 'Injury' | 'EquipmentFailure' | 'Emergency' | 'Death' | 'Security' | 'NeedleStick' | 'Other';
  description: string;
  actionTaken: string;
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  status: 'REPORTED' | 'ESCALATED' | 'REVIEWED' | 'CLOSED';
  reportedBy: string;
  supervisorReview?: { by: string; at: string; note?: string };
  createdAt: string;
}

export interface PatientEducationRecord {
  id: string;
  admissionId: string;
  patientId: string;
  topics: string[];
  detail: string;
  understood: boolean;
  educatedBy: string;
  createdAt: string;
}

// ---- Schema-driven nursing forms (the 35+ digital forms; Super-Admin configurable) ----
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'time' | 'signature';
  options?: string[];
  required?: boolean;
  showIf?: { key: string; equals: string };   // conditional field
  section?: string;
}

export interface NursingFormTemplate {
  id: string;
  code: string;
  title: string;
  category: 'Assessment' | 'Chart' | 'Procedure' | 'Psychiatry' | 'Discharge' | 'Safety' | 'General';
  fields: FormField[];
  active: boolean;
  version: number;
  updatedAt: string;
}

export interface NursingFormInstance {
  id: string;
  templateId: string;
  templateCode: string;
  templateTitle: string;
  admissionId?: string;
  patientId: string;
  values: Record<string, string | number | boolean>;
  signedBy: string;
  status: 'DRAFT' | 'SIGNED';
  version: number;
  createdAt: string;
  updatedAt: string;
  history: { by: string; at: string; action: string }[];
}

// =====================================================================
// CASHIER MODULE — wallet, refunds, discounts, shift closing.
// Builds on the existing billing spine (db.invoices / db.payments).
// =====================================================================
export type WalletTxnKind = 'DEPOSIT' | 'PAYMENT' | 'REFUND' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'REVERSAL';

export interface WalletAccount {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTxn {
  id: string;
  walletId: string;
  patientId: string;
  kind: WalletTxnKind;
  amount: number;
  balanceAfter: number;
  method?: PaymentChannel;
  ref: string;
  invoiceId?: string;
  note?: string;
  by: string;
  at: string;
}

export type RefundStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type RefundMethod = 'Cash' | 'POS Card' | 'Bank Transfer' | 'Wallet';

export interface RefundRequest {
  id: string;
  paymentId?: string;
  invoiceId?: string;
  patientId: string;
  patientName: string;
  amount: number;
  kind: 'REFUND' | 'REVERSAL';
  reason: string;
  method: RefundMethod;
  document?: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type DiscountKind = 'PERCENT' | 'FIXED' | 'WAIVER';

export interface DiscountRequest {
  id: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  kind: DiscountKind;
  value: number;            // percent (0-100) or fixed amount; ignored for WAIVER
  computedAmount: number;    // resolved naira value applied
  category: 'Percentage' | 'Fixed' | 'Full Waiver' | 'Staff' | 'Welfare' | 'Emergency Exemption';
  reason: string;
  status: DiscountStatus;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ShiftStatus = 'OPEN' | 'CLOSED' | 'APPROVED';

export interface CashierShift {
  id: string;
  cashier: string;
  openingFloat: number;
  openedAt: string;
  closedAt?: string;
  status: ShiftStatus;
  // channel totals captured during the shift
  totals: { cash: number; pos: number; transfer: number; online: number; wallet: number; nhia: number; hmo: number };
  refundsTotal: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  note?: string;
  approvedBy?: string;
}

// =====================================================================
// RADIOLOGY & ECG MODULE (RIS) — request → schedule → acquire → report
// → verify → release, with billing gate, ECG, equipment, consumables,
// forms and critical-findings workflow. Builds on db.orders (kind:imaging)
// and the billing spine (db.invoices/db.payments).
// =====================================================================
export type RadModality =
  | 'X-Ray' | 'Ultrasound' | 'CT Scan' | 'MRI' | 'ECG' | 'EEG'
  | 'Mammography' | 'Fluoroscopy' | 'Echocardiography' | 'Portable';

export type RadPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export type RadRequestStatus =
  | 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'AWAITING_PAYMENT' | 'PAID'
  | 'SCHEDULED' | 'IN_PROGRESS' | 'IMAGING_DONE'
  | 'REPORT_PENDING' | 'REPORTED' | 'VERIFIED' | 'RELEASED' | 'CANCELLED';

export interface RadPrep {
  fasting?: boolean;
  contrastConsent?: boolean;
  metalRemoved?: boolean;
  pregnancyChecked?: boolean;
  ivAccess?: boolean;
  sedationRequired?: boolean;
  wheelchair?: boolean;
  status: 'READY' | 'PENDING' | 'NOT_REQUIRED';
}

export interface RadSafety {
  pregnancy?: 'YES' | 'NO' | 'UNKNOWN' | 'N/A';
  creatinine?: number;        // pulled from Lab where available
  weightKg?: number;
  heightCm?: number;
  implants?: boolean;
  pacemaker?: boolean;
  metalObjects?: boolean;
  allergies?: string;
  consent?: boolean;
}

export interface ImagingRequest {
  id: string;
  orderId?: string;            // links db.orders (kind:'imaging') from doctor
  patientId: string;
  patientName: string;
  hospitalId: string;
  modality: RadModality;
  region: string;
  clinic: string;
  ward?: string;
  requestedBy: string;
  priority: RadPriority;
  source: 'Doctor' | 'Emergency' | 'Ward' | 'ICU' | 'Theatre' | 'Walk-in' | 'External';
  indication: string;
  clinicalNotes?: string;
  status: RadRequestStatus;
  invoiceId?: string;
  paymentStatus: PaymentStatus;
  amount: number;
  portable?: boolean;
  machineId?: string;
  radiographer?: string;
  scheduledAt?: string;
  arrivalAt?: string;
  studyUid?: string;
  contrastUsed?: boolean;
  radiationDose?: number;
  prep: RadPrep;
  safety: RadSafety;
  createdAt: string;
  updatedAt: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export type RadReportStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'RELEASED' | 'RETURNED';

export interface RadiologyReport {
  id: string;
  requestId: string;
  patientId: string;
  patientName: string;
  modality: RadModality;
  technique?: string;
  findings: string;
  impression: string;
  recommendations?: string;
  comparison?: string;
  template?: string;
  status: RadReportStatus;
  critical: boolean;
  criticalFinding?: string;
  aiAssisted?: boolean;
  aiSummary?: string;
  reportedBy: string;
  verifiedBy?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export type EcgType = 'Resting' | 'Stress' | 'Holter' | 'Telemetry' | '12-Lead' | '15-Lead' | 'Right-sided';

export interface EcgStudy {
  id: string;
  requestId?: string;
  patientId: string;
  patientName: string;
  type: EcgType;
  clinicalHistory?: string;
  measurements: {
    heartRate?: number; rhythm?: string; prInterval?: number; qrsDuration?: number;
    qtInterval?: number; qtc?: number; axis?: string;
    stElevation?: boolean; stDepression?: boolean;
  };
  machineInterpretation?: string;
  cardiologistInterpretation?: string;
  impression?: string;
  recommendations?: string;
  status: RadReportStatus;
  abnormal: boolean;
  critical: boolean;
  reportedBy?: string;
  verifiedBy?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
}

export type EquipmentStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'CALIBRATION';

export interface RadEquipment {
  id: string;
  name: string;
  modality: RadModality;
  room: string;
  status: EquipmentStatus;
  usageHours: number;
  lastService?: string;
  nextService?: string;
  faultNote?: string;
  serviceContract?: string;
}

export interface RadConsumable {
  id: string;
  name: string;
  category: 'Contrast' | 'Film' | 'Paper' | 'ECG Electrode' | 'Ultrasound Gel' | 'Printer Ink' | 'Cleaning' | 'Other';
  stock: number;
  unit: string;
  reorderLevel: number;
  lotNumber?: string;
  expiry?: string;
}

export interface RadFormInstance {
  id: string;
  type: string;               // one of the standardized radiology forms
  requestId?: string;
  patientId: string;
  patientName: string;
  values: Record<string, string | number | boolean>;
  signedBy: string;
  createdAt: string;
}

// =====================================================================
// PSYCHIATRIC OPC (Out-Patient Clinic) — encounter/queue, assessments,
// MSE, diagnosis, notes, treatment plans, risk, admission requests,
// referrals and follow-up appointments. Reuses db.orders (lab/drug/imaging)
// and the billing spine (db.invoices) for cross-module integration.
// =====================================================================
export type OpcVisitType = 'New' | 'Returning' | 'Follow-up' | 'Emergency';
export type OpcPayer = 'Cash' | 'NHIS' | 'HMO' | 'Private';
export type OpcPriority = 'Normal' | 'Urgent' | 'Crisis' | 'Emergency';
export type OpcVisitStatus =
  | 'WAITING' | 'WITH_NURSE' | 'WITH_DOCTOR' | 'AWAITING_LAB'
  | 'AWAITING_PHARMACY' | 'COMPLETED' | 'REFERRED' | 'FOR_ADMISSION';

export interface OpcVisit {
  id: string;
  patientId: string;
  patientName: string;
  hospitalId: string;
  visitType: OpcVisitType;
  payer: OpcPayer;
  priority: OpcPriority;
  status: OpcVisitStatus;
  assignedDoctor?: string;
  clinic: string;
  reason?: string;
  checkInAt: string;
  createdAt: string;
  updatedAt: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export type PsychAssessmentType =
  | 'Initial Psychiatric Assessment' | 'Follow-up Psychiatric Assessment' | 'Mental Status Examination'
  | 'Risk Assessment' | 'Suicide/Self-harm Screening' | 'Violence/Aggression Risk' | 'Substance Use Assessment'
  | 'Sleep Assessment' | 'Mood Assessment' | 'Psychosis Assessment' | 'Anxiety Assessment'
  | 'Cognitive Assessment' | 'Child/Adolescent Assessment' | 'Geriatric Assessment' | 'Forensic Assessment'
  | 'Drug Adherence Assessment' | 'Medication Side Effect Assessment' | 'Psychosocial Assessment';

export interface PsychAssessment {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  type: PsychAssessmentType;
  values: Record<string, string | number | boolean>;
  summary?: string;
  by: string;
  createdAt: string;
}

export type PsychDxType = 'Primary' | 'Secondary' | 'Provisional' | 'Differential';
export type PsychDxStatus = 'Active' | 'Inactive';

export interface PsychDiagnosis {
  id: string;
  patientId: string;
  patientName: string;
  code: string;               // ICD-10/11
  label: string;
  category: string;
  type: PsychDxType;
  status: PsychDxStatus;
  by: string;
  createdAt: string;
  updatedAt: string;
  history: { action: string; by: string; at: string }[];
}

export type PsychNoteType = 'Consultation' | 'SOAP' | 'Progress' | 'Follow-up' | 'Emergency' | 'Discharge Planning' | 'Ward Referral';

export interface PsychNote {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  type: PsychNoteType;
  content: string;
  status: 'DRAFT' | 'FINAL';
  confidential?: boolean;
  by: string;
  createdAt: string;
  updatedAt: string;
  history: { action: string; by: string; at: string }[];
}

export interface OpcTreatmentPlan {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  medicationPlan?: string;
  psychotherapyPlan?: string;
  psychoeducation?: string;
  behaviouralPlan?: string;
  familyPlan?: string;
  socialPlan?: string;
  crisisPlan?: string;
  followUpDate?: string;
  admissionRecommended?: boolean;
  by: string;
  createdAt: string;
}

export type OpcRiskLevel = 'None' | 'Low' | 'Moderate' | 'High';

export interface OpcRiskAssessment {
  id: string;
  patientId: string;
  patientName: string;
  visitId?: string;
  selfHarm: OpcRiskLevel;
  harmToOthers: OpcRiskLevel;
  absconding: OpcRiskLevel;
  neglect: OpcRiskLevel;
  substance: OpcRiskLevel;
  vulnerableFlag: boolean;
  crisisAlert: boolean;
  safetyPlan?: string;
  by: string;
  createdAt: string;
}

export type OpcAdmissionStatus = 'PENDING' | 'AWAITING_BILLING' | 'AWAITING_BED' | 'APPROVED' | 'ADMITTED' | 'DECLINED';

export interface OpcAdmissionRequest {
  id: string;
  patientId: string;
  patientName: string;
  ward: string;
  reason: string;
  priority: OpcPriority;
  status: OpcAdmissionStatus;
  by: string;
  createdAt: string;
  updatedAt: string;
  audit: { action: string; by: string; at: string; note?: string }[];
}

export type OpcReferralTarget = 'Psychology' | 'Social Welfare';
export type OpcReferralStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED';

export interface OpcReferral {
  id: string;
  patientId: string;
  patientName: string;
  to: OpcReferralTarget;
  category: string;           // e.g. CBT, Family therapy, Financial support
  reason: string;
  status: OpcReferralStatus;
  by: string;
  createdAt: string;
  updatedAt: string;
}

export type OpcAppointmentStatus = 'SCHEDULED' | 'ATTENDED' | 'MISSED' | 'RESCHEDULED' | 'CANCELLED';

export interface OpcAppointment {
  id: string;
  patientId: string;
  patientName: string;
  doctor: string;
  date: string;
  reason?: string;
  status: OpcAppointmentStatus;
  createdAt: string;
  updatedAt: string;
}
