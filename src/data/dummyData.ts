// Dummy Nigerian data for GFA HMS Smart Hospital

export type UserRole = 'superadmin' | 'admin' | 'staff' | 'student' | 'patient' | 'cmd' | 'board' | 'finance' | 'hr' | 'doctor' | 'it' | 'nurse' | 'pharmacist' | 'lab' | 'radiology' | 'psychology' | 'cap' | 'addiction' | 'psychogeriatrics' | 'physiotherapy' | 'speech' | 'nutrition' | 'socialwork' | 'icu' | 'cashier' | 'records' | 'psychopc' | 'dental' | 'eye' | 'paeds';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

/** Shared demo password for all seeded login accounts. */
export const DEMO_PASSWORD = 'password';

export const users: User[] = [
  { id: '1', name: 'Dr. Adekunle Balogun', email: 'admin@gfa-health.demo', role: 'admin', department: 'Management' },
  { id: '2', name: 'Dr. Adewale Ogunleye', email: 'staff@gfa-health.demo', role: 'staff', department: 'Surgery' },
  { id: '3', name: 'Chioma Okafor', email: 'student@gfa-health.demo', role: 'student' },
  { id: '4', name: 'John Doe', email: 'patient@gfa-health.demo', role: 'patient' },
  { id: '5', name: 'Prof. Olusegun Akinyemi', email: 'cmd@gfa-health.demo', role: 'cmd', department: 'Executive' },
  { id: '6', name: 'Mrs. Adebimpe Lawal', email: 'finance@gfa-health.demo', role: 'finance', department: 'Finance' },
  { id: '7', name: 'Mr. Tunji Akande', email: 'hr@gfa-health.demo', role: 'hr', department: 'Human Resources' },
  { id: '8', name: 'Dr. Ngozi Ikedife', email: 'doctor@gfa-health.demo', role: 'doctor', department: 'Internal Medicine' },
  { id: '9', name: 'Mr. Bayo Olatunji', email: 'it@gfa-health.demo', role: 'it', department: 'IT / Systems' },
  { id: '10', name: 'Nurse Blessing Okonkwo', email: 'nurse@gfa-health.demo', role: 'nurse', department: 'Nursing Services' },
  { id: '11', name: 'Pharm. Yetunde Salami', email: 'pharmacist@gfa-health.demo', role: 'pharmacist', department: 'Pharmacy' },
  { id: '12', name: 'Mr. Sola Adebanjo', email: 'lab@gfa-health.demo', role: 'lab', department: 'Laboratory' },
  { id: '13', name: 'Mrs. Hafsat Bello', email: 'cashier@gfa-health.demo', role: 'cashier', department: 'Billing & Cash' },
  { id: '14', name: 'Mr. Femi Oduwole', email: 'records@gfa-health.demo', role: 'records', department: 'Health Records' },
  { id: '15', name: 'Chief Tunde Adeleke (Board Chair)', email: 'board@gfa-health.demo', role: 'board', department: 'Board of Governors' },
  { id: '16', name: 'Dr. Chukwuma Okonkwo', email: 'psychopc@gfa-health.demo', role: 'psychopc', department: 'Psychiatric OPC' },
  { id: '17', name: 'Dr. Aisha Bello', email: 'radiology@gfa-health.demo', role: 'radiology', department: 'Radiology' },
  { id: '18', name: 'Dr. Funmilayo Adeyemi', email: 'psychology@gfa-health.demo', role: 'psychology', department: 'Clinical Psychology' },
  { id: '19', name: 'Dr. Kemi Adebayo', email: 'cap@gfa-health.demo', role: 'cap', department: 'Child & Adolescent Psychiatry' },
  { id: '20', name: 'Dr. Ibrahim Musa', email: 'addiction@gfa-health.demo', role: 'addiction', department: 'Addiction Services & Rehab' },
  { id: '21', name: 'Dr. Grace Okeke', email: 'psychogeriatrics@gfa-health.demo', role: 'psychogeriatrics', department: 'Psychogeriatrics' },
  { id: '22', name: 'Mr. Tunde Afolabi', email: 'physiotherapy@gfa-health.demo', role: 'physiotherapy', department: 'Physiotherapy' },
  { id: '23', name: 'Mrs. Amaka Nwosu', email: 'speech@gfa-health.demo', role: 'speech', department: 'Speech Therapy' },
  { id: '24', name: 'Mrs. Bola Adewumi', email: 'nutrition@gfa-health.demo', role: 'nutrition', department: 'Nutrition & Dietetics' },
  { id: '25', name: 'Mr. Segun Alabi', email: 'socialwork@gfa-health.demo', role: 'socialwork', department: 'Social Work & Community Support' },
  { id: '26', name: 'Dr. Chinedu Eze', email: 'icu@gfa-health.demo', role: 'icu', department: 'ICU / Critical Care' },
  { id: '27', name: 'System Super Admin', email: 'superadmin@gfa-health.demo', role: 'superadmin', department: 'IT / Systems' },
  { id: '28', name: 'Dr. Yetunde Akinola', email: 'dental@gfa-health.demo', role: 'dental', department: 'Dental Clinic' },
  { id: '29', name: 'Dr. Adaeze Okonkwo', email: 'eye@gfa-health.demo', role: 'eye', department: 'Eye Clinic' },
  { id: '30', name: 'Dr. Funmilayo Adeyemi', email: 'paeds@gfa-health.demo', role: 'paeds', department: 'Paediatrics' },
];

