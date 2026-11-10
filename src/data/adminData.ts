import { hospitalServices } from '@/data/invoiceData';
import { staffMembers } from '@/data/dummyData';

export const ADMIN_STORAGE_KEY = 'gfa_admin_v1';

export type DeptStatus = 'Active' | 'Inactive';
export type ServiceStatus = 'Active' | 'Inactive';
export type StaffStatus = 'Active' | 'Inactive' | 'Absent' | 'On leave';
export type ReportStatus = 'Draft' | 'Submitted' | 'Under Review' | 'Needs Clarification' | 'Reviewed' | 'Closed';
export type IssueSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type IssueStatus = 'Open' | 'In progress' | 'Closed';

export interface AdminDepartment {
  id: string;
  name: string;
  head: string;
  phone: string;
  email: string;
  location: string;
  status: DeptStatus;
  /** Set when a department store supplies live counts. */
  liveKey?: 'dental' | 'eye' | 'paeds';
  patientsToday: number;
  waiting: number;
  completed: number;
  staffOnDuty: number;
  bedsOccupied: number;
  bedsTotal: number;
}

export interface CatalogueService {
  id: string;
  code: string;
  name: string;
  department: string;
  category: string;
  description: string;
  price: number;
  status: ServiceStatus;
  updatedAt: string;
  updatedBy: string;
}

export interface PriceChange {
  id: string;
  serviceId: string;
  serviceCode: string;
  previous: number;
  next: number;
  effectiveDate: string;
  reason: string;
  by: string;
  at: string;
}

export interface AdminStaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  status: StaffStatus;
  phone: string;
  shift: string;
  joined: string;
  daysPresent: number;
  daysExpected: number;
}

export interface ReportComment {
  at: string;
  by: string;
  text: string;
}

export interface DeptReport {
  id: string;
  title: string;
  department: string;
  officer: string;
  period: string;
  category: string;
  summary: string;
  metrics: string;
  challenges: string;
  actionsTaken: string;
  supportNeeded: string;
  owner: string;
  status: ReportStatus;
  submittedAt: string;
  comments: ReportComment[];
}

export interface AdminIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  department: string;
  status: IssueStatus;
  href: string;
}

export interface AdminSettings {
  hospitalName: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
}

export interface AdminState {
  departments: AdminDepartment[];
  services: CatalogueService[];
  priceHistory: PriceChange[];
  staff: AdminStaffMember[];
  reports: DeptReport[];
  issues: AdminIssue[];
  settings: AdminSettings;
}

export interface MoneyInvoice {
  amount: number;
  amountPaid: number;
  balance: number;
  createdAt: string;
  department?: string;
  status?: string;
  channelUsed?: string;
}

export interface MoneySummary {
  billed: number;
  gross: number;
  refunds: number;
  net: number;
  outstanding: number;
  discounts: number;
}

