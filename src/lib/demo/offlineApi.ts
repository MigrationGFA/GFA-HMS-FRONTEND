/**
 * Offline sales-demo responses for apiRequest.
 * Screens keep calling the same API modules; no network is used.
 */
import { resolveClinicalOrders } from './clinicalOrders';
import { resolveDoctorClinicalPages } from './doctorClinicalPages';
import { resolveInpatientApi } from './inpatientCase';
import { resolveRegistrationDesk } from './registrationDesk';

function hospitalNo(seq: number) {
  return `GFA/HMS/2026/${String(seq).padStart(6, '0')}`;
}

const demoPatients = [
  { id: 1, personId: 1, hospitalId: hospitalNo(145), hospitalNo: hospitalNo(145), firstName: 'John', lastName: 'Doe', fullName: 'John Doe', name: 'John Doe', sex: 'M', gender: 'Male', age: 42, phone: '08012345678', status: 'Active', clinic: 'General OPD' },
  { id: 2, personId: 2, hospitalId: hospitalNo(146), hospitalNo: hospitalNo(146), firstName: 'Amina', lastName: 'Yusuf', fullName: 'Amina Yusuf', name: 'Amina Yusuf', sex: 'F', gender: 'Female', age: 28, phone: '08023456789', status: 'Active', clinic: 'Psychiatry' },
  { id: 3, personId: 3, hospitalId: hospitalNo(150), hospitalNo: hospitalNo(150), firstName: 'Ngozi', lastName: 'Okoro', fullName: 'Ngozi Okoro', name: 'Ngozi Okoro', sex: 'F', gender: 'Female', age: 47, phone: '08034567890', status: 'Active', clinic: 'Neurology' },
  { id: 4, personId: 4, hospitalId: hospitalNo(153), hospitalNo: hospitalNo(153), firstName: 'Tope', lastName: 'Adesanya', fullName: 'Tope Adesanya', name: 'Tope Adesanya', sex: 'M', gender: 'Male', age: 19, phone: '08045678901', status: 'Active', clinic: 'Addiction' },
  { id: 5, personId: 5, hospitalId: hospitalNo(161), hospitalNo: hospitalNo(161), firstName: 'Bisi', lastName: 'Olarewaju', fullName: 'Bisi Olarewaju', name: 'Bisi Olarewaju', sex: 'F', gender: 'Female', age: 64, phone: '08056789012', status: 'Active', clinic: 'Geriatric' },
];

const doctorOverview = {
  asOf: new Date().toISOString(),
  doctorUserId: 8,
  kpis: {
    patientsWaiting: 12,
    patientsWaitingSubtitle: '4 priority · 8 routine',
    activeConsultations: 3,
    pendingLabResults: 7,
    pendingImaging: 4,
    admissionRequests: 2,
    urgentAdmissionRequests: 1,
    wardRoundPatients: 9,
    wardCount: 3,
    referralsReceived: 5,
    referralsReceivedPending: 2,
    referralsSent: 6,
    referralsSentAccepted: 4,
    dischargesPending: 2,
    emergencyCases: 1,
    criticalAlerts: 2,
  },
  queue: demoPatients.slice(0, 4).map((p, i) => ({
    triageId: 100 + i,
    personId: p.personId,
    name: p.name,
    patientName: p.name,
    hospitalNo: p.hospitalNo,
    sex: p.sex,
    age: p.age,
    status: i === 0 ? 'Ready' : 'Waiting',
    statusTone: i === 0 ? 'green' : 'amber',
    mode: 'OPD',
    clinic: p.clinic,
    priority: i === 1 ? 'Urgent' : 'Routine',
    canStart: true,
    arrivalAt: new Date(Date.now() - i * 600_000).toISOString(),
  })),
  tabHints: {
    activeCount: 3,
    followUpCount: 5,
    admittedCount: 2,
    referralsReceived: 5,
    referralsSent: 6,
    pendingLab: 7,
    pendingImaging: 4,
    dischargesPending: 2,
  },
};

const listEnvelope = <T,>(items: T[], meta?: Record<string, unknown>) => ({
  data: items,
  meta: { total: items.length, page: 1, pageSize: items.length, ...meta },
});

const dataEnvelope = <T,>(data: T) => ({ data });

function match(path: string, prefix: string) {
  const clean = path.split('?')[0].replace(/\/$/, '');
  return clean === prefix || clean.startsWith(`${prefix}/`);
}

