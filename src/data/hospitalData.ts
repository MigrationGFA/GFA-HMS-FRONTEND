// Extra demo data: blog, management, careers, working hours, IT system status

export interface BlogArticle {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
}

export const blogArticles: BlogArticle[] = [
  { id: 'BL001', title: 'GFA HMS Launches New E-Health Consultation Platform', date: '2026-04-12', excerpt: 'Patients can now book and attend consultations online with our specialist doctors from anywhere in Nigeria.', author: 'GFA HMS Communications' },
  { id: 'BL002', title: 'Free Malaria Screening Outreach in Lagos Community', date: '2026-04-05', excerpt: 'Community Medicine department conducts free malaria screening for over 1,200 residents across Remo region.', author: 'Dr. Funmi Adeleke' },
  { id: 'BL003', title: 'Surgery Department Records 98% Success Rate in Q1', date: '2026-03-28', excerpt: 'Our General and Paediatric Surgery teams completed 412 procedures this quarter with outstanding outcomes.', author: 'Dr. Adewale Ogunleye' },
  { id: 'BL004', title: 'New Blood Bank Equipment Boosts Capacity', date: '2026-03-15', excerpt: 'GFA HMS receives upgraded refrigeration and screening equipment, doubling daily blood storage capacity.', author: 'Haematology Unit' },
  { id: 'BL005', title: 'Medical Student Conference Hosted on Campus', date: '2026-03-02', excerpt: 'Over 800 medical students from across Nigeria gathered to discuss innovations in tropical medicine.', author: 'Academic Affairs' },
  { id: 'BL006', title: 'NHIS Enrollment Drive — Open Through May', date: '2026-02-18', excerpt: 'GFA HMS partners with NHIS to enroll more patients into the national insurance scheme this season.', author: 'Finance & Billing' },
];

export interface ManagementMember {
  id: string;
  name: string;
  role: string;
  department: string;
  bio: string;
  initials: string;
}

export const managementTeam: ManagementMember[] = [
  { id: 'M001', name: 'Prof. Olusegun Akinyemi', role: 'Chief Medical Director (CMD)', department: 'Executive', bio: 'Over 30 years of clinical leadership; oversees the strategic direction of GFA HMS.', initials: 'OA' },
  { id: 'M002', name: 'Dr. Adekunle Balogun', role: 'Director of Administration', department: 'Management', bio: 'Leads hospital-wide administration, operations and digital transformation.', initials: 'AB' },
  { id: 'M003', name: 'Dr. Adewale Ogunleye', role: 'HOD, Surgery', department: 'Surgery', bio: 'Consultant surgeon specializing in minimally invasive procedures.', initials: 'AO' },
  { id: 'M004', name: 'Dr. Emeka Okafor', role: 'HOD, Internal Medicine', department: 'Medicine', bio: 'Internal medicine specialist with research interest in cardiology.', initials: 'EO' },
  { id: 'M005', name: 'Dr. Aisha Bello', role: 'HOD, Radiology', department: 'Radiology', bio: 'Radiologist focused on advanced imaging diagnostics and teaching.', initials: 'AB' },
  { id: 'M006', name: 'Mrs. Adebimpe Lawal', role: 'Director of Finance', department: 'Finance', bio: 'Oversees revenue assurance, billing systems and financial reporting.', initials: 'AL' },
  { id: 'M007', name: 'Mr. Tunji Akande', role: 'Head of Human Resources', department: 'HR', bio: 'Manages staffing, welfare, and training across all clinical and admin units.', initials: 'TA' },
  { id: 'M008', name: 'Mr. Bayo Olatunji', role: 'Head of IT / Systems', department: 'IT', bio: 'Leads technology operations and the GFA HMS digital health platform.', initials: 'BO' },
];

export interface CareerListing {
  id: string;
  title: string;
  department: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  location: string;
  deadline: string;
}

