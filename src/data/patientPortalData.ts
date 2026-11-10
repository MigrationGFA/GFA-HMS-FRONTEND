// Patient self-service portal data — for John Doe (GFA HMS/2026/00145)
export const PATIENT_ID = 'GFA HMS/2026/00145';
export const PATIENT_NAME = 'John Doe';
export const PATIENT_PHONE = '+234 801 234 5678';

export interface MedicalRecord {
  id: string;
  date: string;
  visitId: string;
  type: 'Consultation' | 'Admission' | 'Procedure' | 'Discharge';
  department: string;
  doctor: string;
  diagnosis: string;
  summary: string;
  treatment: string;
  sensitive?: boolean; // doctor-restricted
  emrSync: 'SYNCED' | 'PENDING' | 'FAILED';
}

export const medicalRecords: MedicalRecord[] = [
  { id: 'MR-2026-014', date: '2026-04-28', visitId: 'VIS-2026-0451', type: 'Consultation', department: 'Internal Medicine', doctor: 'Dr. Emeka Okafor',
    diagnosis: 'Uncomplicated Malaria', summary: 'Presented with fever, headache, body weakness for 3 days. BP 120/80, Temp 38.9°C.',
    treatment: 'Coartem 80/480mg, Paracetamol 500mg. Advised plenty of fluids, rest.', emrSync: 'SYNCED' },
  { id: 'MR-2026-009', date: '2026-03-25', visitId: 'VIS-2026-0312', type: 'Admission', department: 'Surgery', doctor: 'Dr. Adewale Ogunleye',
    diagnosis: 'Acute Appendicitis', summary: 'Admitted via A&E. Appendectomy performed under GA, no complications.',
    treatment: 'IV Ceftriaxone 1g BD x 5/7, Paracetamol PRN. Discharged on POD3.', emrSync: 'SYNCED' },
  { id: 'MR-2026-007', date: '2026-02-14', visitId: 'VIS-2026-0188', type: 'Consultation', department: 'Cardiology', doctor: 'Dr. Ngozi Ikedife',
    diagnosis: 'Hypertension (Stage 1)', summary: 'Routine check. BP 142/92. ECG normal sinus rhythm.',
    treatment: 'Amlodipine 5mg OD. Lifestyle counselling. Review in 4 weeks.', sensitive: false, emrSync: 'SYNCED' },
  { id: 'MR-2025-031', date: '2025-11-09', visitId: 'VIS-2025-1102', type: 'Procedure', department: 'Radiology', doctor: 'Dr. Aisha Bello',
    diagnosis: 'Right Knee Pain (Investigation)', summary: 'MRI Right Knee — mild medial meniscus sprain, no tear.',
    treatment: 'Physiotherapy referral, NSAIDs PRN.', emrSync: 'PENDING' },
];

export type NotificationKind = 'appointment' | 'payment' | 'lab' | 'prescription' | 'security' | 'consent';
export interface PatientNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  at: string;
  read: boolean;
  channel: ('In-App' | 'SMS' | 'Email')[];
  link?: string;
}

