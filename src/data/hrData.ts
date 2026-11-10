// Comprehensive HR & Workforce Intelligence data for GFA HMS

export type StaffGrade = 'GL07' | 'GL08' | 'GL09' | 'GL10' | 'GL12' | 'GL14' | 'GL15' | 'GL16' | 'GL17';
export type EmploymentType = 'Full-time' | 'Contract' | 'NYSC' | 'Locum' | 'Resident';

export interface StaffProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  grade: StaffGrade;
  employmentType: EmploymentType;
  email: string;
  phone: string;
  joined: string;
  licenseNo?: string;
  licenseExpiry?: string;
  nextOfKin: string;
  baseSalary: number;
  status: 'Active' | 'On Leave' | 'Suspended' | 'Exited';
}

export const staffProfiles: StaffProfile[] = [
  { id: 'OOH/STF/001', name: 'Dr. Adewale Ogunleye', role: 'Consultant Surgeon', department: 'Surgery', grade: 'GL15', employmentType: 'Full-time', email: 'adewale.o@gfa-health.demo', phone: '08031234567', joined: '2014-03-12', licenseNo: 'MDCN/12345', licenseExpiry: '2026-12-31', nextOfKin: 'Mrs. Folake Ogunleye', baseSalary: 750000, status: 'Active' },
  { id: 'OOH/STF/002', name: 'Dr. Fatimah Ibrahim', role: 'Senior Lab Scientist', department: 'Laboratory', grade: 'GL12', employmentType: 'Full-time', email: 'fatimah.i@gfa-health.demo', phone: '08032234567', joined: '2017-08-21', licenseNo: 'MLSCN/8821', licenseExpiry: '2026-06-15', nextOfKin: 'Mallam Sani Ibrahim', baseSalary: 380000, status: 'Active' },
  { id: 'OOH/STF/003', name: 'Nurse Blessing Okonkwo', role: 'Senior Nurse', department: 'Maternity', grade: 'GL10', employmentType: 'Full-time', email: 'blessing.o@gfa-health.demo', phone: '08033234567', joined: '2012-01-05', licenseNo: 'NMCN/4412', licenseExpiry: '2027-02-28', nextOfKin: 'Mr. Ifeanyi Okonkwo', baseSalary: 280000, status: 'Active' },
  { id: 'OOH/STF/004', name: 'Dr. Emeka Okafor', role: 'Consultant Physician', department: 'Internal Medicine', grade: 'GL14', employmentType: 'Full-time', email: 'emeka.o@gfa-health.demo', phone: '08034234567', joined: '2015-09-10', licenseNo: 'MDCN/22871', licenseExpiry: '2025-11-30', nextOfKin: 'Mrs. Adaeze Okafor', baseSalary: 620000, status: 'Active' },
  { id: 'OOH/STF/005', name: 'Dr. Aisha Bello', role: 'Radiologist', department: 'Radiology', grade: 'GL14', employmentType: 'Full-time', email: 'aisha.b@gfa-health.demo', phone: '08035234567', joined: '2016-04-18', licenseNo: 'MDCN/32901', licenseExpiry: '2026-04-12', nextOfKin: 'Alh. Bello Garba', baseSalary: 580000, status: 'Active' },
  { id: 'OOH/STF/006', name: 'Mr. Kunle Adeola', role: 'Admin Officer II', department: 'Administration', grade: 'GL09', employmentType: 'Full-time', email: 'kunle.a@gfa-health.demo', phone: '08036234567', joined: '2010-07-02', nextOfKin: 'Mrs. Bisi Adeola', baseSalary: 220000, status: 'Active' },
  { id: 'OOH/STF/007', name: 'Dr. Chinedu Eze', role: 'Pediatrician', department: 'Pediatrics', grade: 'GL12', employmentType: 'Full-time', email: 'chinedu.e@gfa-health.demo', phone: '08037234567', joined: '2018-02-14', licenseNo: 'MDCN/41122', licenseExpiry: '2026-08-20', nextOfKin: 'Mrs. Ifeoma Eze', baseSalary: 540000, status: 'On Leave' },
  { id: 'OOH/STF/008', name: 'Nurse Folake Adesanya', role: 'Staff Nurse', department: 'Surgery', grade: 'GL08', employmentType: 'Full-time', email: 'folake.a@gfa-health.demo', phone: '08038234567', joined: '2019-11-22', licenseNo: 'NMCN/9931', licenseExpiry: '2027-03-15', nextOfKin: 'Mr. Tunde Adesanya', baseSalary: 240000, status: 'Active' },
  { id: 'OOH/STF/009', name: 'Pharm. Yetunde Salami', role: 'Senior Pharmacist', department: 'Pharmacy', grade: 'GL12', employmentType: 'Full-time', email: 'yetunde.s@gfa-health.demo', phone: '08039234567', joined: '2016-06-08', licenseNo: 'PCN/5521', licenseExpiry: '2026-07-30', nextOfKin: 'Mr. Lekan Salami', baseSalary: 420000, status: 'Active' },
  { id: 'OOH/STF/010', name: 'Dr. Ibrahim Sule', role: 'Resident Doctor', department: 'Surgery', grade: 'GL10', employmentType: 'Resident', email: 'ibrahim.s@gfa-health.demo', phone: '08040234567', joined: '2023-10-01', licenseNo: 'MDCN/55421', licenseExpiry: '2026-10-01', nextOfKin: 'Hajia Asma Sule', baseSalary: 320000, status: 'Active' },
  { id: 'OOH/STF/011', name: 'Mr. Tope Ajayi', role: 'NYSC Doctor', department: 'A&E', grade: 'GL08', employmentType: 'NYSC', email: 'tope.a@gfa-health.demo', phone: '08041234567', joined: '2025-11-12', nextOfKin: 'Mr. Dapo Ajayi', baseSalary: 90000, status: 'Active' },
  { id: 'OOH/STF/012', name: 'Mrs. Hafsat Bello', role: 'Cashier', department: 'Billing & Cash', grade: 'GL07', employmentType: 'Full-time', email: 'hafsat.b@gfa-health.demo', phone: '08042234567', joined: '2020-05-18', nextOfKin: 'Mr. Usman Bello', baseSalary: 180000, status: 'Active' },
];

