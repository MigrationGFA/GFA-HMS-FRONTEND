// Shared workflow data: attendance, leave, support, payroll, retirement, performance, payments, cash flow

export interface AttendanceRecord {
  id: string;
  staffName: string;
  role: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Late';
}

export const attendanceRecords: AttendanceRecord[] = [
  { id: 'AT001', staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', department: 'Surgery', date: '2026-04-28', checkIn: '07:52 AM', checkOut: '04:10 PM', status: 'Present' },
  { id: 'AT002', staffName: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', department: 'Laboratory', date: '2026-04-28', checkIn: '08:05 AM', checkOut: '04:00 PM', status: 'Late' },
  { id: 'AT003', staffName: 'Nurse Blessing Okonkwo', role: 'Nurse', department: 'Maternity', date: '2026-04-28', checkIn: '07:45 AM', checkOut: '04:15 PM', status: 'Present' },
  { id: 'AT004', staffName: 'Dr. Emeka Okafor', role: 'Physician', department: 'Internal Medicine', date: '2026-04-28', checkIn: '07:58 AM', checkOut: '04:05 PM', status: 'Present' },
  { id: 'AT005', staffName: 'Dr. Aisha Bello', role: 'Radiologist', department: 'Radiology', date: '2026-04-28', checkIn: '—', checkOut: '—', status: 'Absent' },
  { id: 'AT006', staffName: 'Mr. Kunle Adeola', role: 'Admin Officer', department: 'Administration', date: '2026-04-28', checkIn: '08:00 AM', checkOut: '04:00 PM', status: 'Present' },
  { id: 'AT007', staffName: 'Dr. Chinedu Eze', role: 'Pediatrician', department: 'Pediatrics', date: '2026-04-28', checkIn: '—', checkOut: '—', status: 'On Leave' },
  { id: 'AT008', staffName: 'Nurse Folake Adesanya', role: 'Nurse', department: 'Surgery', date: '2026-04-28', checkIn: '07:50 AM', checkOut: '04:00 PM', status: 'Present' },
];

export interface LeaveRequest {
  id: string;
  staffName: string;
  role: string;
  department: string;
  type: 'Casual' | 'Sick' | 'Annual' | 'Maternity' | 'Study';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const leaveRequests: LeaveRequest[] = [
  { id: 'LV001', staffName: 'Dr. Chinedu Eze', role: 'Pediatrician', department: 'Pediatrics', type: 'Annual', startDate: '2026-04-25', endDate: '2026-05-09', days: 14, reason: 'Annual leave with family', status: 'Approved' },
  { id: 'LV002', staffName: 'Nurse Folake Adesanya', role: 'Nurse', department: 'Surgery', type: 'Sick', startDate: '2026-04-29', endDate: '2026-05-01', days: 3, reason: 'Medical recovery — flu', status: 'Pending' },
  { id: 'LV003', staffName: 'Dr. Aisha Bello', role: 'Radiologist', department: 'Radiology', type: 'Casual', startDate: '2026-04-30', endDate: '2026-05-02', days: 3, reason: 'Family obligation', status: 'Pending' },
  { id: 'LV004', staffName: 'Mr. Kunle Adeola', role: 'Admin Officer', department: 'Administration', type: 'Annual', startDate: '2026-05-12', endDate: '2026-05-26', days: 14, reason: 'Annual entitlement', status: 'Pending' },
  { id: 'LV005', staffName: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', department: 'Laboratory', type: 'Study', startDate: '2026-03-01', endDate: '2026-03-15', days: 14, reason: 'Conference & CPD', status: 'Rejected' },
  { id: 'LV006', staffName: 'Nurse Blessing Okonkwo', role: 'Nurse', department: 'Maternity', type: 'Maternity', startDate: '2026-06-01', endDate: '2026-09-01', days: 90, reason: 'Maternity leave', status: 'Approved' },
];

export interface SupportRequest {
  id: string;
  staffName: string;
  role: string;
  type: 'Profile Change' | 'Complaint' | 'Technical Issue';
  description: string;
  date: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export const supportRequests: SupportRequest[] = [
  { id: 'SR001', staffName: 'Dr. Emeka Okafor', role: 'Physician', type: 'Profile Change', description: 'Update phone number from 0803... to 0809...', date: '2026-04-26', status: 'Open' },
  { id: 'SR002', staffName: 'Nurse Folake Adesanya', role: 'Nurse', type: 'Complaint', description: 'Shift roster conflict with personal emergency.', date: '2026-04-25', status: 'In Progress' },
  { id: 'SR003', staffName: 'Mr. Bayo Olatunji', role: 'IT Officer', type: 'Technical Issue', description: 'Cannot access HR payroll module.', date: '2026-04-24', status: 'Resolved' },
  { id: 'SR004', staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', type: 'Profile Change', description: 'Add new specialization: Laparoscopy.', date: '2026-04-23', status: 'Open' },
];

export interface PayrollRow {
  id: string;
  staffName: string;
  role: string;
  department: string;
  basic: number;
  allowance: number;
  deductions: number;
  netPay: number;
  status: 'Paid' | 'Pending';
}

export const payrollRows: PayrollRow[] = [
  { id: 'PR001', staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', department: 'Surgery', basic: 750000, allowance: 250000, deductions: 120000, netPay: 880000, status: 'Paid' },
  { id: 'PR002', staffName: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', department: 'Laboratory', basic: 380000, allowance: 90000, deductions: 50000, netPay: 420000, status: 'Paid' },
  { id: 'PR003', staffName: 'Nurse Blessing Okonkwo', role: 'Nurse', department: 'Maternity', basic: 280000, allowance: 70000, deductions: 35000, netPay: 315000, status: 'Paid' },
  { id: 'PR004', staffName: 'Dr. Emeka Okafor', role: 'Physician', department: 'Internal Medicine', basic: 620000, allowance: 180000, deductions: 95000, netPay: 705000, status: 'Pending' },
  { id: 'PR005', staffName: 'Dr. Aisha Bello', role: 'Radiologist', department: 'Radiology', basic: 580000, allowance: 160000, deductions: 88000, netPay: 652000, status: 'Pending' },
  { id: 'PR006', staffName: 'Mr. Kunle Adeola', role: 'Admin Officer', department: 'Administration', basic: 220000, allowance: 60000, deductions: 28000, netPay: 252000, status: 'Paid' },
];

export interface RetirementRow {
  id: string;
  staffName: string;
  role: string;
  age: number;
  yearsOfService: number;
  retirementDate: string;
  status: 'Active' | 'Approaching' | 'Due';
}

export const retirementRows: RetirementRow[] = [
  { id: 'RT001', staffName: 'Prof. Olusegun Akinyemi', role: 'CMD', age: 62, yearsOfService: 32, retirementDate: '2028-04-15', status: 'Approaching' },
  { id: 'RT002', staffName: 'Mr. Kunle Adeola', role: 'Admin Officer', age: 58, yearsOfService: 28, retirementDate: '2032-09-01', status: 'Active' },
  { id: 'RT003', staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', age: 49, yearsOfService: 18, retirementDate: '2041-02-10', status: 'Active' },
  { id: 'RT004', staffName: 'Nurse Blessing Okonkwo', role: 'Nurse', age: 55, yearsOfService: 30, retirementDate: '2030-12-12', status: 'Approaching' },
  { id: 'RT005', staffName: 'Mrs. Adebimpe Lawal', role: 'Director of Finance', age: 60, yearsOfService: 35, retirementDate: '2026-08-30', status: 'Due' },
];

export interface PaymentRecord {
  id: string;
  patient: string;
  invoiceId: string;
  amount: number;
  method: 'Cash' | 'Transfer' | 'Card' | 'Remita' | 'NHIS' | 'Online';
  receivedBy: string;
  time: string;
  status: 'Successful' | 'Pending' | 'Failed';
  channel?: 'Cash' | 'Transfer' | 'Online' | 'NHIS';
}

export const paymentRecords: PaymentRecord[] = [
  { id: 'PMT001', patient: 'John Doe',          invoiceId: 'GFA HMS-INV-1001', amount: 5000,   method: 'Cash',     receivedBy: 'Mrs. Adebimpe Lawal', time: '08:42 AM', status: 'Successful', channel: 'Cash' },
  { id: 'PMT002', patient: 'Amina Yusuf',       invoiceId: 'GFA HMS-INV-1002', amount: 10000,  method: 'NHIS',     receivedBy: 'Nurse Ifeoma Okeke',  time: '09:15 AM', status: 'Successful', channel: 'NHIS' },
  { id: 'PMT003', patient: 'Funke Adeyemi',     invoiceId: 'GFA HMS-INV-1004', amount: 50000,  method: 'Transfer', receivedBy: 'Mrs. Adebimpe Lawal', time: '10:02 AM', status: 'Successful', channel: 'Transfer' },
  { id: 'PMT004', patient: 'Ibrahim Musa',      invoiceId: 'GFA HMS-INV-1005', amount: 100000, method: 'Card',     receivedBy: 'Cashier — Bola Ade',  time: '10:48 AM', status: 'Successful', channel: 'Online' },
  { id: 'PMT005', patient: 'Tunde Bakare',      invoiceId: 'GFA HMS-INV-1007', amount: 8000,   method: 'Cash',     receivedBy: 'Cashier — Bola Ade',  time: '11:30 AM', status: 'Successful', channel: 'Cash' },
  { id: 'PMT006', patient: 'Adebayo Ogundimu',  invoiceId: 'GFA HMS-INV-1009', amount: 300000, method: 'Remita',   receivedBy: 'Mrs. Adebimpe Lawal', time: '12:14 PM', status: 'Successful', channel: 'Online' },
  { id: 'PMT007', patient: 'Kemi Afolabi',      invoiceId: 'GFA HMS-INV-1010', amount: 17000,  method: 'NHIS',     receivedBy: 'Nurse Ifeoma Okeke',  time: '01:05 PM', status: 'Successful', channel: 'NHIS' },
  { id: 'PMT008', patient: 'Halima Abdullahi',  invoiceId: 'GFA HMS-INV-1008', amount: 25000,  method: 'Transfer', receivedBy: 'Cashier — Bola Ade',  time: '02:00 PM', status: 'Pending',    channel: 'Transfer' },
];

export interface CashFlowEntry {
  staffName: string;
  amount: number;
  method: 'Cash' | 'Transfer' | 'Card' | 'Remita';
  time: string;
}

export const cashFlowDetails: CashFlowEntry[] = [
  { staffName: 'Cashier — Bola Ade', amount: 60000, method: 'Cash', time: '11:30 AM' },
  { staffName: 'Cashier — Bola Ade', amount: 110000, method: 'Card', time: '10:48 AM' },
  { staffName: 'Mrs. Adebimpe Lawal', amount: 350000, method: 'Transfer', time: '10:02 AM' },
  { staffName: 'Mrs. Adebimpe Lawal', amount: 300000, method: 'Remita', time: '12:14 PM' },
];

export interface DepartmentRevenue {
  department: string;
  revenue: number;
  services: number;
  topService: string;
}

export const departmentRevenue: DepartmentRevenue[] = [
  { department: 'Surgery', revenue: 45000000, services: 412, topService: 'Major Surgery' },
  { department: 'Maternity', revenue: 28000000, services: 256, topService: 'Caesarean Section' },
  { department: 'Internal Medicine', revenue: 18500000, services: 1340, topService: 'Specialist Consultation' },
  { department: 'Radiology', revenue: 16200000, services: 480, topService: 'MRI Scan' },
  { department: 'Laboratory', revenue: 12800000, services: 2210, topService: 'Malaria Test' },
  { department: 'Pediatrics', revenue: 7400000, services: 612, topService: 'Pediatric Consultation' },
  { department: 'Pharmacy', revenue: 6800000, services: 3120, topService: 'Antimalarial Pack' },
];

export interface StaffRevenueRow {
  staffName: string;
  role: string;
  invoicesCreated: number;
  totalRevenue: number;
  paymentMix: string;
}

export const staffRevenueRows: StaffRevenueRow[] = [
  { staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', invoicesCreated: 84, totalRevenue: 12400000, paymentMix: 'Card 60% / Transfer 40%' },
  { staffName: 'Dr. Emeka Okafor', role: 'Physician', invoicesCreated: 132, totalRevenue: 5200000, paymentMix: 'Cash 30% / Transfer 70%' },
  { staffName: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', invoicesCreated: 240, totalRevenue: 3100000, paymentMix: 'Cash 80% / Card 20%' },
  { staffName: 'Dr. Balogun', role: 'OB/GYN', invoicesCreated: 56, totalRevenue: 9800000, paymentMix: 'Transfer 70% / Remita 30%' },
  { staffName: 'Dr. Aisha Bello', role: 'Radiologist', invoicesCreated: 78, totalRevenue: 6700000, paymentMix: 'Card 50% / Transfer 50%' },
  { staffName: 'Dr. Chinedu Eze', role: 'Pediatrician', invoicesCreated: 96, totalRevenue: 1900000, paymentMix: 'Cash 60% / Card 40%' },
];

export interface RevenueTrendPoint {
  label: string;
  amount: number;
}

export const revenueTrendDaily: RevenueTrendPoint[] = [
  { label: 'Mon', amount: 4200000 }, { label: 'Tue', amount: 5100000 }, { label: 'Wed', amount: 6300000 },
  { label: 'Thu', amount: 4800000 }, { label: 'Fri', amount: 7200000 }, { label: 'Sat', amount: 3100000 }, { label: 'Sun', amount: 1800000 },
];

export const revenueTrendMonthly: RevenueTrendPoint[] = [
  { label: 'Jan', amount: 145000000 }, { label: 'Feb', amount: 162000000 }, { label: 'Mar', amount: 188000000 },
  { label: 'Apr', amount: 174000000 },
];

export interface DoctorPerformance {
  patientsSeen: number;
  revenueGenerated: number;
  rating: number;
  completionRate: number;
}

export const doctorPerformance: DoctorPerformance = {
  patientsSeen: 312, revenueGenerated: 4200000, rating: 4.6, completionRate: 92,
};

export interface DoctorAttendanceRow {
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'Present' | 'Absent' | 'Late';
}

export const myAttendanceHistory: DoctorAttendanceRow[] = [
  { date: '2026-04-28', checkIn: '07:55 AM', checkOut: '04:10 PM', status: 'Present' },
  { date: '2026-04-27', checkIn: '08:02 AM', checkOut: '04:05 PM', status: 'Late' },
  { date: '2026-04-26', checkIn: '07:50 AM', checkOut: '04:00 PM', status: 'Present' },
  { date: '2026-04-25', checkIn: '—', checkOut: '—', status: 'Absent' },
  { date: '2026-04-24', checkIn: '07:48 AM', checkOut: '04:12 PM', status: 'Present' },
];

export interface PerformanceRow {
  staffName: string;
  role: string;
  daysPresent: number;
  daysAbsent: number;
  performanceScore: number;
}

export const performanceRows: PerformanceRow[] = [
  { staffName: 'Dr. Adewale Ogunleye', role: 'Surgeon', daysPresent: 22, daysAbsent: 1, performanceScore: 94 },
  { staffName: 'Dr. Fatimah Ibrahim', role: 'Lab Scientist', daysPresent: 20, daysAbsent: 3, performanceScore: 86 },
  { staffName: 'Nurse Blessing Okonkwo', role: 'Nurse', daysPresent: 23, daysAbsent: 0, performanceScore: 97 },
  { staffName: 'Dr. Emeka Okafor', role: 'Physician', daysPresent: 21, daysAbsent: 2, performanceScore: 90 },
  { staffName: 'Dr. Aisha Bello', role: 'Radiologist', daysPresent: 15, daysAbsent: 8, performanceScore: 64 },
  { staffName: 'Mr. Kunle Adeola', role: 'Admin Officer', daysPresent: 22, daysAbsent: 1, performanceScore: 92 },
];

export interface BookingRow {
  id: string;
  bookingCode: string;
  patient: string;
  service: string;
  time: string;
  status: 'Verified' | 'Pending' | 'Attended';
}

export const bookingsToVerify: BookingRow[] = [
  { id: 'BK001', bookingCode: 'GFA HMS-12345', patient: 'John Doe', service: 'General Consultation', time: '10:00 AM', status: 'Verified' },
  { id: 'BK002', bookingCode: 'GFA HMS-12346', patient: 'Amina Yusuf', service: 'Lab — Malaria Test', time: '10:30 AM', status: 'Pending' },
  { id: 'BK003', bookingCode: 'GFA HMS-12347', patient: 'Funke Adeyemi', service: 'Antenatal Care', time: '11:00 AM', status: 'Attended' },
  { id: 'BK004', bookingCode: 'GFA HMS-12348', patient: 'Chidi Eze', service: 'ECG', time: '11:30 AM', status: 'Pending' },
];