export const careerListings: CareerListing[] = [
  { id: 'JOB001', title: 'Consultant Surgeon', department: 'Surgery', type: 'Full-time', location: 'Lagos, Nigeria', deadline: '2026-05-30' },
  { id: 'JOB002', title: 'Medical Laboratory Scientist', department: 'Laboratory Services', type: 'Full-time', location: 'Lagos, Nigeria', deadline: '2026-05-15' },
  { id: 'JOB003', title: 'Registered Nurse (Paediatrics)', department: 'Paediatrics', type: 'Full-time', location: 'Lagos, Nigeria', deadline: '2026-05-20' },
  { id: 'JOB004', title: 'Pharmacist', department: 'Pharmacy', type: 'Contract', location: 'Lagos, Nigeria', deadline: '2026-06-10' },
  { id: 'JOB005', title: 'Health Information Officer', department: 'Health Information Management', type: 'Full-time', location: 'Lagos, Nigeria', deadline: '2026-05-25' },
  { id: 'JOB006', title: 'Radiographer', department: 'Radiology', type: 'Part-time', location: 'Lagos, Nigeria', deadline: '2026-06-01' },
];

export interface WorkingHour {
  department: string;
  weekday: string;
  weekend: string;
}

export const workingHours: WorkingHour[] = [
  { department: 'Outpatient (OPD)', weekday: '8:00 AM – 4:00 PM', weekend: 'Closed' },
  { department: 'Accident & Emergency', weekday: '24 / 7', weekend: '24 / 7' },
  { department: 'Laboratory Services', weekday: '7:00 AM – 8:00 PM', weekend: '9:00 AM – 2:00 PM' },
  { department: 'Radiology', weekday: '8:00 AM – 6:00 PM', weekend: '10:00 AM – 2:00 PM' },
  { department: 'Pharmacy', weekday: '8:00 AM – 8:00 PM', weekend: '10:00 AM – 4:00 PM' },
  { department: 'Antenatal Clinic', weekday: '8:00 AM – 12:00 PM', weekend: 'Closed' },
  { department: 'Surgery (Elective)', weekday: '8:00 AM – 4:00 PM', weekend: 'Emergency Only' },
  { department: 'Blood Bank', weekday: '24 / 7', weekend: '24 / 7' },
];

// IT / System status
export type SystemStatus = 'Active' | 'Warning' | 'Down';

export interface SystemFeature {
  id: string;
  name: string;
  status: SystemStatus;
  lastChecked: string;
  description: string;
  lastDowntime: string;
  affectedModules: string[];
  logs: string[];
}

export const initialSystemFeatures: SystemFeature[] = [
  { id: 'SYS001', name: 'Login System', status: 'Active', lastChecked: '2 mins ago', description: 'Authentication and session management for all roles.', lastDowntime: '2026-03-12 02:14', affectedModules: ['Auth', 'Sessions'], logs: ['INFO  All login flows healthy', 'INFO  324 successful logins in last hour'] },
  { id: 'SYS002', name: 'Registration', status: 'Active', lastChecked: '4 mins ago', description: 'New patient and staff account creation.', lastDowntime: '—', affectedModules: ['Auth'], logs: ['INFO  18 new patient registrations today'] },
  { id: 'SYS003', name: 'Appointment Booking', status: 'Active', lastChecked: '1 min ago', description: 'Patient appointment scheduling and slot allocation.', lastDowntime: '2026-04-02 11:30', affectedModules: ['Booking', 'Notifications'], logs: ['INFO  74 bookings processed today', 'INFO  Slot conflict logic OK'] },
  { id: 'SYS004', name: 'Invoice Generation', status: 'Warning', lastChecked: '6 mins ago', description: 'Generation of patient invoices from services.', lastDowntime: '2026-04-20 09:10', affectedModules: ['Invoicing', 'Services'], logs: ['WARN  Slow response on bulk invoice creation', 'INFO  Single-invoice generation healthy'] },
  { id: 'SYS005', name: 'Payment System (Payone)', status: 'Active', lastChecked: '3 mins ago', description: 'Card, transfer and Remita payment processing.', lastDowntime: '2026-04-18 18:42', affectedModules: ['Payments'], logs: ['INFO  ₦4.2M processed today', 'INFO  No failed transactions in last 30 mins'] },
  { id: 'SYS006', name: 'EMR Sync', status: 'Active', lastChecked: '7 mins ago', description: 'Electronic medical record synchronization across departments.', lastDowntime: '2026-04-10 03:15', affectedModules: ['EMR', 'Lab', 'Radiology'], logs: ['INFO  EMR sync queue: 0 pending'] },
  { id: 'SYS007', name: 'Doctor Scheduling', status: 'Active', lastChecked: '5 mins ago', description: 'Doctor availability slots and rotation.', lastDowntime: '—', affectedModules: ['Scheduling'], logs: ['INFO  All schedules synchronized'] },
  { id: 'SYS008', name: 'E-Health (Online Consultation)', status: 'Warning', lastChecked: '8 mins ago', description: 'Online video consultation system.', lastDowntime: '2026-04-22 14:00', affectedModules: ['Video', 'Booking'], logs: ['WARN  Intermittent latency reported on video calls', 'INFO  87% calls completed successfully today'] },
  { id: 'SYS009', name: 'Notification System (SMS/Email)', status: 'Down', lastChecked: '12 mins ago', description: 'SMS & email reminders to patients and staff.', lastDowntime: '2026-04-28 07:20', affectedModules: ['SMS', 'Email'], logs: ['ERROR  SMS gateway timeout', 'ERROR  Email queue backed up: 312 pending', 'INFO  IT team investigating'] },
  { id: 'SYS010', name: 'Camera / Video', status: 'Active', lastChecked: '2 mins ago', description: 'Webcam access for online consultation rooms.', lastDowntime: '—', affectedModules: ['Video'], logs: ['INFO  All consultation rooms online'] },
];

