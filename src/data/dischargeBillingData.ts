// Patient Billing & Discharge Management data — for Finance > Discharge & Billing page

export type DischargeBillStatus = 'Fully Paid' | 'Partially Paid' | 'Unpaid' | 'Discharged (Not Paid)';
export type DischargeStatus = 'Admitted' | 'Discharged';

export interface DischargeBillService {
  name: string;
  price: number;
}

export interface DischargeBillRecord {
  id: string;
  patientName: string;
  hospitalId: string;
  phone: string;
  diagnosis: string;
  department: string;
  ward?: string;
  services: DischargeBillService[];
  staffHandled: string;        // who clocked patient in / handled the patient
  staffRole: string;
  totalBill: number;
  totalPaid: number;
  balance: number;
  nhisCoverage: number;
  paymentChannel?: 'Cash' | 'Transfer' | 'Online' | 'NHIS' | 'Mixed';
  dischargeStatus: DischargeStatus;
  admittedDate: string;
  dischargedDate?: string;
  status: DischargeBillStatus;
}

export const dischargeBillRecords: DischargeBillRecord[] = [
  {
    id: 'DB001', patientName: 'John Doe', hospitalId: 'GFA HMS/2026/00145', phone: '08012345678',
    diagnosis: 'Acute Appendicitis — Post-op recovery', department: 'Surgery', ward: 'Ward A · Bed 12',
    services: [
      { name: 'Appendectomy', price: 250000 },
      { name: 'Full Blood Count', price: 8000 },
      { name: 'IV Antibiotics (3 days)', price: 18000 },
      { name: 'Bed (4 nights, Ward A)', price: 60000 },
    ],
    staffHandled: 'Dr. Adewale Ogunleye', staffRole: 'Surgeon',
    totalBill: 336000, totalPaid: 336000, balance: 0, nhisCoverage: 100000,
    paymentChannel: 'Mixed', dischargeStatus: 'Discharged',
    admittedDate: '2026-04-22', dischargedDate: '2026-04-26', status: 'Fully Paid',
  },
  {
    id: 'DB002', patientName: 'Funke Adeyemi', hospitalId: 'GFA HMS/2026/00148', phone: '08045678901',
    diagnosis: 'Antenatal — 32 weeks gestation', department: 'Maternity', ward: 'Ward C · Bed 5',
    services: [
      { name: 'Antenatal Care', price: 35000 },
      { name: 'Ultrasound', price: 15000 },
      { name: 'Vitamins & Folic Acid', price: 6500 },
    ],
    staffHandled: 'Dr. Balogun K.', staffRole: 'Obstetrician',
    totalBill: 56500, totalPaid: 56500, balance: 0, nhisCoverage: 30000,
    paymentChannel: 'NHIS', dischargeStatus: 'Discharged',
    admittedDate: '2026-04-24', dischargedDate: '2026-04-24', status: 'Fully Paid',
  },
  {
    id: 'DB003', patientName: 'Ibrahim Musa', hospitalId: 'GFA HMS/2026/00149', phone: '08056789012',
    diagnosis: 'Hypertensive Emergency', department: 'Cardiology', ward: 'ICU · Bed 3',
    services: [
      { name: 'Emergency Consultation', price: 25000 },
      { name: 'ECG', price: 8000 },
      { name: 'IV Anti-hypertensives', price: 22000 },
      { name: 'ICU Bed (2 nights)', price: 120000 },
      { name: 'Cardiac Monitor', price: 35000 },
    ],
    staffHandled: 'Dr. Adewale Ogunleye', staffRole: 'Cardiologist',
    totalBill: 210000, totalPaid: 100000, balance: 110000, nhisCoverage: 0,
    paymentChannel: 'Transfer', dischargeStatus: 'Discharged',
    admittedDate: '2026-04-21', dischargedDate: '2026-04-23', status: 'Discharged (Not Paid)',
  },
  {
    id: 'DB004', patientName: 'Ngozi Okoro', hospitalId: 'GFA HMS/2026/00150', phone: '08067890123',
    diagnosis: 'Suspected Lumbar Disc Prolapse — MRI requested', department: 'Radiology',
    services: [
      { name: 'Specialist Consultation', price: 25000 },
      { name: 'MRI Scan (Lumbar)', price: 80000 },
    ],
    staffHandled: 'Dr. Aisha Bello', staffRole: 'Radiologist',
    totalBill: 105000, totalPaid: 0, balance: 105000, nhisCoverage: 0,
    dischargeStatus: 'Admitted',
    admittedDate: '2026-04-25', status: 'Unpaid',
  },
  {
    id: 'DB005', patientName: 'Adebayo Ogundimu', hospitalId: 'GFA HMS/2026/00153', phone: '08091234567',
    diagnosis: 'Inguinal Hernia — Major Repair', department: 'Surgery', ward: 'Ward B · Bed 8',
    services: [
      { name: 'Major Surgery — Hernia Repair', price: 500000 },
      { name: 'Full Blood Count', price: 8000 },
      { name: 'Chest X-Ray', price: 10000 },
      { name: 'Bed (6 nights, Ward B)', price: 90000 },
      { name: 'Post-op Pharmacy', price: 24000 },
    ],
    staffHandled: 'Dr. Adewale Ogunleye', staffRole: 'Surgeon',
    totalBill: 632000, totalPaid: 300000, balance: 332000, nhisCoverage: 200000,
    paymentChannel: 'Mixed', dischargeStatus: 'Admitted',
    admittedDate: '2026-04-20', status: 'Partially Paid',
  },
  {
    id: 'DB006', patientName: 'Kemi Afolabi', hospitalId: 'GFA HMS/2026/00154', phone: '08098765432',
    diagnosis: 'Routine Pediatric Check + Immunization', department: 'Pediatrics',
    services: [
      { name: 'Pediatric Consultation', price: 12000 },
      { name: 'Immunization (DPT)', price: 5000 },
    ],
    staffHandled: 'Nurse Ifeoma Okeke', staffRole: 'Pediatric Nurse',
    totalBill: 17000, totalPaid: 17000, balance: 0, nhisCoverage: 7000,
    paymentChannel: 'NHIS', dischargeStatus: 'Discharged',
    admittedDate: '2026-04-25', dischargedDate: '2026-04-25', status: 'Fully Paid',
  },
  {
    id: 'DB007', patientName: 'Halima Abdullahi', hospitalId: 'GFA HMS/2026/00152', phone: '08089012345',
    diagnosis: 'Type 2 Diabetes — Follow-up', department: 'Internal Medicine',
    services: [
      { name: 'Specialist Consultation', price: 25000 },
      { name: 'Fasting Blood Sugar', price: 4000 },
      { name: 'HbA1c', price: 8000 },
    ],
    staffHandled: 'Dr. Emeka Okafor', staffRole: 'Physician',
    totalBill: 37000, totalPaid: 0, balance: 37000, nhisCoverage: 0,
    dischargeStatus: 'Admitted',
    admittedDate: '2026-04-26', status: 'Unpaid',
  },
  {
    id: 'DB008', patientName: 'Tunde Bakare', hospitalId: 'GFA HMS/2026/00151', phone: '08078901234',
    diagnosis: 'Malaria with mild dehydration', department: 'Pediatrics',
    services: [
      { name: 'Pediatric Consultation', price: 12000 },
      { name: 'Malaria Test', price: 5000 },
      { name: 'Urinalysis', price: 3000 },
      { name: 'Antimalarial Pack', price: 4500 },
    ],
    staffHandled: 'Dr. Chinedu Eze', staffRole: 'Pediatrician',
    totalBill: 24500, totalPaid: 24500, balance: 0, nhisCoverage: 0,
    paymentChannel: 'Cash', dischargeStatus: 'Discharged',
    admittedDate: '2026-04-25', dischargedDate: '2026-04-25', status: 'Fully Paid',
  },
];