/** Quick-pick entries shown on the login screen. */
export const demoLogins: { email: string; label: string; tone: string }[] = [
  { email: 'superadmin@gfa-health.demo', label: 'Super Admin', tone: 'bg-gradient-indigo text-indigo-brand' },
  { email: 'board@gfa-health.demo', label: 'Board', tone: 'bg-gradient-purple text-accent' },
  { email: 'cmd@gfa-health.demo', label: 'CMD', tone: 'bg-gradient-blue text-primary' },
  { email: 'admin@gfa-health.demo', label: 'Admin', tone: 'bg-gradient-indigo text-indigo-brand' },
  { email: 'finance@gfa-health.demo', label: 'Finance', tone: 'bg-gradient-green text-tertiary' },
  { email: 'hr@gfa-health.demo', label: 'HR', tone: 'bg-gradient-amber text-warning' },
  { email: 'doctor@gfa-health.demo', label: 'Doctor', tone: 'bg-gradient-blue text-primary' },
  { email: 'dental@gfa-health.demo', label: 'Dental Department', tone: 'bg-gradient-teal text-secondary' },
  { email: 'eye@gfa-health.demo', label: 'Eye Clinic', tone: 'bg-gradient-blue text-primary' },
  { email: 'paeds@gfa-health.demo', label: 'Paediatrics', tone: 'bg-gradient-amber text-warning' },
  { email: 'nurse@gfa-health.demo', label: 'Nurse', tone: 'bg-gradient-rose text-destructive' },
  { email: 'pharmacist@gfa-health.demo', label: 'Pharmacist', tone: 'bg-gradient-teal text-secondary' },
  { email: 'lab@gfa-health.demo', label: 'Lab', tone: 'bg-gradient-purple text-accent' },
  { email: 'radiology@gfa-health.demo', label: 'Radiology', tone: 'bg-gradient-indigo text-indigo-brand' },
  { email: 'psychopc@gfa-health.demo', label: 'Psychiatric OPC', tone: 'bg-gradient-blue text-primary' },
  { email: 'psychology@gfa-health.demo', label: 'Psychology', tone: 'bg-gradient-purple text-accent' },
  { email: 'cap@gfa-health.demo', label: 'Child & Adolescent', tone: 'bg-gradient-rose text-destructive' },
  { email: 'addiction@gfa-health.demo', label: 'Addiction & Rehab', tone: 'bg-gradient-amber text-warning' },
  { email: 'psychogeriatrics@gfa-health.demo', label: 'Psychogeriatrics', tone: 'bg-gradient-teal text-secondary' },
  { email: 'physiotherapy@gfa-health.demo', label: 'Physiotherapy', tone: 'bg-gradient-blue text-primary' },
  { email: 'speech@gfa-health.demo', label: 'Speech Therapy', tone: 'bg-gradient-teal text-secondary' },
  { email: 'nutrition@gfa-health.demo', label: 'Nutrition & Dietetics', tone: 'bg-gradient-green text-tertiary' },
  { email: 'socialwork@gfa-health.demo', label: 'Social Work', tone: 'bg-gradient-purple text-accent' },
  { email: 'icu@gfa-health.demo', label: 'ICU / Critical Care', tone: 'bg-gradient-rose text-destructive' },
  { email: 'cashier@gfa-health.demo', label: 'Cashier', tone: 'bg-gradient-green text-tertiary' },
  { email: 'records@gfa-health.demo', label: 'Records', tone: 'bg-gradient-indigo text-indigo-brand' },
  { email: 'it@gfa-health.demo', label: 'IT', tone: 'bg-gradient-blue text-primary' },
  { email: 'staff@gfa-health.demo', label: 'Staff', tone: 'bg-gradient-amber text-warning' },
  { email: 'student@gfa-health.demo', label: 'Student', tone: 'bg-gradient-teal text-secondary' },
  { email: 'patient@gfa-health.demo', label: 'Patient', tone: 'bg-gradient-rose text-destructive' },
];