export interface SystemAlert {
  id: string;
  issue: string;
  feature: string;
  severity: 'Critical' | 'Warning' | 'Info';
  time: string;
}

export const initialAlerts: SystemAlert[] = [
  { id: 'AL001', issue: 'SMS gateway timeout', feature: 'Notification System (SMS/Email)', severity: 'Critical', time: '12 mins ago' },
  { id: 'AL002', issue: 'Slow bulk invoice generation', feature: 'Invoice Generation', severity: 'Warning', time: '6 mins ago' },
  { id: 'AL003', issue: 'Intermittent video latency', feature: 'E-Health (Online Consultation)', severity: 'Warning', time: '8 mins ago' },
  { id: 'AL004', issue: 'Backup completed successfully', feature: 'EMR Sync', severity: 'Info', time: '1 hr ago' },
];

// Doctor dashboard data
export interface DoctorAppointment {
  id: string;
  patient: string;
  type: string;
  mode: 'Online' | 'Physical';
  time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  amount: number;
}

export const doctorAppointments: DoctorAppointment[] = [
  { id: 'DA001', patient: 'John Doe', type: 'General Consultation', mode: 'Physical', time: 'Today 10:00 AM', status: 'Scheduled', amount: 10000 },
  { id: 'DA002', patient: 'Amina Yusuf', type: 'Specialist Consultation', mode: 'Online', time: 'Today 11:30 AM', status: 'Scheduled', amount: 25000 },
  { id: 'DA003', patient: 'Chidi Eze', type: 'Follow-up', mode: 'Physical', time: 'Today 1:00 PM', status: 'Completed', amount: 8000 },
  { id: 'DA004', patient: 'Funke Adeyemi', type: 'General Consultation', mode: 'Physical', time: 'Today 2:30 PM', status: 'Completed', amount: 10000 },
  { id: 'DA005', patient: 'Tunde Bakare', type: 'Specialist Consultation', mode: 'Online', time: 'Tomorrow 9:00 AM', status: 'Scheduled', amount: 25000 },
  { id: 'DA006', patient: 'Halima Abdullahi', type: 'Follow-up', mode: 'Physical', time: 'Tomorrow 11:00 AM', status: 'Cancelled', amount: 0 },
];

// General staff tasks
export interface StaffTask {
  id: string;
  task: string;
  patient: string;
  ward: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed';
}

export const staffTasks: StaffTask[] = [
  { id: 'TK001', task: 'Administer 8AM medication', patient: 'John Doe', ward: 'Ward A - 12', priority: 'High', status: 'Completed' },
  { id: 'TK002', task: 'Vitals check', patient: 'Funke Adeyemi', ward: 'Ward C - 5', priority: 'Medium', status: 'In Progress' },
  { id: 'TK003', task: 'Sample collection for lab', patient: 'Amina Yusuf', ward: 'OPD', priority: 'Medium', status: 'Pending' },
  { id: 'TK004', task: 'Pre-op preparation', patient: 'Ibrahim Musa', ward: 'Ward B - 8', priority: 'High', status: 'Pending' },
  { id: 'TK005', task: 'Discharge paperwork', patient: 'Kemi Afolabi', ward: 'Paediatrics', priority: 'Low', status: 'Pending' },
  { id: 'TK006', task: 'Wound dressing change', patient: 'Adebayo Ogundimu', ward: 'Ward A - 15', priority: 'Medium', status: 'In Progress' },
];