export function resolveOfflineApiResponse(
  path: string,
  method: string,
  body?: unknown,
): unknown {
  const m = (method || 'GET').toUpperCase();
  const p = path.startsWith('/') ? path : `/${path}`;

  // Auth helpers that may be called from UI even in demo
  if (match(p, '/api/auth/logout')) return dataEnvelope({ ok: true });
  if (match(p, '/api/auth/refresh')) {
    return dataEnvelope({
      accessToken: 'demo-access',
      refreshToken: 'demo-refresh',
      expiresIn: 3600,
    });
  }
  if (match(p, '/api/users/me') || match(p, '/api/auth/me')) {
    return dataEnvelope({
      id: 8,
      email: 'doctor@gfa-health.demo',
      firstName: 'Ngozi',
      lastName: 'Ikedife',
      roles: ['DOCTOR'],
      mustResetPassword: false,
    });
  }
  if (match(p, '/api/users') && m === 'PATCH') {
    return dataEnvelope({ ok: true, mustResetPassword: false });
  }

  const registration = resolveRegistrationDesk(p, m, body);
  if (registration !== null) return registration;

  const clinicalOrders = resolveClinicalOrders(p, m, body);
  if (clinicalOrders !== null) return clinicalOrders;

  const inpatient = resolveInpatientApi(p, m, body);
  if (inpatient !== null) return inpatient;

  const doctorPages = resolveDoctorClinicalPages(p, m, body);
  if (doctorPages !== null) return doctorPages;

  if (match(p, '/api/doctor/overview')) return dataEnvelope(doctorOverview);

  if (match(p, '/api/patients')) {
    if (m === 'GET') return listEnvelope(demoPatients);
    if (m === 'POST' || m === 'PATCH') {
      return dataEnvelope({
        ...(typeof body === 'object' && body ? body : {}),
        id: Date.now(),
        hospitalId: hospitalNo(200),
        hospitalNo: hospitalNo(200),
      });
    }
  }

  if (match(p, '/api/records') || match(p, '/api/records-ops') || match(p, '/api/records/bookings')) {
    if (m === 'GET') {
      return listEnvelope(
        demoPatients.map((p0, i) => ({
          ...p0,
          bookingId: `BK-${2400 + i}`,
          apptDate: new Date().toISOString().slice(0, 10),
          apptTime: `${8 + i}:30`,
          status: i % 2 === 0 ? 'Arrived' : 'Waiting',
          payment: i % 3 === 0 ? 'Pending' : 'Paid',
        })),
      );
    }
    return dataEnvelope({ ok: true, ...(typeof body === 'object' && body ? body : {}) });
  }

  if (match(p, '/api/triage')) {
    if (m === 'GET') {
      return listEnvelope(
        demoPatients.map((p0, i) => ({
          id: 200 + i,
          personId: p0.personId,
          patientName: p0.name,
          hospitalNo: p0.hospitalNo,
          priority: i === 1 ? 'Urgent' : 'Routine',
          status: 'Queued',
          clinic: p0.clinic,
          vitals: { bp: '120/80', pulse: 78, temp: 36.8, spo2: 98 },
        })),
      );
    }
    return dataEnvelope({ ok: true, id: Date.now() });
  }

  if (match(p, '/api/pharmacy') || match(p, '/api/prescriptions')) {
    if (m === 'GET') {
      return listEnvelope([
        { id: 'RX-2026-041', patientName: 'John Doe', hospitalId: hospitalNo(145), status: 'Pending', items: 3, prescribedBy: 'Dr. Ikedife', createdAt: new Date().toISOString() },
        { id: 'RX-2026-038', patientName: 'Amina Yusuf', hospitalId: hospitalNo(146), status: 'Dispensed', items: 2, prescribedBy: 'Dr. Bello', createdAt: new Date().toISOString() },
        { id: 'RX-2026-035', patientName: 'Ngozi Okoro', hospitalId: hospitalNo(150), status: 'Ready', items: 4, prescribedBy: 'Dr. Ikedife', createdAt: new Date().toISOString() },
      ]);
    }
    return dataEnvelope({ ok: true, id: `RX-${Date.now()}` });
  }

  if (match(p, '/api/laboratory') || match(p, '/api/lab')) {
    if (m === 'GET') {
      return listEnvelope([
        { id: 'LAB-118', patientName: 'John Doe', hospitalId: hospitalNo(145), test: 'FBC', status: 'Pending', priority: 'Routine' },
        { id: 'LAB-112', patientName: 'Amina Yusuf', hospitalId: hospitalNo(146), test: 'U&E', status: 'Validated', priority: 'Urgent' },
        { id: 'LAB-109', patientName: 'Tope Adesanya', hospitalId: hospitalNo(153), test: 'LFT', status: 'Collected', priority: 'Routine' },
      ]);
    }
    return dataEnvelope({ ok: true, id: `LAB-${Date.now()}` });
  }

  if (match(p, '/api/radiology') || match(p, '/api/imaging')) {
    if (m === 'GET') {
      return listEnvelope([
        { id: 'IMG-88', patientName: 'John Doe', hospitalId: hospitalNo(145), modality: 'X-Ray', study: 'Chest PA', status: 'Scheduled' },
        { id: 'IMG-84', patientName: 'Bisi Olarewaju', hospitalId: hospitalNo(161), modality: 'CT', study: 'Brain', status: 'Reported' },
      ]);
    }
    return dataEnvelope({ ok: true, id: `IMG-${Date.now()}` });
  }

  if (match(p, '/api/cashier') || match(p, '/api/billing') || match(p, '/api/bills')) {
    if (m === 'GET') {
      return listEnvelope([
        { id: 'INV-000121', patientName: 'John Doe', hospitalId: hospitalNo(145), amount: 15000, status: 'Pending', service: 'Consultation' },
        { id: 'INV-000118', patientName: 'Amina Yusuf', hospitalId: hospitalNo(146), amount: 45000, status: 'Paid', service: 'Lab panel' },
        { id: 'INV-000110', patientName: 'Ngozi Okoro', hospitalId: hospitalNo(150), amount: 25000, status: 'Partial', service: 'Pharmacy' },
      ]);
    }
    return dataEnvelope({ ok: true, receiptNo: `RCP-${Date.now()}`, status: 'Paid' });
  }

  if (match(p, '/api/admissions') || match(p, '/api/admission-requests')) {
    if (m === 'GET') {
      return listEnvelope([
        { id: 'ADM-041', patientName: 'John Doe', hospitalId: hospitalNo(145), ward: 'Male Acute', status: 'Requested', priority: 'Urgent' },
        { id: 'ADM-038', patientName: 'Amina Yusuf', hospitalId: hospitalNo(146), ward: 'Female Acute', status: 'Approved', priority: 'Routine' },
      ]);
    }
    return dataEnvelope({ ok: true, id: `ADM-${Date.now()}` });
  }

  if (match(p, '/api/nursing') || match(p, '/api/nursing-care') || match(p, '/api/nursing-ops')) {
    if (m === 'GET') {
      return listEnvelope(
        demoPatients.slice(0, 3).map((p0, i) => ({
          id: `NUR-${i + 1}`,
          patientName: p0.name,
          hospitalId: p0.hospitalId,
          ward: i === 0 ? 'Ward A' : 'Ward B',
          task: i === 0 ? 'Medication round' : 'Vitals',
          status: 'Due',
        })),
      );
    }
    return dataEnvelope({ ok: true });
  }

  if (match(p, '/api/appointments') || match(p, '/api/opc')) {
    if (m === 'GET') {
      return listEnvelope(
        demoPatients.map((p0, i) => ({
          id: `APT-${2401 + i}`,
          patientName: p0.name,
          hospitalId: p0.hospitalId,
          clinic: p0.clinic,
          date: new Date().toISOString().slice(0, 10),
          time: `${9 + i}:00`,
          status: i === 0 ? 'Arrived' : 'Booked',
        })),
      );
    }
    return dataEnvelope({ ok: true, id: `APT-${Date.now()}` });
  }

  if (match(p, '/api/chat') || match(p, '/api/notifications') || match(p, '/api/support')) {
    if (m === 'GET') return listEnvelope([]);
    return dataEnvelope({ ok: true });
  }

  if (match(p, '/api/referrals') || match(p, '/api/transfers') || match(p, '/api/discharge') || match(p, '/api/encounters') || match(p, '/api/diagnoses') || match(p, '/api/clinical-notes') || match(p, '/api/certificates')) {
    if (m === 'GET') return listEnvelope([]);
    return dataEnvelope({ ok: true, id: Date.now() });
  }

  // Generic safe fallbacks so screens do not crash
  if (m === 'GET') {
    if (p.includes('summary') || p.includes('analytics') || p.includes('overview') || p.includes('settings') || p.includes('profile')) {
      return dataEnvelope({
        total: demoPatients.length,
        pending: 4,
        completed: 18,
        revenue: 1_250_000,
        ok: true,
      });
    }
    return listEnvelope([]);
  }

  return dataEnvelope({ ok: true, ...(typeof body === 'object' && body ? body : {}), id: Date.now() });
}