export interface Patient {
  id: string;
  name: string;
  phone: string;
  service: string;
  status: 'Admitted' | 'Outpatient' | 'Discharged';
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  amount: number;
  ward?: string;
  room?: string;
  paymentType?: string;
  staffName?: string;
  date: string;
}

export const patients: Patient[] = [
  { id: 'P001', name: 'John Doe', phone: '08012345678', service: 'Surgery', status: 'Admitted', paymentStatus: 'Paid', amount: 150000, ward: 'Ward A', room: '12', paymentType: 'Card', staffName: 'Dr. Adewale', date: '2026-03-25' },
  { id: 'P002', name: 'Amina Yusuf', phone: '08023456789', service: 'Laboratory', status: 'Outpatient', paymentStatus: 'Pending', amount: 25000, paymentType: 'Transfer', staffName: 'Dr. Fatimah', date: '2026-03-25' },
  { id: 'P003', name: 'Chidi Eze', phone: '08034567890', service: 'General Consultation', status: 'Outpatient', paymentStatus: 'Paid', amount: 15000, paymentType: 'Cash', staffName: 'Dr. Okafor', date: '2026-03-25' },
  { id: 'P004', name: 'Funke Adeyemi', phone: '08045678901', service: 'Maternity', status: 'Admitted', paymentStatus: 'Paid', amount: 350000, ward: 'Ward C', room: '5', paymentType: 'Card', staffName: 'Dr. Balogun', date: '2026-03-24' },
  { id: 'P005', name: 'Ibrahim Musa', phone: '08056789012', service: 'Surgery', status: 'Discharged', paymentStatus: 'Failed', amount: 200000, ward: 'Ward B', room: '8', paymentType: 'Transfer', staffName: 'Dr. Adewale', date: '2026-03-23' },
  { id: 'P006', name: 'Ngozi Okoro', phone: '08067890123', service: 'Radiology', status: 'Outpatient', paymentStatus: 'Pending', amount: 45000, paymentType: 'Cash', staffName: 'Dr. Eze', date: '2026-03-25' },
  { id: 'P007', name: 'Tunde Bakare', phone: '08078901234', service: 'Laboratory', status: 'Outpatient', paymentStatus: 'Paid', amount: 18000, paymentType: 'Card', staffName: 'Dr. Fatimah', date: '2026-03-25' },
  { id: 'P008', name: 'Halima Abdullahi', phone: '08089012345', service: 'General Consultation', status: 'Outpatient', paymentStatus: 'Pending', amount: 12000, paymentType: 'Transfer', staffName: 'Dr. Okafor', date: '2026-03-24' },
];

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Absent';
  daysPresent: number;
  daysExpected: number;
  revenueGenerated: number;
}

