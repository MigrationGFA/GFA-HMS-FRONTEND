import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };

export type AvailabilitySlot = {
  start: string;
  end: string;
  available: boolean;
  bookedCount?: number;
  remainingSpots?: number;
};

export type PublicAvailability = {
  serviceId: number;
  serviceName: string;
  date: string;
  mode: 'PHYSICAL' | 'ONLINE';
  durationMinutes: number;
  price: number;
  dayStart: string;
  dayEnd: string;
  onlineSlotLimit?: number;
  staffPoolSize?: number;
  slots: AvailabilitySlot[];
};

export type FeeBreakdown = {
  service: number;
  registration: number;
  card: number;
  total: number;
};

export type PublicBooking = {
  bookingId: number;
  bookingNo: string;
  serviceId: number;
  serviceName: string;
  personId?: number | null;
  patientType?: 'NEW' | 'RETURNING' | string;
  patientName: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: string;
  priceAmount: number;
  paymentStatus?: string;
  feeBreakdown?: FeeBreakdown;
  status: string;
};

export type PublicRegistrationCharges = {
  regFee: number;
  cardFee: number;
  registration: number;
  card: number;
  items: Array<{
    code: string;
    label: string;
    amount: number;
    serviceId: number;
    source: string;
  }>;
};

export type MaskedPatientMatch = {
  personId: number;
  displayName: string;
  phoneMasked: string;
  hospitalNoMasked: string;
  hasEmail: boolean;
};

export type PublicOtpSendResult = {
  personId: number;
  verificationId: number;
  expiresAt: string;
  displayCode: string;
  channelHint: string;
  phoneMasked: string;
  emailMasked: string | null;
};

export type PublicOtpConfirmResult = {
  verificationToken: string;
  personId: number;
  expiresAt: string;
  person: {
    personId: number;
    firstName: string | null;
    lastName: string | null;
    hospitalNo: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

export function isAppointmentsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function getPublicRegistrationCharges(): Promise<PublicRegistrationCharges> {
  const body = await apiRequest<ApiEnvelope<PublicRegistrationCharges>>(
    '/api/appointments/public/registration-charges',
    { auth: false },
  );
  return body.data;
}

export async function listPublicAvailability(params: {
  serviceId: number;
  date: string;
  mode: 'PHYSICAL' | 'ONLINE';
}): Promise<PublicAvailability> {
  const qs = new URLSearchParams({
    serviceId: String(params.serviceId),
    date: params.date,
    mode: params.mode,
  });
  const body = await apiRequest<ApiEnvelope<PublicAvailability>>(
    `/api/appointments/public/availability?${qs}`,
    { auth: false },
  );
  return body.data;
}

export async function lookupPublicPatient(q: string): Promise<{ items: MaskedPatientMatch[] }> {
  const body = await apiRequest<ApiEnvelope<{ items: MaskedPatientMatch[] }>>(
    '/api/appointments/public/patient-lookup',
    { method: 'POST', body: { q }, auth: false },
  );
  return body.data;
}

export async function sendPublicVerification(personId: number): Promise<PublicOtpSendResult> {
  const body = await apiRequest<ApiEnvelope<PublicOtpSendResult>>(
    '/api/appointments/public/verify/send',
    { method: 'POST', body: { personId }, auth: false },
  );
  return body.data;
}

export async function confirmPublicVerification(
  personId: number,
  code: string,
): Promise<PublicOtpConfirmResult> {
  const body = await apiRequest<ApiEnvelope<PublicOtpConfirmResult>>(
    '/api/appointments/public/verify/confirm',
    { method: 'POST', body: { personId, code }, auth: false },
  );
  return body.data;
}

export async function createPublicBooking(input: {
  serviceId: number;
  date: string;
  startTime: string;
  mode: 'PHYSICAL' | 'ONLINE';
  patientType: 'NEW' | 'RETURNING';
  phone: string;
  firstName?: string;
  lastName?: string;
  patientName?: string;
  email?: string;
  nin?: string;
  age?: string;
  gender?: string;
  notes?: string;
  personId?: number;
  verificationToken?: string;
}): Promise<PublicBooking> {
  const body = await apiRequest<ApiEnvelope<PublicBooking>>(
    '/api/appointments/public/book',
    { method: 'POST', body: input, auth: false },
  );
  return body.data;
}
