import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiPrescriptionItem = {
  itemId: number;
  drugId: number;
  drugName: string;
  strength: string | null;
  form: string | null;
  route: string | null;
  dose: string;
  frequency: string;
  duration: string | null;
  quantity: number;
  qtyDispensed: number;
  qtyReturned?: number;
  source: string;
  instructions: string | null;
  indication: string | null;
  lineStatus: string;
  unitPrice: number;
};

export type ApiPrescriptionPerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  age: number | null;
  phone: string | null;
};

export type ApiPrescriptionAudit = {
  at: string;
  actor: string;
  action: string;
  note?: string;
};

export type ApiPrescription = {
  prescriptionId: number;
  rxNo: string;
  personId: number;
  status: string;
  urgency: string;
  paymentStatus: string;
  paymentChannel?: string | null;
  paymentRef?: string | null;
  paidAt?: string | null;
  paidBy?: string | null;
  emergencyReceivedBy?: string | null;
  emergencyDispensedAt?: string | null;
  emergencyNote?: string | null;
  diagnosis: string | null;
  allergiesNote: string | null;
  clinic: string | null;
  notes: string | null;
  pharmacyNotes: string | null;
  sentAt: string | null;
  prescribedBy: string | null;
  dispensedBy: string | null;
  dispensedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: ApiPrescriptionItem[];
  person: ApiPrescriptionPerson | null;
  total: number;
  auditTrail?: ApiPrescriptionAudit[];
};

export type CreatePrescriptionPayload = {
  personId: number;
  items: {
    drugId: number;
    strength?: string;
    form?: string;
    route?: string;
    dose: string;
    frequency: string;
    duration?: string;
    quantity: number;
    source?: string;
    instructions?: string;
    indication?: string;
  }[];
  send?: boolean;
  urgency?: 'Routine' | 'Urgent' | 'Stat' | string;
  paymentStatus?: 'Unpaid' | 'Paid' | 'Waived' | 'Emergency' | string;
  diagnosis?: string;
  allergiesNote?: string;
  clinic?: string;
  notes?: string;
};

export async function createPrescription(
  payload: CreatePrescriptionPayload,
): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>('/api/prescriptions', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function listPrescriptions(params?: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  personId?: number;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPrescription>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPrescription>>>(
    `/api/prescriptions?${qs}`,
  );
  return body.data;
}

export async function getPrescription(id: number): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/${id}`,
  );
  return body.data;
}

/** Load by human Rx number used in routes like /pharmacy/rx/RX-2026-0001 */
export async function getPrescriptionByRxNo(rxNo: string): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/by-rx/${encodeURIComponent(rxNo)}`,
  );
  return body.data;
}

export async function updatePrescription(
  id: number,
  payload: {
    status?: string;
    paymentStatus?: string;
    pharmacyNotes?: string;
    notes?: string;
  },
): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