export interface StaffKpi {
  staffId: string;
  staffName: string;
  role: string;
  department: string;
  attendanceScore: number;       // 0-100
  productivityScore: number;     // 0-100
  efficiencyScore: number;       // 0-100
  complianceScore: number;       // 0-100
  performanceScore: number;      // weighted
  band: 'High' | 'Average' | 'Needs Attention';
  patientsHandled?: number;
  revenueGenerated?: number;
  avgTurnaroundMin?: number;
}

const calcScore = (a: number, p: number, e: number, c: number) =>
  Math.round(a * 0.2 + p * 0.4 + e * 0.2 + c * 0.2);
const band = (s: number): StaffKpi['band'] => (s >= 80 ? 'High' : s >= 50 ? 'Average' : 'Needs Attention');

export const staffKpis: StaffKpi[] = (
  [
    { staffId: 'OOH/STF/001', a: 96, p: 94, e: 91, c: 98, ph: 312, rev: 12400000, tt: 22 },
    { staffId: 'OOH/STF/002', a: 87, p: 88, e: 82, c: 95, ph: 0, rev: 3100000, tt: 38 },
    { staffId: 'OOH/STF/003', a: 100, p: 96, e: 95, c: 100, ph: 286, rev: 0, tt: undefined },
    { staffId: 'OOH/STF/004', a: 91, p: 92, e: 88, c: 90, ph: 268, rev: 5200000, tt: 18 },
    { staffId: 'OOH/STF/005', a: 65, p: 70, e: 62, c: 60, ph: 142, rev: 6700000, tt: 45 },
    { staffId: 'OOH/STF/006', a: 95, p: 86, e: 90, c: 95, ph: 0, rev: 0, tt: undefined },
    { staffId: 'OOH/STF/007', a: 0, p: 0, e: 0, c: 80, ph: 0, rev: 0, tt: undefined },
    { staffId: 'OOH/STF/008', a: 87, p: 84, e: 80, c: 88, ph: 198, rev: 0, tt: undefined },
    { staffId: 'OOH/STF/009', a: 92, p: 90, e: 88, c: 96, ph: 0, rev: 6800000, tt: 12 },
    { staffId: 'OOH/STF/010', a: 88, p: 82, e: 78, c: 90, ph: 178, rev: 1400000, tt: 28 },
    { staffId: 'OOH/STF/011', a: 95, p: 78, e: 76, c: 100, ph: 124, rev: 600000, tt: 32 },
    { staffId: 'OOH/STF/012', a: 92, p: 91, e: 95, c: 92, ph: 0, rev: 0, tt: undefined },
  ] as const
).map((r) => {
  const sp = staffProfiles.find((s) => s.id === r.staffId)!;
  const score = calcScore(r.a, r.p, r.e, r.c);
  return {
    staffId: r.staffId, staffName: sp.name, role: sp.role, department: sp.department,
    attendanceScore: r.a, productivityScore: r.p, efficiencyScore: r.e, complianceScore: r.c,
    performanceScore: score, band: band(score),
    patientsHandled: r.ph || undefined, revenueGenerated: r.rev || undefined, avgTurnaroundMin: r.tt,
  };
});

