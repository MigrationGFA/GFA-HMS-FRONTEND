import type { ImagingRequest, EcgStudy, RadEquipment, RadConsumable, RadModality } from '@/data-access/types';
import { seedPatients } from './seed';

const iso = (d: string) => (d.includes('T') ? d : `${d.replace(' ', 'T')}:00.000Z`);
const P = seedPatients;

const price: Record<RadModality, number> = {
  'X-Ray': 8500, 'Ultrasound': 12000, 'CT Scan': 45000, 'MRI': 120000, 'ECG': 5500,
  'EEG': 25000, 'Mammography': 18000, 'Fluoroscopy': 30000, 'Echocardiography': 22000, 'Portable': 15000,
};

const mk = (
  i: number, p: typeof seedPatients[number], modality: RadModality, region: string,
  status: ImagingRequest['status'], priority: ImagingRequest['priority'], indication: string,
  extra: Partial<ImagingRequest> = {},
): ImagingRequest => ({
  id: `RAD-${4201 + i}`,
  patientId: p.id,
  patientName: p.name,
  hospitalId: p.hospitalId,
  modality, region,
  clinic: 'GMPC', ward: extra.ward,
  requestedBy: 'Dr. Okonkwo',
  priority,
  source: extra.source ?? 'Doctor',
  indication,
  status,
  paymentStatus: status === 'AWAITING_PAYMENT' || status === 'REQUESTED' ? 'UNPAID' : 'PAID',
  amount: price[modality],
  prep: { status: modality === 'CT Scan' || modality === 'MRI' ? 'PENDING' : 'NOT_REQUIRED' },
  safety: { pregnancy: 'N/A', consent: status !== 'REQUESTED' },
  createdAt: iso('2026-06-28 08:30'),
  updatedAt: iso('2026-06-28 08:30'),
  audit: [{ action: 'Request created (seed)', by: 'Dr. Okonkwo', at: iso('2026-06-28 08:30') }],
  ...extra,
});

export const seedImagingRequests: ImagingRequest[] = P.length >= 4 ? [
  mk(0, P[0], 'CT Scan', 'Brain', 'SCHEDULED', 'URGENT', 'New-onset seizures, R/O space-occupying lesion', { machineId: 'EQ-CT-1', radiographer: 'Radiographer Musa', scheduledAt: iso('2026-06-28 11:00') }),
  mk(1, P[1], 'X-Ray', 'Chest PA', 'REQUESTED', 'ROUTINE', 'Cough × 3 weeks, R/O TB', { ward: 'Male Ward 2 · Bed 4', source: 'Ward' }),
  mk(2, P[2], 'MRI', 'Brain', 'PAID', 'URGENT', 'Refractory epilepsy, pre-surgical workup'),
  mk(3, P[3], 'Ultrasound', 'Abdominal', 'IMAGING_DONE', 'ROUTINE', 'RUQ pain, R/O cholelithiasis', { radiographer: 'Radiographer Ada', machineId: 'EQ-US-1' }),
] : [];

export const seedEcgStudies: EcgStudy[] = P.length >= 2 ? [
  {
    id: 'ECG-5201', patientId: P[0].id, patientName: P[0].name, type: '12-Lead',
    clinicalHistory: 'Pre-clozapine baseline',
    measurements: { heartRate: 78, rhythm: 'Sinus rhythm', prInterval: 160, qrsDuration: 90, qtInterval: 380, qtc: 430, axis: 'Normal' },
    machineInterpretation: 'Normal sinus rhythm', status: 'VERIFIED', abnormal: false, critical: false,
    reportedBy: 'Dr. Okoro', verifiedBy: 'Dr. Cardiologist', createdAt: iso('2026-06-27 10:00'), updatedAt: iso('2026-06-27 10:20'),
  },
] : [];

export const seedRadEquipment: RadEquipment[] = [
  { id: 'EQ-XR-1', name: 'Siemens Ysio X-Ray', modality: 'X-Ray', room: 'Room 1', status: 'ONLINE', usageHours: 1240, lastService: '2026-05-01', nextService: '2026-08-01' },
  { id: 'EQ-US-1', name: 'GE Voluson Ultrasound', modality: 'Ultrasound', room: 'Room 2', status: 'ONLINE', usageHours: 980, lastService: '2026-04-15', nextService: '2026-07-15' },
  { id: 'EQ-CT-1', name: 'Philips Ingenuity CT', modality: 'CT Scan', room: 'CT Suite', status: 'ONLINE', usageHours: 2100, lastService: '2026-05-20', nextService: '2026-08-20' },
  { id: 'EQ-MRI-1', name: 'Siemens Magnetom MRI', modality: 'MRI', room: 'MRI Suite', status: 'MAINTENANCE', usageHours: 3050, lastService: '2026-06-25', nextService: '2026-06-30', faultNote: 'Helium top-up scheduled' },
  { id: 'EQ-ECG-1', name: 'Schiller Cardiovit ECG', modality: 'ECG', room: 'ECG Room', status: 'ONLINE', usageHours: 620 },
];

export const seedRadConsumables: RadConsumable[] = [
  { id: 'RC-1', name: 'Iohexol Contrast 100ml', category: 'Contrast', stock: 40, unit: 'vials', reorderLevel: 15, lotNumber: 'IOX-2291', expiry: '2027-02-01' },
  { id: 'RC-2', name: 'X-Ray Film 14x17', category: 'Film', stock: 120, unit: 'sheets', reorderLevel: 50 },
  { id: 'RC-3', name: 'ECG Electrodes', category: 'ECG Electrode', stock: 8, unit: 'packs', reorderLevel: 10 },
  { id: 'RC-4', name: 'Ultrasound Gel 5L', category: 'Ultrasound Gel', stock: 18, unit: 'bottles', reorderLevel: 6 },
  { id: 'RC-5', name: 'Thermal Paper Roll', category: 'Paper', stock: 30, unit: 'rolls', reorderLevel: 10 },
];