export const patientNotifications: PatientNotification[] = [
  { id: 'N-1', kind: 'lab', title: 'Lab Result Ready', message: 'Your Malaria Parasite test result has been verified and released.', at: '2026-04-28 10:05', read: false, channel: ['In-App', 'SMS'], link: '/dashboard/patient/lab' },
  { id: 'N-2', kind: 'payment', title: 'Outstanding Bill Reminder', message: 'Invoice GFA HMS-INV-1001 has a balance of ₦8,000. Please complete payment.', at: '2026-04-28 08:00', read: false, channel: ['In-App', 'SMS'], link: '/dashboard/patient/invoices' },
  { id: 'N-3', kind: 'appointment', title: 'Appointment Reminder', message: 'You have a Cardiology follow-up on 2026-05-02 at 10:30 with Dr. Ngozi Ikedife.', at: '2026-04-27 18:00', read: true, channel: ['In-App', 'SMS', 'Email'], link: '/dashboard/patient/history' },
  { id: 'N-4', kind: 'prescription', title: 'Refill Available', message: 'Your Amlodipine 5mg prescription is due for refill on 2026-05-12.', at: '2026-04-26 09:00', read: true, channel: ['In-App'], link: '/dashboard/patient/prescriptions' },
  { id: 'N-5', kind: 'security', title: 'New Device Sign-in', message: 'A new sign-in was detected from Lagos (Chrome, Android). If this wasn\'t you, secure your account.', at: '2026-04-25 21:14', read: true, channel: ['In-App', 'SMS'], link: '/dashboard/patient/profile' },
  { id: 'N-6', kind: 'consent', title: 'Consent Updated', message: 'You granted Dr. Okafor temporary access to your discharge summary.', at: '2026-04-24 14:21', read: true, channel: ['In-App'] },
];

export interface ConsentItem {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  category: 'sharing' | 'usage' | 'download';
}

export const defaultConsents: ConsentItem[] = [
  { id: 'c1', category: 'sharing', label: 'Share records with referred doctors', description: 'Allow specialists you are referred to within GFA HMS to view your records.', enabled: true },
  { id: 'c2', category: 'sharing', label: 'Share with external hospitals (on request)', description: 'Generate a one-time secure link for external providers.', enabled: false },
  { id: 'c3', category: 'usage', label: 'Anonymous data for medical research', description: 'Identifiers removed. Used for teaching & research at GFA HMS.', enabled: true },
  { id: 'c4', category: 'usage', label: 'NHIS / HMO claim verification', description: 'Allow finance to verify your claims with insurers.', enabled: true },
  { id: 'c5', category: 'download', label: 'Allow PDF download of records', description: 'You may download a watermarked copy of your medical history.', enabled: true },
  { id: 'c6', category: 'download', label: 'SMS pay link for invoices', description: 'Receive secure payment links via SMS for outstanding bills.', enabled: true },
];

export interface AccessLogEntry {
  id: string;
  at: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ip?: string;
  device?: string;
}

export const accessLogs: AccessLogEntry[] = [
  { id: 'L-1', at: '2026-04-28 10:05', actor: 'System', role: 'EMR Sync', action: 'Released lab result to dashboard', resource: 'LAB-2026-001' },
  { id: 'L-2', at: '2026-04-28 09:18', actor: 'Dr. Emeka Okafor', role: 'Doctor', action: 'Viewed clinical history', resource: 'VIS-2026-0451' },
  { id: 'L-3', at: '2026-04-28 09:05', actor: 'Mrs. Hafsat Bello', role: 'Cashier', action: 'Created invoice', resource: 'GFA HMS-INV-1001' },
  { id: 'L-4', at: '2026-04-25 21:14', actor: 'You', role: 'Patient', action: 'Signed in (new device)', resource: 'Session', ip: '102.89.34.12', device: 'Chrome / Android' },
  { id: 'L-5', at: '2026-04-24 14:21', actor: 'You', role: 'Patient', action: 'Granted record access', resource: 'Discharge Summary MR-2026-009' },
  { id: 'L-6', at: '2026-04-20 08:42', actor: 'Records Officer', role: 'Records', action: 'Updated demographics', resource: 'Profile' },
];

export interface PatientDevice {
  id: string;
  name: string;
  lastSeen: string;
  location: string;
  current: boolean;
}

export const patientDevices: PatientDevice[] = [
  { id: 'D-1', name: 'Chrome on Windows', lastSeen: '2026-04-28 11:02', location: 'Lagos, Ogun', current: true },
  { id: 'D-2', name: 'Safari on iPhone', lastSeen: '2026-04-26 19:40', location: 'Lagos, Ogun', current: false },
  { id: 'D-3', name: 'Chrome on Android', lastSeen: '2026-04-25 21:14', location: 'Lagos', current: false },
];