/** Dispense full remaining qty (or selected lines) with FEFO stock deduction. Requires Paid/Waived/Emergency. */
export async function dispensePrescription(
  id: number,
  payload?: {
    items?: { itemId: number; quantity?: number }[];
    pharmacyNotes?: string;
  },
): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/${id}/dispense`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

/** Emergency unpaid dispense — records receiver; leaves Emergency bill for cashier. */
export async function emergencyDispensePrescription(
  id: number,
  payload: {
    receivedBy: string;
    note?: string;
    items?: { itemId: number; quantity?: number }[];
    pharmacyNotes?: string;
  },
): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/${id}/emergency-dispense`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listCashierPrescriptions(params?: {
  paymentStatus?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPrescription>> {
  const qs = new URLSearchParams();
  qs.set('paymentStatus', params?.paymentStatus ?? 'Unpaid,Emergency');
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPrescription>>>(
    `/api/cashier/payments/prescriptions?${qs}`,
  );
  return body.data;
}

export async function confirmPrescriptionPayment(
  id: number,
  payload: { paymentChannel: string; paymentRef?: string },
): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/cashier/payments/prescriptions/${id}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export function isPrescriptionsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export type ApiMedicationLine = {
  itemId: number;
  prescriptionId: number;
  rxNo: string;
  prescriptionStatus: string;
  drugId: number;
  drugName: string;
  strength: string | null;
  form: string | null;
  route: string | null;
  dose: string;
  frequency: string;
  duration: string | null;
  quantity: number;
  qtyDispensed: number;
  source: string;
  instructions: string | null;
  indication: string | null;
  lineStatus: string;
  prescribedBy: string | null;
  sentAt: string | null;
  createdAt: string | null;
};

export async function listPrescriptionMedications(params: {
  personId: number;
  scope?: 'active' | 'stopped' | 'external' | 'history' | string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiMedicationLine>> {
  const qs = new URLSearchParams();
  qs.set('personId', String(params.personId));
  if (params.scope) qs.set('scope', params.scope);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiMedicationLine>>>(
    `/api/prescriptions/medications?${qs}`,
  );
  return body.data;
}

export async function stopPrescriptionItem(
  prescriptionId: number,
  itemId: number,
  payload: { reason: string; comment?: string },
) {
  const body = await apiRequest<
    ApiEnvelope<{ itemId: number; prescriptionId: number; lineStatus: string; reason: string }>
  >(`/api/prescriptions/${prescriptionId}/items/${itemId}/stop`, {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function refillPrescription(id: number): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    `/api/prescriptions/${id}/refill`,
    { method: 'POST' },
  );
  return body.data;
}

export async function createExternalPrescription(payload: {
  personId: number;
  drugName: string;
  drugId?: number;
  strength?: string;
  form?: string;
  dose: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
  notes?: string;
}): Promise<ApiPrescription> {
  const body = await apiRequest<ApiEnvelope<ApiPrescription>>(
    '/api/prescriptions/external',
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listExternalPrescriptions(params?: {
  personId?: number;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiPrescription>> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiPrescription>>>(
    `/api/prescriptions/external?${qs}`,
  );
  return body.data;
}

/** Map API prescription into the pharmacy mock Prescription shape for UI reuse. */
export function toPharmacyQueueRow(rx: ApiPrescription) {
  const first = rx.person?.firstName ?? '';
  const last = rx.person?.lastName ?? '';
  const patientName = [first, rx.person?.middleName, last].filter(Boolean).join(' ') || 'Unknown';
  const paymentStatus =
    rx.paymentStatus === 'Paid'
      ? 'PAID'
      : rx.paymentStatus === 'Emergency'
        ? 'EMERGENCY'
        : rx.paymentStatus === 'Waived'
          ? 'WAIVED'
          : 'UNPAID';

  // Pharmacy can start dispense immediately (payment badge stays separate).
  let status = 'PENDING_PHARMACY';
  if (rx.status === 'Dispensed') status = 'DISPENSED';
  else if (rx.status === 'Partially Dispensed') status = 'PARTIALLY_DISPENSED';
  else if (rx.status === 'Rejected') status = 'REJECTED';
  else if (rx.status === 'Cancelled') status = 'CANCELLED';
  else if (rx.urgency === 'Stat' || paymentStatus === 'EMERGENCY') status = 'EMERGENCY';
  else if (rx.status === 'Sent' || rx.status === 'Draft') status = 'PENDING_PHARMACY';
  else if (paymentStatus === 'PAID') status = 'PAID';
  else if (paymentStatus === 'UNPAID') status = 'AWAITING_PAYMENT';

  const sex = (rx.person?.sex ?? '').toLowerCase();
  const gender = sex.startsWith('f') ? 'Female' : 'Male';

  return {
    id: rx.rxNo,
    apiId: rx.prescriptionId,
    visitId: rx.clinic ?? '—',
    patientId: rx.person?.hospitalNo ?? String(rx.personId),
    patientName,
    age: rx.person?.age ?? 0,
    gender: gender as 'Male' | 'Female',
    prescribedBy: rx.prescribedBy ?? '—',
    prescribedAt: (rx.sentAt ?? rx.createdAt ?? '').replace('T', ' ').slice(0, 16),
    diagnosis: rx.diagnosis ?? undefined,
    allergies: rx.allergiesNote ?? undefined,
    items: rx.items.map((i) => ({
      drugId: String(i.drugId),
      drug: i.drugName,
      strength: i.strength ?? '',
      dose: `${i.dose} ${i.frequency}`,
      duration: i.duration ?? '',
      qty: i.quantity,
      unitPrice: i.unitPrice,
      dispensedQty: i.qtyDispensed,
    })),
    status,
    paymentStatus: paymentStatus as 'PAID' | 'UNPAID' | 'EMERGENCY' | 'WAIVED',
    total: rx.total,
    dispensedBy: rx.dispensedBy ?? undefined,
    dispensedAt: rx.dispensedAt
      ? rx.dispensedAt.replace('T', ' ').slice(0, 16)
      : undefined,
    emrSync: 'PENDING' as const,
    audit: (rx.auditTrail ?? []).map((a) => ({
      at: a.at.replace('T', ' ').slice(0, 16),
      actor: a.actor,
      action: a.action,
      note: a.note,
    })),
  };
}
