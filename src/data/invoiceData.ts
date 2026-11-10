// Invoice & Services data for GFA HMS Smart Hospital

import { formatCurrency } from './dummyData';

export interface HospitalService {
  id: string;
  name: string;
  category: string;
  department: string;
  price: number;
  duration?: string;
  status: 'Active' | 'Inactive';
  pricing: {
    nhis: number;
    private: number;
    emergency: number;
  };
}

export const hospitalServices: HospitalService[] = [
  // Laboratory
  { id: 'SVC001', name: 'Malaria Test', category: 'Blood Tests', department: 'Laboratory', price: 5000, duration: '2 hrs', status: 'Active', pricing: { nhis: 3000, private: 5000, emergency: 7000 } },
  { id: 'SVC002', name: 'Full Blood Count', category: 'Blood Tests', department: 'Laboratory', price: 8000, duration: '4 hrs', status: 'Active', pricing: { nhis: 5000, private: 8000, emergency: 12000 } },
  { id: 'SVC003', name: 'Liver Function Test', category: 'Blood Tests', department: 'Laboratory', price: 12000, duration: '6 hrs', status: 'Active', pricing: { nhis: 8000, private: 12000, emergency: 15000 } },
  { id: 'SVC004', name: 'Kidney Function Test', category: 'Blood Tests', department: 'Laboratory', price: 12000, duration: '6 hrs', status: 'Active', pricing: { nhis: 8000, private: 12000, emergency: 15000 } },
  { id: 'SVC005', name: 'Urinalysis', category: 'Urine Tests', department: 'Laboratory', price: 3000, duration: '1 hr', status: 'Active', pricing: { nhis: 2000, private: 3000, emergency: 5000 } },
  { id: 'SVC006', name: 'Genotype/Blood Group', category: 'Blood Tests', department: 'Laboratory', price: 4000, duration: '2 hrs', status: 'Active', pricing: { nhis: 2500, private: 4000, emergency: 6000 } },
  // Radiology
  { id: 'SVC007', name: 'X-Ray', category: 'Imaging', department: 'Radiology', price: 10000, duration: '30 min', status: 'Active', pricing: { nhis: 7000, private: 10000, emergency: 15000 } },
  { id: 'SVC008', name: 'MRI Scan', category: 'Imaging', department: 'Radiology', price: 80000, duration: '1 hr', status: 'Active', pricing: { nhis: 60000, private: 80000, emergency: 100000 } },
  { id: 'SVC009', name: 'CT Scan', category: 'Imaging', department: 'Radiology', price: 65000, duration: '45 min', status: 'Active', pricing: { nhis: 45000, private: 65000, emergency: 85000 } },
  { id: 'SVC010', name: 'Ultrasound', category: 'Imaging', department: 'Radiology', price: 15000, duration: '30 min', status: 'Active', pricing: { nhis: 10000, private: 15000, emergency: 20000 } },
  // Surgery
  { id: 'SVC011', name: 'Minor Surgery', category: 'Surgical', department: 'Surgery', price: 150000, duration: '2-4 hrs', status: 'Active', pricing: { nhis: 100000, private: 150000, emergency: 200000 } },
  { id: 'SVC012', name: 'Major Surgery', category: 'Surgical', department: 'Surgery', price: 500000, duration: '4-8 hrs', status: 'Active', pricing: { nhis: 350000, private: 500000, emergency: 650000 } },
  { id: 'SVC013', name: 'Appendectomy', category: 'Surgical', department: 'Surgery', price: 250000, duration: '2-3 hrs', status: 'Active', pricing: { nhis: 180000, private: 250000, emergency: 350000 } },
  // Internal Medicine
  { id: 'SVC014', name: 'General Consultation', category: 'Consultation', department: 'Internal Medicine', price: 10000, duration: '30 min', status: 'Active', pricing: { nhis: 5000, private: 10000, emergency: 15000 } },
  { id: 'SVC015', name: 'Specialist Consultation', category: 'Consultation', department: 'Internal Medicine', price: 25000, duration: '45 min', status: 'Active', pricing: { nhis: 15000, private: 25000, emergency: 35000 } },
  { id: 'SVC016', name: 'ECG', category: 'Cardiac', department: 'Internal Medicine', price: 8000, duration: '20 min', status: 'Active', pricing: { nhis: 5000, private: 8000, emergency: 12000 } },
  // Maternity
  { id: 'SVC017', name: 'Antenatal Care', category: 'Maternal', department: 'Maternity', price: 35000, duration: 'Per visit', status: 'Active', pricing: { nhis: 20000, private: 35000, emergency: 45000 } },
  { id: 'SVC018', name: 'Normal Delivery', category: 'Maternal', department: 'Maternity', price: 200000, duration: 'Varies', status: 'Active', pricing: { nhis: 120000, private: 200000, emergency: 280000 } },
  { id: 'SVC019', name: 'Caesarean Section', category: 'Maternal', department: 'Maternity', price: 450000, duration: '2-3 hrs', status: 'Active', pricing: { nhis: 300000, private: 450000, emergency: 550000 } },
  // Pediatrics
  { id: 'SVC020', name: 'Pediatric Consultation', category: 'Consultation', department: 'Pediatrics', price: 12000, duration: '30 min', status: 'Active', pricing: { nhis: 7000, private: 12000, emergency: 18000 } },
  { id: 'SVC021', name: 'Immunization', category: 'Preventive', department: 'Pediatrics', price: 5000, duration: '15 min', status: 'Active', pricing: { nhis: 2000, private: 5000, emergency: 5000 } },
];