export function localToday(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function invoiceDay(createdAt: string): string {
  return (createdAt || '').slice(0, 10);
}

export function sameDepartment(invoiceDepartment: string | undefined, adminName: string): boolean {
  const value = (invoiceDepartment ?? '').toLowerCase();
  const aliases: Record<string, string[]> = {
    Paediatrics: ['paediatrics', 'pediatrics'],
    'Obstetrics and Gynaecology': ['obstetrics and gynaecology', 'maternity'],
  };
  return (aliases[adminName] ?? [adminName.toLowerCase()]).includes(value);
}

export function filterByDay<T extends { createdAt: string }>(rows: T[], from: string, to: string): T[] {
  return rows.filter((row) => {
    const day = invoiceDay(row.createdAt);
    return day >= from && day <= to;
  });
}

export function billingSpan(rows: { createdAt: string }[], fallback: string): { from: string; to: string } {
  if (!rows.length) return { from: fallback, to: fallback };
  const days = rows.map((row) => invoiceDay(row.createdAt)).sort();
  return { from: days[0], to: days[days.length - 1] };
}

/** Collected is the current amount paid. Refunds are shown separately and are not subtracted again. */
export function summariseMoney(invoices: MoneyInvoice[], refunds: number): MoneySummary {
  const billed = invoices.reduce((sum, row) => sum + row.amount, 0);
  const net = invoices.reduce((sum, row) => sum + row.amountPaid, 0);
  const outstanding = invoices.reduce((sum, row) => sum + row.balance, 0);
  return {
    billed,
    gross: net + refunds,
    refunds,
    net,
    outstanding,
    discounts: 0,
  };
}

export function refundsFromAudit(actions: string[]): number {
  return actions.reduce((sum, action) => {
    if (!action.includes('REVERSAL')) return sum;
    const match = action.match(/₦([\d,]+)/);
    return sum + (match ? Number(match[1].replaceAll(',', '')) : 0);
  }, 0);
}

export function changeServicePrice(
  service: CatalogueService,
  history: PriceChange[],
  input: { price: number; reason: string; effectiveDate: string; by: string; at: string },
): { service: CatalogueService; history: PriceChange[] } {
  const entry: PriceChange = {
    id: `PRC-${Date.now()}`,
    serviceId: service.id,
    serviceCode: service.code,
    previous: service.price,
    next: input.price,
    effectiveDate: input.effectiveDate,
    reason: input.reason.trim(),
    by: input.by,
    at: input.at,
  };
  return {
    service: { ...service, price: input.price, updatedAt: input.effectiveDate, updatedBy: input.by },
    history: [entry, ...history],
  };
}

/** Opening a report must not change its status. */
export function openedReport(report: DeptReport): DeptReport {
  return report;
}

export function transitionReport(
  report: DeptReport,
  status: ReportStatus,
  comment?: ReportComment,
): { ok: true; report: DeptReport } | { ok: false; message: string } {
  if (status === 'Needs Clarification' && !comment?.text.trim()) {
    return { ok: false, message: 'A clarification note is required.' };
  }
  return {
    ok: true,
    report: {
      ...report,
      status,
      comments: comment?.text.trim() ? [...report.comments, comment] : report.comments,
    },
  };
}

const extraServices: Omit<CatalogueService, 'updatedAt' | 'updatedBy'>[] = [
  { id: 'SVC-DEN-001', code: 'DEN-CONS', name: 'Dental consultation', department: 'Dental', category: 'Consultation', description: 'New or review dental consultation. Department catalogue prices are unchanged.', price: 15000, status: 'Active' },
  { id: 'SVC-DEN-002', code: 'DEN-SCALE', name: 'Scaling and polishing', department: 'Dental', category: 'Procedure', description: 'Demonstration price for future hospital bills only.', price: 25000, status: 'Active' },
  { id: 'SVC-EYE-001', code: 'EYE-EXAM', name: 'Eye examination', department: 'Eye Clinic', category: 'Consultation', description: 'General ophthalmic examination.', price: 15000, status: 'Active' },
  { id: 'SVC-EYE-002', code: 'EYE-IOP', name: 'Intraocular pressure check', department: 'Eye Clinic', category: 'Investigation', description: 'Pressure measurement only. No diagnosis is stored here.', price: 8000, status: 'Active' },
  { id: 'SVC-PAE-001', code: 'PAE-CONS', name: 'Paediatric consultation', department: 'Paediatrics', category: 'Consultation', description: 'Child consultation fee for future bills.', price: 12000, status: 'Active' },
  { id: 'SVC-PAE-002', code: 'PAE-BED', name: 'Paediatric bed day', department: 'Paediatrics', category: 'Bed', description: 'Demonstration bed charge. Not posted to the cashier automatically.', price: 20000, status: 'Active' },
];

function catalogueFromHospital(today: string): CatalogueService[] {
  const mapped = hospitalServices.map((service) => ({
    id: service.id,
    code: service.id,
    name: service.name,
    department: service.department === 'Pediatrics' ? 'Paediatrics' : service.department === 'Maternity' ? 'Obstetrics and Gynaecology' : service.department,
    category: service.category,
    description: service.duration ? `Typical duration ${service.duration}.` : 'Hospital service catalogue item.',
    price: service.pricing.private,
    status: service.status,
    updatedAt: today,
    updatedBy: 'Demonstration seed',
  }));
  return [...mapped, ...extraServices.map((service) => ({ ...service, updatedAt: today, updatedBy: 'Demonstration seed' }))];
}

export function buildAdminSeed(today: string): AdminState {
  const departments: AdminDepartment[] = [
    { id: 'DEP-OPD', name: 'Outpatient Department', head: 'Dr. Emeka Okafor', phone: '08030000001', email: 'opd@gfa-health.demo', location: 'Block A', status: 'Active', patientsToday: 86, waiting: 14, completed: 61, staffOnDuty: 9, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-EM', name: 'Emergency', head: 'Dr. Chinedu Eze', phone: '08030000002', email: 'emergency@gfa-health.demo', location: 'Block A', status: 'Active', patientsToday: 22, waiting: 4, completed: 16, staffOnDuty: 6, bedsOccupied: 8, bedsTotal: 12 },
    { id: 'DEP-DEN', name: 'Dental', head: 'Dr. Yetunde Akinola', phone: '08030000003', email: 'dental@gfa-health.demo', location: 'Dental suite', status: 'Active', liveKey: 'dental', patientsToday: 0, waiting: 0, completed: 0, staffOnDuty: 3, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-EYE', name: 'Eye Clinic', head: 'Dr. Adaeze Okonkwo', phone: '08030000004', email: 'eye@gfa-health.demo', location: 'Eye suite', status: 'Active', liveKey: 'eye', patientsToday: 0, waiting: 0, completed: 0, staffOnDuty: 3, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-PAE', name: 'Paediatrics', head: 'Dr. Funmilayo Adeyemi', phone: '08030000005', email: 'paeds@gfa-health.demo', location: 'Paediatric ward', status: 'Active', liveKey: 'paeds', patientsToday: 0, waiting: 0, completed: 0, staffOnDuty: 4, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-OBG', name: 'Obstetrics and Gynaecology', head: 'Dr. Fatimah Ibrahim', phone: '08030000006', email: 'maternity@gfa-health.demo', location: 'Maternity block', status: 'Active', patientsToday: 18, waiting: 3, completed: 12, staffOnDuty: 7, bedsOccupied: 16, bedsTotal: 24 },
    { id: 'DEP-IM', name: 'Internal Medicine', head: 'Dr. Ngozi Ikedife', phone: '08030000007', email: 'medicine@gfa-health.demo', location: 'Block B', status: 'Active', patientsToday: 40, waiting: 9, completed: 27, staffOnDuty: 8, bedsOccupied: 22, bedsTotal: 30 },
    { id: 'DEP-SUR', name: 'Surgery', head: 'Dr. Adewale Ogunleye', phone: '08030000008', email: 'surgery@gfa-health.demo', location: 'Theatre block', status: 'Active', patientsToday: 11, waiting: 2, completed: 7, staffOnDuty: 6, bedsOccupied: 14, bedsTotal: 20 },
    { id: 'DEP-LAB', name: 'Laboratory', head: 'Mr. Sola Adebanjo', phone: '08030000009', email: 'lab@gfa-health.demo', location: 'Diagnostic block', status: 'Active', patientsToday: 54, waiting: 11, completed: 39, staffOnDuty: 5, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-RAD', name: 'Radiology', head: 'Dr. Aisha Bello', phone: '08030000010', email: 'radiology@gfa-health.demo', location: 'Diagnostic block', status: 'Active', patientsToday: 21, waiting: 6, completed: 12, staffOnDuty: 2, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-PHA', name: 'Pharmacy', head: 'Pharm. Yetunde Salami', phone: '08030000011', email: 'pharmacy@gfa-health.demo', location: 'Paypoint corridor', status: 'Active', patientsToday: 47, waiting: 8, completed: 36, staffOnDuty: 4, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-NUR', name: 'Nursing and wards', head: 'Nurse Blessing Okonkwo', phone: '08030000012', email: 'nursing@gfa-health.demo', location: 'Wards', status: 'Active', patientsToday: 30, waiting: 0, completed: 6, staffOnDuty: 18, bedsOccupied: 40, bedsTotal: 60 },
    { id: 'DEP-REC', name: 'Medical Records', head: 'Mr. Femi Oduwole', phone: '08030000013', email: 'records@gfa-health.demo', location: 'Records office', status: 'Active', patientsToday: 28, waiting: 5, completed: 22, staffOnDuty: 3, bedsOccupied: 0, bedsTotal: 0 },
    { id: 'DEP-BIL', name: 'Billing and Paypoint', head: 'Mrs. Hafsat Bello', phone: '08030000014', email: 'cashier@gfa-health.demo', location: 'Paypoint', status: 'Active', patientsToday: 33, waiting: 7, completed: 24, staffOnDuty: 3, bedsOccupied: 0, bedsTotal: 0 },
  ];

  const staff: AdminStaffMember[] = staffMembers.map((member, index) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    department: member.department === 'Pediatrics' ? 'Paediatrics' : member.department === 'Maternity' ? 'Obstetrics and Gynaecology' : member.department === 'Administration' ? 'Medical Records' : member.department,
    status: member.status === 'Absent' ? 'Absent' : member.status === 'Inactive' ? 'On leave' : 'Active',
    phone: `0802${String(1000000 + index).slice(0, 7)}`,
    shift: member.status === 'Absent' ? 'Not assigned' : 'Morning · demonstration roster',
    joined: '2022-03-01',
    daysPresent: member.daysPresent,
    daysExpected: member.daysExpected,
  }));

  const reports: DeptReport[] = [
    {
      id: 'RPT-0001', title: 'Laboratory daily activity', department: 'Laboratory', officer: 'Mr. Sola Adebanjo', period: today, category: 'Daily departmental activity',
      summary: 'Morning samples were received. A batch of chemistry results is still pending validation.',
      metrics: 'Demonstration counts are on the operations page. This report does not replace the laboratory system.',
      challenges: 'One analyser is awaiting a service visit.', actionsTaken: 'Samples were prioritised for the ward.', supportNeeded: 'Confirm the service visit date.',
      owner: 'Admin Officer', status: 'Submitted', submittedAt: today, comments: [],
    },
    {
      id: 'RPT-0002', title: 'Dental clinic day report', department: 'Dental', officer: 'Dr. Yetunde Akinola', period: today, category: 'Service delivery and patient volume',
      summary: 'Chairs ran through the morning list.', metrics: 'Live appointment counts are on the dental dashboard.',
      challenges: 'None recorded.', actionsTaken: 'List completed for the morning.', supportNeeded: 'None.',
      owner: '', status: 'Reviewed', submittedAt: today, comments: [{ at: today, by: 'Dr. Adekunle Balogun', text: 'Noted. No further action.' }],
    },
  ];

  const issues: AdminIssue[] = [
    { id: 'ISS-0001', severity: 'High', title: 'Radiology daily report not submitted', detail: 'No report from Radiology is in the review queue for this period.', department: 'Radiology', status: 'Open', href: '/dashboard/admin/reports' },
    { id: 'ISS-0002', severity: 'Medium', title: 'Radiology attendance gap', detail: 'The demonstration roster shows a radiologist absent. This is not a biometric clock-in.', department: 'Radiology', status: 'Open', href: '/dashboard/admin/staff?department=Radiology' },
    { id: 'ISS-0003', severity: 'Low', title: 'Executive health package inactive', detail: 'A packaged service is inactive in the existing package list.', department: 'Billing and Paypoint', status: 'Open', href: '/dashboard/admin/packages' },
  ];

  return {
    departments,
    services: catalogueFromHospital(today),
    priceHistory: [],
    staff,
    reports,
    issues,
    settings: {
      hospitalName: 'GFA Demo Hospital',
      phone: '08090000000',
      email: 'admin@gfa-health.demo',
      address: 'GFA Demo Hospital, Abuja',
      categories: [...new Set(catalogueFromHospital(today).map((service) => service.category))].sort(),
    },
  };
}
