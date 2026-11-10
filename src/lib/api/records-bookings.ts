import { apiRequest } from './client';
import { env } from '../env';
import type { CardRecord, PersonRecord } from './patients';

type ApiEnvelope<T> = { data: T };

export type StaffBooking = {
  bookingId: number;
  bookingNo: string;
  serviceId: number;
  serviceName: string;
  department: string | null;
  personId: number | null;
  hospitalNo: string | null;
  patientType: string;
  patientName: string;
  phone: string;
  email: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  deliveryMode: string;
  priceAmount: number;
  amountDue: number;
  paymentStatus: string;
  feeBreakdown: {
    service?: number;
    registration?: number;
    card?: number;
    total?: number;
  } | null;
  status: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  notes: string | null;
  cardId: number | null;
  cardNo: string | null;
  cardPaymentStatus: string | null;
};

export type BookingResumePayload = {
  person: PersonRecord | null;
  card: CardRecord | null;
  paymentCleared: boolean;
  suggestedStep: number | null;
  registrationComplete: boolean;
};

export function isRecordsBookingsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listRecordsBookings(params?: {
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  paymentStatus?: string;
  patientType?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: StaffBooking[]; meta: { page: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.status) qs.set('status', params.status);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.patientType) qs.set('patientType', params.patientType);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{ items: StaffBooking[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/records/bookings${suffix}`);
  return body.data;
}

export async function getRecordsBooking(bookingId: number): Promise<StaffBooking> {
  const body = await apiRequest<ApiEnvelope<StaffBooking>>(
    `/api/records/bookings/${bookingId}`,
  );
  return body.data;
}

export async function convertOnlineBooking(bookingId: number): Promise<{
  booking: StaffBooking;
  resume: BookingResumePayload;
}> {
  const body = await apiRequest<
    ApiEnvelope<{ booking: StaffBooking; resume: BookingResumePayload }>
  >(`/api/records/bookings/${bookingId}/convert`, { method: 'POST', body: {} });
  return body.data;
}

export async function checkInOnlineBooking(bookingId: number): Promise<{
  booking: StaffBooking;
  arrival: unknown;
}> {
  const body = await apiRequest<
    ApiEnvelope<{ booking: StaffBooking; arrival: unknown }>
  >(`/api/records/bookings/${bookingId}/check-in`, { method: 'POST', body: {} });
  return body.data;
}

export async function completeOnlineBooking(bookingId: number): Promise<StaffBooking> {
  const body = await apiRequest<ApiEnvelope<StaffBooking>>(
    `/api/records/bookings/${bookingId}/complete`,
    { method: 'POST', body: {} },
  );
  return body.data;
}