export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceId: string;
  patientName: string;
  phone: string;
  department: string;
  services: InvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial' | 'Cancelled';
  createdBy: string;
  date: string;
  notes?: string;
  processedBy?: string;        // cashier/nurse/staff who created/processed the invoice
  processedByRole?: 'Cashier' | 'Nurse' | 'Staff' | 'Records' | 'Doctor';
  nhisAmountUsed?: number;     // ₦ NHIS contribution
  nhisStatus?: 'Used' | 'Not Used';
  paymentChannel?: 'Cash' | 'Transfer' | 'Online' | 'NHIS' | 'POS Card' | 'Mixed';
}

export const invoices: Invoice[] = [
  {
    id: 'INV001', invoiceId: 'GFA HMS-INV-1001', patientName: 'John Doe', phone: '08012345678', department: 'Laboratory',
    services: [{ serviceId: 'SVC001', serviceName: 'Malaria Test', amount: 5000 }, { serviceId: 'SVC002', serviceName: 'Full Blood Count', amount: 8000 }],
    totalAmount: 13000, amountPaid: 5000, balance: 8000, paymentStatus: 'Partial', createdBy: 'Dr. Fatimah Ibrahim', date: '2026-03-25',
    processedBy: 'Cashier — Bola Ade', processedByRole: 'Cashier', nhisAmountUsed: 0, nhisStatus: 'Not Used', paymentChannel: 'Cash',
  },
  {
    id: 'INV002', invoiceId: 'GFA HMS-INV-1002', patientName: 'Amina Yusuf', phone: '08023456789', department: 'Radiology',
    services: [{ serviceId: 'SVC007', serviceName: 'X-Ray', amount: 10000 }],
    totalAmount: 10000, amountPaid: 10000, balance: 0, paymentStatus: 'Paid', createdBy: 'Dr. Aisha Bello', date: '2026-03-25',
    processedBy: 'Nurse Ifeoma Okeke', processedByRole: 'Nurse', nhisAmountUsed: 7000, nhisStatus: 'Used', paymentChannel: 'NHIS',
  },
  {
    id: 'INV003', invoiceId: 'GFA HMS-INV-1003', patientName: 'Chidi Eze', phone: '08034567890', department: 'Internal Medicine',
    services: [{ serviceId: 'SVC014', serviceName: 'General Consultation', amount: 10000 }, { serviceId: 'SVC016', serviceName: 'ECG', amount: 8000 }],
    totalAmount: 18000, amountPaid: 0, balance: 18000, paymentStatus: 'Pending', createdBy: 'Dr. Emeka Okafor', date: '2026-03-25',
    processedBy: 'Records — Yemi Adetola', processedByRole: 'Records', nhisAmountUsed: 0, nhisStatus: 'Not Used',
  },
  {
    id: 'INV004', invoiceId: 'GFA HMS-INV-1004', patientName: 'Funke Adeyemi', phone: '08045678901', department: 'Maternity',
    services: [{ serviceId: 'SVC017', serviceName: 'Antenatal Care', amount: 35000 }, { serviceId: 'SVC010', serviceName: 'Ultrasound', amount: 15000 }],
    totalAmount: 50000, amountPaid: 50000, balance: 0, paymentStatus: 'Paid', createdBy: 'Dr. Balogun', date: '2026-03-24',
    processedBy: 'Mrs. Adebimpe Lawal', processedByRole: 'Cashier', nhisAmountUsed: 30000, nhisStatus: 'Used', paymentChannel: 'Mixed',
  },
  {
    id: 'INV005', invoiceId: 'GFA HMS-INV-1005', patientName: 'Ibrahim Musa', phone: '08056789012', department: 'Surgery',
    services: [{ serviceId: 'SVC011', serviceName: 'Minor Surgery', amount: 150000 }, { serviceId: 'SVC002', serviceName: 'Full Blood Count', amount: 8000 }],
    totalAmount: 158000, amountPaid: 100000, balance: 58000, paymentStatus: 'Partial', createdBy: 'Dr. Adewale Ogunleye', date: '2026-03-23',
    processedBy: 'Cashier — Bola Ade', processedByRole: 'Cashier', nhisAmountUsed: 0, nhisStatus: 'Not Used', paymentChannel: 'Transfer',
  },
  {
    id: 'INV006', invoiceId: 'GFA HMS-INV-1006', patientName: 'Ngozi Okoro', phone: '08067890123', department: 'Radiology',
    services: [{ serviceId: 'SVC008', serviceName: 'MRI Scan', amount: 80000 }],
    totalAmount: 80000, amountPaid: 0, balance: 80000, paymentStatus: 'Pending', createdBy: 'Dr. Aisha Bello', date: '2026-03-25',
    processedBy: 'Records — Yemi Adetola', processedByRole: 'Records', nhisAmountUsed: 0, nhisStatus: 'Not Used',
  },
  {
    id: 'INV007', invoiceId: 'GFA HMS-INV-1007', patientName: 'Tunde Bakare', phone: '08078901234', department: 'Laboratory',
    services: [{ serviceId: 'SVC001', serviceName: 'Malaria Test', amount: 5000 }, { serviceId: 'SVC005', serviceName: 'Urinalysis', amount: 3000 }],
    totalAmount: 8000, amountPaid: 8000, balance: 0, paymentStatus: 'Paid', createdBy: 'Dr. Fatimah Ibrahim', date: '2026-03-25',
    processedBy: 'Cashier — Bola Ade', processedByRole: 'Cashier', nhisAmountUsed: 0, nhisStatus: 'Not Used', paymentChannel: 'Cash',
  },
  {
    id: 'INV008', invoiceId: 'GFA HMS-INV-1008', patientName: 'Halima Abdullahi', phone: '08089012345', department: 'Internal Medicine',
    services: [{ serviceId: 'SVC015', serviceName: 'Specialist Consultation', amount: 25000 }],
    totalAmount: 25000, amountPaid: 0, balance: 25000, paymentStatus: 'Cancelled', createdBy: 'Dr. Emeka Okafor', date: '2026-03-24',
    processedBy: 'Records — Yemi Adetola', processedByRole: 'Records', nhisAmountUsed: 0, nhisStatus: 'Not Used',
  },
  {
    id: 'INV009', invoiceId: 'GFA HMS-INV-1009', patientName: 'Adebayo Ogundimu', phone: '08091234567', department: 'Surgery',
    services: [{ serviceId: 'SVC012', serviceName: 'Major Surgery', amount: 500000 }, { serviceId: 'SVC002', serviceName: 'Full Blood Count', amount: 8000 }, { serviceId: 'SVC007', serviceName: 'X-Ray', amount: 10000 }],
    totalAmount: 518000, amountPaid: 300000, balance: 218000, paymentStatus: 'Partial', createdBy: 'Dr. Adewale Ogunleye', date: '2026-03-22',
    processedBy: 'Mrs. Adebimpe Lawal', processedByRole: 'Cashier', nhisAmountUsed: 200000, nhisStatus: 'Used', paymentChannel: 'Mixed',
  },
  {
    id: 'INV010', invoiceId: 'GFA HMS-INV-1010', patientName: 'Kemi Afolabi', phone: '08098765432', department: 'Pediatrics',
    services: [{ serviceId: 'SVC020', serviceName: 'Pediatric Consultation', amount: 12000 }, { serviceId: 'SVC021', serviceName: 'Immunization', amount: 5000 }],
    totalAmount: 17000, amountPaid: 17000, balance: 0, paymentStatus: 'Paid', createdBy: 'Dr. Chinedu Eze', date: '2026-03-25',
    processedBy: 'Nurse Ifeoma Okeke', processedByRole: 'Nurse', nhisAmountUsed: 7000, nhisStatus: 'Used', paymentChannel: 'NHIS',
  },
];

