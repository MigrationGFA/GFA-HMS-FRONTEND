import { apiRequest } from './client';
import { env } from '../env';
import type { StaffBooking } from './records-bookings';

type ApiEnvelope<T> = { data: T };

export type BookingPaymentConfirmResult = StaffBooking & {
  collectedAmount: number;
};

export function isCashierBookingsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export async function listBookingPayments(params?: {
  paymentStatus?: string;
  date?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: StaffBooking[]; meta: { page: number; limit: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.date) qs.set('date', params.date);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.q) qs.set('q', params.q);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{ items: StaffBooking[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/cashier/payments/bookings${suffix}`);
  return body.data;
}

export async function confirmBookingPayment(
  bookingId: number,
  input: { paymentChannel: string; paymentRef?: string },
): Promise<BookingPaymentConfirmResult> {
  const body = await apiRequest<ApiEnvelope<BookingPaymentConfirmResult>>(
    `/api/cashier/payments/bookings/${bookingId}/confirm`,
    { method: 'POST', body: input },
  );
  return body.data;
}