export interface DepartmentKpi {
  department: string;
  totalStaff: number;
  attendanceRate: number;       // %
  productivity: number;         // % vs target
  revenueContribution: number;  // ₦
  efficiencyScore: number;
  alerts: number;
}

export const departmentKpis: DepartmentKpi[] = [
  { department: 'Surgery', totalStaff: 24, attendanceRate: 94, productivity: 112, revenueContribution: 45000000, efficiencyScore: 92, alerts: 1 },
  { department: 'Maternity', totalStaff: 18, attendanceRate: 96, productivity: 108, revenueContribution: 28000000, efficiencyScore: 95, alerts: 0 },
  { department: 'Internal Medicine', totalStaff: 22, attendanceRate: 91, productivity: 98, revenueContribution: 18500000, efficiencyScore: 88, alerts: 1 },
  { department: 'Radiology', totalStaff: 9, attendanceRate: 68, productivity: 72, revenueContribution: 16200000, efficiencyScore: 65, alerts: 4 },
  { department: 'Laboratory', totalStaff: 14, attendanceRate: 87, productivity: 95, revenueContribution: 12800000, efficiencyScore: 84, alerts: 1 },
  { department: 'Pediatrics', totalStaff: 12, attendanceRate: 82, productivity: 88, revenueContribution: 7400000, efficiencyScore: 81, alerts: 2 },
  { department: 'Pharmacy', totalStaff: 11, attendanceRate: 93, productivity: 104, revenueContribution: 6800000, efficiencyScore: 90, alerts: 0 },
  { department: 'A&E', totalStaff: 16, attendanceRate: 89, productivity: 101, revenueContribution: 9200000, efficiencyScore: 87, alerts: 1 },
];

export interface ShiftRosterEntry {
  id: string;
  date: string;
  staffName: string;
  department: string;
  shift: 'Morning' | 'Afternoon' | 'Night' | 'On-Call';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'No-show';
}