export const staffMembers: StaffMember[] = [
  { id: 'S001', name: 'Dr. Adewale Ogunleye', role: 'Surgeon', department: 'Surgery', status: 'Active', daysPresent: 22, daysExpected: 23, revenueGenerated: 4500000 },
  { id: 'S002', name: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', department: 'Laboratory', status: 'Active', daysPresent: 20, daysExpected: 23, revenueGenerated: 1200000 },
  { id: 'S003', name: 'Nurse Blessing Okonkwo', role: 'Nurse', department: 'Maternity', status: 'Active', daysPresent: 23, daysExpected: 23, revenueGenerated: 800000 },
  { id: 'S004', name: 'Dr. Emeka Okafor', role: 'Physician', department: 'Internal Medicine', status: 'Active', daysPresent: 21, daysExpected: 23, revenueGenerated: 2100000 },
  { id: 'S005', name: 'Dr. Aisha Bello', role: 'Radiologist', department: 'Radiology', status: 'Absent', daysPresent: 15, daysExpected: 23, revenueGenerated: 900000 },
  { id: 'S006', name: 'Mr. Kunle Adeola', role: 'Admin Officer', department: 'Administration', status: 'Active', daysPresent: 22, daysExpected: 23, revenueGenerated: 0 },
  { id: 'S007', name: 'Dr. Chinedu Eze', role: 'Pediatrician', department: 'Pediatrics', status: 'Inactive', daysPresent: 0, daysExpected: 23, revenueGenerated: 0 },
  { id: 'S008', name: 'Nurse Folake Adesanya', role: 'Nurse', department: 'Surgery', status: 'Active', daysPresent: 20, daysExpected: 23, revenueGenerated: 600000 },
];

export interface ServicePackage {
  id: string;
  name: string;
  price: number;
  status: 'Active' | 'Inactive';
  requests: number;
  services: string[];
}

export const servicePackages: ServicePackage[] = [
  { id: 'PKG001', name: 'Basic Health Check', price: 25000, status: 'Active', requests: 145, services: ['Blood Test', 'Urine Test', 'Blood Pressure', 'BMI Check'] },
  { id: 'PKG002', name: 'Comprehensive Medical', price: 85000, status: 'Active', requests: 78, services: ['Full Blood Count', 'Liver Function', 'Kidney Function', 'ECG', 'Chest X-ray', 'Doctor Consultation'] },
  { id: 'PKG003', name: 'Maternity Package', price: 450000, status: 'Active', requests: 34, services: ['Antenatal Care', 'Delivery', 'Post-natal Care', 'Baby Immunization', 'Ultrasound Scans'] },
  { id: 'PKG004', name: 'Executive Health Screen', price: 150000, status: 'Inactive', requests: 12, services: ['Full Body Scan', 'Cardiac Assessment', 'Eye Test', 'Dental Check', 'Nutritional Counseling'] },
];

export interface Appointment {
  id: string;
  bookingCode: string;
  patientName: string;
  phone: string;
  department: string;
  doctor: string;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
}

export const appointments: Appointment[] = [
  { id: 'A001', bookingCode: 'GFA HMS-12345', patientName: 'John Doe', phone: '08012345678', department: 'Surgery', doctor: 'Dr. Adewale', date: '2026-03-25', time: '10:00 AM', status: 'Confirmed' },
  { id: 'A002', bookingCode: 'GFA HMS-12346', patientName: 'Amina Yusuf', phone: '08023456789', department: 'Laboratory', doctor: 'Dr. Fatimah', date: '2026-03-25', time: '10:00 AM', status: 'Pending' },
  { id: 'A003', bookingCode: 'GFA HMS-12347', patientName: 'Funke Adeyemi', phone: '08045678901', department: 'Maternity', doctor: 'Dr. Balogun', date: '2026-03-25', time: '11:00 AM', status: 'Confirmed' },
  { id: 'A004', bookingCode: 'GFA HMS-12348', patientName: 'Chidi Eze', phone: '08034567890', department: 'Internal Medicine', doctor: 'Dr. Okafor', date: '2026-03-26', time: '09:00 AM', status: 'Pending' },
  { id: 'A005', bookingCode: 'GFA HMS-12349', patientName: 'Tunde Bakare', phone: '08078901234', department: 'Radiology', doctor: 'Dr. Aisha', date: '2026-03-26', time: '02:00 PM', status: 'Completed' },
];

export const doctors = [
  { name: 'Dr. Adewale', department: 'Surgery' },
  { name: 'Dr. Fatimah', department: 'Laboratory' },
  { name: 'Dr. Balogun', department: 'Maternity' },
  { name: 'Dr. Okafor', department: 'Internal Medicine' },
  { name: 'Dr. Aisha', department: 'Radiology' },
  { name: 'Dr. Eze', department: 'Pediatrics' },
];

export const departments = [
  'Accident & Emergency',
  'Anaesthesia & Intensive Care',
  'Community Medicine & Primary Care',
  'ENT / ORL',
  'Family Medicine',
  'Food Services',
  'Laboratory Services',
  'Medicine',
  'Nursing Services',
  'Obstetrics & Gynaecology',
  'Ophthalmology',
  'Orthopaedic & Trauma',
  'Paediatrics',
  'Pharmacy',
  'Physiotherapy',
  'Radiology',
  'Surgery',
  'Health Information Management',
  'Emergency Care',
  'Blood Bank',
];

export const timeSlots = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM',
];