// Consultation types for e-health
export interface ConsultationType {
  id: string;
  name: string;
  basePrice: number;
  chooseDoctorExtra: number;
}

export const consultationTypes: ConsultationType[] = [
  { id: 'CON001', name: 'General Consultation', basePrice: 10000, chooseDoctorExtra: 5000 },
  { id: 'CON002', name: 'Specialist Consultation', basePrice: 25000, chooseDoctorExtra: 5000 },
];

export const consultationModes = ['Physical', 'Online'] as const;

// Extended staff with services & availability
export interface ExtendedStaff {
  staffId: string;
  assignedDepartment: string;
  servicesHandled: string[];
  availability: ('Morning' | 'Afternoon' | 'Evening')[];
}

export const extendedStaffData: ExtendedStaff[] = [
  { staffId: 'S001', assignedDepartment: 'Surgery', servicesHandled: ['Minor Surgery', 'Major Surgery', 'Appendectomy'], availability: ['Morning', 'Afternoon'] },
  { staffId: 'S002', assignedDepartment: 'Laboratory', servicesHandled: ['Malaria Test', 'Full Blood Count', 'Liver Function Test'], availability: ['Morning', 'Afternoon', 'Evening'] },
  { staffId: 'S003', assignedDepartment: 'Maternity', servicesHandled: ['Antenatal Care', 'Normal Delivery'], availability: ['Morning', 'Evening'] },
  { staffId: 'S004', assignedDepartment: 'Internal Medicine', servicesHandled: ['General Consultation', 'Specialist Consultation', 'ECG'], availability: ['Morning', 'Afternoon'] },
  { staffId: 'S005', assignedDepartment: 'Radiology', servicesHandled: ['X-Ray', 'MRI Scan', 'CT Scan', 'Ultrasound'], availability: ['Morning'] },
  { staffId: 'S008', assignedDepartment: 'Surgery', servicesHandled: ['Minor Surgery'], availability: ['Morning', 'Afternoon', 'Evening'] },
];