export const shiftRoster: ShiftRosterEntry[] = [
  { id: 'SH001', date: '2026-04-29', staffName: 'Dr. Adewale Ogunleye', department: 'Surgery', shift: 'Morning', status: 'In Progress' },
  { id: 'SH002', date: '2026-04-29', staffName: 'Nurse Blessing Okonkwo', department: 'Maternity', shift: 'Morning', status: 'In Progress' },
  { id: 'SH003', date: '2026-04-29', staffName: 'Dr. Ibrahim Sule', department: 'Surgery', shift: 'Night', status: 'Scheduled' },
  { id: 'SH004', date: '2026-04-29', staffName: 'Nurse Folake Adesanya', department: 'Surgery', shift: 'Afternoon', status: 'Scheduled' },
  { id: 'SH005', date: '2026-04-29', staffName: 'Dr. Emeka Okafor', department: 'Internal Medicine', shift: 'On-Call', status: 'Scheduled' },
  { id: 'SH006', date: '2026-04-29', staffName: 'Pharm. Yetunde Salami', department: 'Pharmacy', shift: 'Morning', status: 'In Progress' },
  { id: 'SH007', date: '2026-04-29', staffName: 'Dr. Aisha Bello', department: 'Radiology', shift: 'Morning', status: 'No-show' },
  { id: 'SH008', date: '2026-04-29', staffName: 'Mr. Tope Ajayi', department: 'A&E', shift: 'Night', status: 'Scheduled' },
];

export interface RecruitmentJob {
  id: string;
  title: string;
  department: string;
  applicants: number;
  shortlisted: number;
  stage: 'Open' | 'Screening' | 'Interview' | 'Offer' | 'Closed';
  posted: string;
}

export const recruitmentJobs: RecruitmentJob[] = [
  { id: 'JOB001', title: 'Consultant Cardiologist', department: 'Internal Medicine', applicants: 38, shortlisted: 6, stage: 'Interview', posted: '2026-03-10' },
  { id: 'JOB002', title: 'Theatre Nurse', department: 'Surgery', applicants: 124, shortlisted: 18, stage: 'Screening', posted: '2026-04-02' },
  { id: 'JOB003', title: 'Lab Scientist II', department: 'Laboratory', applicants: 87, shortlisted: 10, stage: 'Offer', posted: '2026-02-18' },
  { id: 'JOB004', title: 'Hospital Pharmacist', department: 'Pharmacy', applicants: 56, shortlisted: 8, stage: 'Open', posted: '2026-04-20' },
];

export interface OnboardingTask {
  id: string;
  hireName: string;
  role: string;
  department: string;
  step: 'Profile' | 'Access' | 'Roster' | 'Orientation' | 'Active';
  progress: number; // %
  startDate: string;
}

export const onboardingTasks: OnboardingTask[] = [
  { id: 'ON001', hireName: 'Dr. Halima Yusuf', role: 'Consultant Cardiologist', department: 'Internal Medicine', step: 'Orientation', progress: 80, startDate: '2026-04-22' },
  { id: 'ON002', hireName: 'Nurse Bolaji Adekunle', role: 'Theatre Nurse', department: 'Surgery', step: 'Access', progress: 45, startDate: '2026-04-26' },
  { id: 'ON003', hireName: 'Mr. Daniel Ojo', role: 'Lab Scientist II', department: 'Laboratory', step: 'Profile', progress: 20, startDate: '2026-04-28' },
];

export interface TrainingItem {
  id: string;
  staffName: string;
  program: string;
  type: 'CME' | 'Residency' | 'Mandatory' | 'Conference';
  due: string;
  status: 'Completed' | 'In Progress' | 'Overdue';
}

export const trainingItems: TrainingItem[] = [
  { id: 'TR001', staffName: 'Dr. Emeka Okafor', program: 'BLS Recertification', type: 'Mandatory', due: '2026-05-30', status: 'In Progress' },
  { id: 'TR002', staffName: 'Dr. Aisha Bello', program: 'Radiology Safety Update', type: 'Mandatory', due: '2026-04-15', status: 'Overdue' },
  { id: 'TR003', staffName: 'Pharm. Yetunde Salami', program: 'Pharmacovigilance CPD', type: 'CME', due: '2026-06-20', status: 'In Progress' },
  { id: 'TR004', staffName: 'Dr. Ibrahim Sule', program: 'Year-1 Residency Block', type: 'Residency', due: '2026-09-30', status: 'In Progress' },
  { id: 'TR005', staffName: 'Nurse Blessing Okonkwo', program: 'NANNM Annual Conference', type: 'Conference', due: '2026-07-12', status: 'Completed' },
];