export interface StudentCourse {
  id: string;
  name: string;
  code: string;
  semester: string;
  status: 'Enrolled' | 'Completed';
}

export const studentCourses: StudentCourse[] = [
  { id: 'C001', name: 'Human Anatomy', code: 'MED 101', semester: '1st Semester', status: 'Completed' },
  { id: 'C002', name: 'Physiology', code: 'MED 102', semester: '1st Semester', status: 'Completed' },
  { id: 'C003', name: 'Biochemistry', code: 'MED 201', semester: '2nd Semester', status: 'Enrolled' },
  { id: 'C004', name: 'Pharmacology', code: 'MED 301', semester: '2nd Semester', status: 'Enrolled' },
  { id: 'C005', name: 'Pathology', code: 'MED 302', semester: '2nd Semester', status: 'Enrolled' },
];

export interface StudentPayment {
  id: string;
  studentName: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending';
  date: string;
  method?: string;
}

export const studentPayments: StudentPayment[] = [
  { id: 'SP001', studentName: 'Chioma Okafor', description: 'Tuition Fee - 1st Semester', amount: 250000, status: 'Paid', date: '2026-01-15', method: 'Card' },
  { id: 'SP002', studentName: 'Chioma Okafor', description: 'Tuition Fee - 2nd Semester', amount: 250000, status: 'Pending', date: '2026-03-01' },
  { id: 'SP003', studentName: 'Chioma Okafor', description: 'Lab Fee', amount: 50000, status: 'Paid', date: '2026-01-20', method: 'Transfer' },
  { id: 'SP004', studentName: 'Adebayo Ogundimu', description: 'Tuition Fee - 1st Semester', amount: 250000, status: 'Paid', date: '2026-01-14', method: 'Remita' },
  { id: 'SP005', studentName: 'Adebayo Ogundimu', description: 'Tuition Fee - 2nd Semester', amount: 250000, status: 'Pending', date: '2026-03-01' },
];

export const aiInsights = [
  { type: 'warning' as const, message: '₦12M lost from incomplete payments this quarter', detail: '45 patients have outstanding balances exceeding 30 days' },
  { type: 'success' as const, message: 'Top revenue department: Surgery (₦45M this month)', detail: 'Surgery department generated 35% of total hospital revenue' },
  { type: 'danger' as const, message: 'Staff absenteeism high in Radiology (35%)', detail: 'Dr. Aisha Bello has been absent for 8 of last 23 working days' },
  { type: 'info' as const, message: 'Patient satisfaction score: 4.2/5.0', detail: 'Maternity ward has the highest satisfaction at 4.7/5.0' },
  { type: 'warning' as const, message: 'Equipment maintenance due for MRI scanner', detail: 'Last serviced 11 months ago — recommended every 12 months' },
];

export const formatCurrency = (amount: number): string => {
  return '₦' + amount.toLocaleString('en-NG');
};