// Updated AI Insights
export const updatedAiInsights = [
  { type: 'success' as const, message: 'Most paid service: Malaria Test (145 requests this month)', detail: 'Malaria Test continues to be the highest-demand laboratory service' },
  { type: 'success' as const, message: 'Highest revenue department: Surgery (₦45M)', detail: 'Surgery department generated 35% of total hospital revenue this quarter' },
  { type: 'warning' as const, message: '₦8M pending from unpaid invoices', detail: '23 invoices have outstanding balances exceeding 14 days' },
  { type: 'warning' as const, message: '₦12M lost from incomplete payments this quarter', detail: '45 patients have outstanding balances exceeding 30 days' },
  { type: 'danger' as const, message: 'Staff absenteeism high in Radiology (35%)', detail: 'Dr. Aisha Bello has been absent for 8 of last 23 working days' },
  { type: 'info' as const, message: 'Patient satisfaction score: 4.2/5.0', detail: 'Maternity ward has the highest satisfaction at 4.7/5.0' },
  { type: 'info' as const, message: 'Top 3 services by volume: Malaria Test, General Consultation, X-Ray', detail: 'These 3 services account for 60% of all invoices generated' },
  { type: 'warning' as const, message: 'Equipment maintenance due for MRI scanner', detail: 'Last serviced 11 months ago — recommended every 12 months' },
];