export interface DisciplinaryCase {
  id: string;
  staffName: string;
  type: 'Warning' | 'Query' | 'Suspension' | 'Investigation';
  reason: string;
  date: string;
  status: 'Open' | 'Closed';
}

export const disciplinaryCases: DisciplinaryCase[] = [
  { id: 'DC001', staffName: 'Dr. Aisha Bello', type: 'Query', reason: 'Repeated absenteeism (8 days)', date: '2026-04-20', status: 'Open' },
  { id: 'DC002', staffName: 'Mr. Tope Ajayi', type: 'Warning', reason: 'Late to night shift x3', date: '2026-04-15', status: 'Closed' },
];

export interface ExitRecord {
  id: string;
  staffName: string;
  type: 'Resignation' | 'Retirement' | 'Termination';
  date: string;
  clearance: 'Pending' | 'In Progress' | 'Completed';
  finalPay: number;
}

export const exitRecords: ExitRecord[] = [
  { id: 'EX001', staffName: 'Mrs. Adebimpe Lawal', type: 'Retirement', date: '2026-08-30', clearance: 'In Progress', finalPay: 4200000 },
  { id: 'EX002', staffName: 'Dr. Omolade Akin', type: 'Resignation', date: '2026-04-15', clearance: 'Completed', finalPay: 920000 },
];

export interface HrAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: 'Attendance' | 'Performance' | 'Payroll' | 'Compliance' | 'Workload';
  message: string;
  time: string;
}

export const hrAlerts: HrAlert[] = [
  { id: 'AL001', level: 'critical', category: 'Attendance', message: 'Radiology absenteeism at 32% — below 70% threshold', time: '08:12 AM' },
  { id: 'AL002', level: 'critical', category: 'Compliance', message: 'Dr. Aisha Bello — license expires in 14 days', time: '07:45 AM' },
  { id: 'AL003', level: 'warning', category: 'Performance', message: '1 staff scoring < 70% this month (Radiology)', time: 'Yesterday' },
  { id: 'AL004', level: 'warning', category: 'Workload', message: 'Nurse Blessing logged 62 hrs this week — burnout risk', time: 'Today' },
  { id: 'AL005', level: 'info', category: 'Payroll', message: 'Apr-2026 payroll variance vs Mar: +2.4%', time: 'Today' },
  { id: 'AL006', level: 'warning', category: 'Compliance', message: '2 staff have overdue mandatory training', time: 'Today' },
];

export interface AttendanceTrendPoint { label: string; rate: number; }
export const attendanceTrend: AttendanceTrendPoint[] = [
  { label: 'Mon', rate: 92 }, { label: 'Tue', rate: 89 }, { label: 'Wed', rate: 91 },
  { label: 'Thu', rate: 87 }, { label: 'Fri', rate: 84 }, { label: 'Sat', rate: 78 }, { label: 'Sun', rate: 72 },
];

export interface PayrollVsRevenuePoint { label: string; payroll: number; revenue: number; }
export const payrollVsRevenue: PayrollVsRevenuePoint[] = [
  { label: 'Jan', payroll: 95000000, revenue: 145000000 },
  { label: 'Feb', payroll: 96000000, revenue: 162000000 },
  { label: 'Mar', payroll: 98000000, revenue: 188000000 },
  { label: 'Apr', payroll: 100400000, revenue: 174000000 },
];

export const hrTotals = {
  totalStaff: 168,
  activeStaff: 154,
  onLeave: 9,
  inactive: 5,
  attendanceRate: 89,
  avgPerformance: 84,
  monthlyPayroll: 100400000,
  payrollRevenueRatio: 57.7,
  openPositions: 4,
  expiringLicenses: 3,
  overdueTraining: 2,
  burnoutRisk: 6,
};
