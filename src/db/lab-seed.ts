import type { Order } from '@/data-access/types';
import { buildSeed } from './seed';

const resolvePatientId = (name: string, hospitalNo?: string): string => {
  const patients = buildSeed().patients;
  const byName = patients.find(p => p.name === name);
  if (byName) return byName.id;
  if (hospitalNo) {
    const byHosp = patients.find(p => p.hospitalId === hospitalNo || p.id === hospitalNo);
    if (byHosp) return byHosp.id;
  }
  return 'PT-unknown';
};

const hospNo = (patientId: string, fallback: string): string => {
  const p = buildSeed().patients.find(x => x.id === patientId);
  return p?.hospitalId ?? fallback;
};

/** Lab orders seeded from legacy LabFlowStore — linked to canonical patients where possible. */
export const seedLabOrders: Order[] = [
  {
    id: 'LAB-3201',
    patientId: resolvePatientId('Amina Yusuf'),
    kind: 'lab',
    items: [
      { code: 'FBC', name: 'Full Blood Count', price: 3500 },
      { code: 'MP', name: 'Malaria Parasite', price: 2000 },
    ],
    status: 'PENDING_DOCTOR',
    orderedBy: 'Dr. Adeyemi',
    createdAt: 'Today 08:10',
    updatedAt: 'Today 08:10',
    labMeta: {
      patientName: 'Amina Yusuf',
      age: 34,
      gender: 'Female',
      hospitalNo: hospNo(resolvePatientId('Amina Yusuf'), 'GFA/HMS/2026/000146'),
      department: 'OPD-Medical',
      source: 'Doctor',
      priority: 'Routine',
      clinicalNote: 'Fever, headache 3/7. R/O malaria, anaemia.',
      audit: [{ action: 'Created by doctor', by: 'Dr. Adeyemi', at: 'Today 08:10' }],
    },
  },
  {
    id: 'LAB-3202',
    patientId: resolvePatientId('Ibrahim Musa'),
    kind: 'lab',
    items: [
      { code: 'LFT', name: 'Liver Function Test', price: 6500 },
      { code: 'EUC', name: 'Electrolytes/Urea/Creatinine', price: 5500 },
    ],
    status: 'PENDING_DOCTOR',
    orderedBy: 'Dr. Ojo',
    createdAt: 'Today 08:45',
    updatedAt: 'Today 08:45',
    labMeta: {
      patientName: 'Ibrahim Musa',
      age: 52,
      gender: 'Male',
      hospitalNo: hospNo(resolvePatientId('Ibrahim Musa'), 'GFA/HMS/2026/000149'),
      department: 'Male Ward',
      ward: 'Ward 3B',
      source: 'Doctor',
      priority: 'Urgent',
      clinicalNote: 'Jaundice, oedema. Pre-treatment baseline.',
      audit: [{ action: 'Created by doctor', by: 'Dr. Ojo', at: 'Today 08:45' }],
    },
  },
  {
    id: 'LAB-3203',
    patientId: resolvePatientId('Tunde Bakare'),
    kind: 'lab',
    items: [
      { code: 'BG', name: 'Blood Group & Rhesus', price: 1500 },
      { code: 'XM', name: 'Crossmatch 2 Units', price: 8000 },
    ],
    status: 'SENT_TO_BILLING',
    orderedBy: 'Dr. Lawal',
    createdAt: 'Today 07:30',
    updatedAt: 'Today 09:02',
    labMeta: {
      patientName: 'Tunde Bakare',
      age: 41,
      gender: 'Male',
      hospitalNo: hospNo(resolvePatientId('Tunde Bakare'), 'GFA/HMS/2026/000151'),
      department: 'Theatre Pre-Op',
      source: 'Doctor',
      priority: 'Stat',
      audit: [
        { action: 'Created by doctor', by: 'Dr. Lawal', at: 'Today 07:30' },
        { action: 'Sent to billing', by: 'Sc. Bolaji', at: 'Today 09:02' },
      ],
    },
  },
  {
    id: 'LAB-3204',
    patientId: resolvePatientId('Ngozi Okoro'),
    kind: 'lab',
    items: [
      { code: 'PT', name: 'Pregnancy Test', price: 1500 },
      { code: 'URI', name: 'Urinalysis', price: 1800 },
    ],
    status: 'AWAITING_PAYMENT',
    invoiceId: 'LAB-INV-9002',
    orderedBy: 'Dr. Bello',
    createdAt: 'Today 09:14',
    updatedAt: 'Today 09:30',
    labMeta: {
      patientName: 'Ngozi Okoro',
      age: 28,
      gender: 'Female',
      hospitalNo: hospNo(resolvePatientId('Ngozi Okoro'), 'GFA/HMS/2026/000150'),
      department: 'Emergency',
      source: 'Doctor',
      priority: 'Routine',
      paymentType: 'Cash',
      audit: [
        { action: 'Created by doctor', by: 'Dr. Bello', at: 'Today 09:14' },
        { action: 'Sent to billing', by: 'Sc. Funke', at: 'Today 09:20' },
        { action: 'Invoice generated', by: 'Cashier Kemi', at: 'Today 09:30' },
      ],
    },
  },
  {
    id: 'LAB-3205',
    patientId: resolvePatientId('Amina Yusuf'),
    kind: 'lab',
    items: [{ code: 'HBSAG', name: 'HBsAg', price: 2500 }],
    status: 'NHIA_PENDING',
    invoiceId: 'LAB-INV-9003',
    orderedBy: 'Dr. Adeyemi',
    createdAt: 'Yesterday',
    updatedAt: 'Yesterday',
    labMeta: {
      patientName: 'Amina Yusuf',
      age: 34,
      gender: 'Female',
      hospitalNo: hospNo(resolvePatientId('Amina Yusuf'), 'GFA/HMS/2026/000146'),
      department: 'OPD-Medical',
      source: 'Doctor',
      priority: 'Routine',
      paymentType: 'NHIA',
      nhia: { number: 'NHIA-2233445', authCode: '' },
      audit: [{ action: 'NHIA submitted for approval', by: 'Cashier Kemi', at: 'Yesterday 11:00' }],
    },
  },
  {
    id: 'LAB-3206',
    patientId: 'PT-unknown',
    kind: 'lab',
    items: [{ code: 'HIV', name: 'HIV Screen', price: 2500 }],
    status: 'PAID',
    invoiceId: 'LAB-INV-9004',
    orderedBy: 'Dr. Adeyemi',
    createdAt: 'Today 07:50',
    updatedAt: 'Today 09:05',
    labMeta: {
      patientName: 'Kemi Adeleke',
      age: 30,
      gender: 'Female',
      hospitalNo: 'GFA/HMS/2026/000999',
      department: 'OPD-Medical',
      source: 'Doctor',
      priority: 'Routine',
      paymentType: 'POS',
      paymentRef: 'POS-883421',
      cashier: 'Cashier Tope',
      audit: [
        { action: 'Created by doctor', by: 'Dr. Adeyemi', at: 'Today 07:50' },
        { action: 'Payment captured ₦2,500 POS', by: 'Cashier Tope', at: 'Today 09:05' },
      ],
    },
  },
  {
    id: 'LAB-3207',
    patientId: 'PT-unknown',
    kind: 'lab',
    items: [{ code: 'GEN', name: 'Genotype', price: 3000 }],
    status: 'REJECTED',
    orderedBy: 'Dr. Ojo',
    createdAt: 'Today 06:00',
    updatedAt: 'Today 07:00',
    labMeta: {
      patientName: 'Yakubu Musa',
      age: 45,
      gender: 'Male',
      hospitalNo: 'GFA/HMS/2026/000998',
      department: 'Male Ward',
      source: 'Doctor',
      priority: 'Routine',
      rejectReason: 'Duplicate of LAB-3197',
      audit: [{ action: 'Rejected — duplicate', by: 'Sc. Bolaji', at: 'Today 07:00' }],
    },
  },
];
