import { beforeEach, describe, expect, it } from 'vitest';
import { resolveOfflineApiResponse } from './offlineApi';

describe('local registration desk', () => {
  beforeEach(() => {
    localStorage.removeItem('gfa_registration_desk_v1');
  });

  it('keeps the plain patient list as an array', () => {
    const res = resolveOfflineApiResponse('/api/patients', 'GET') as { data: unknown[] };
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('charges ₦500, lets cashier collect it, then opens triage', () => {
    const charges = resolveOfflineApiResponse('/api/records/registration-charges', 'GET') as {
      data: { regFee: number; total: number };
    };
    expect(charges.data.regFee).toBe(500);
    expect(charges.data.total).toBe(500);

    const created = resolveOfflineApiResponse('/api/records/registrations', 'POST', {
      firstName: 'Ada',
      lastName: 'Nwosu',
      sex: 'Female',
      patientPhoneNo: '08031112233',
      regFee: 500,
      consultFee: 0,
      cardFee: 0,
    }) as {
      data: {
        personId: number;
        hospitalNo: string;
        card: { cardId: number; paymentStatus: string; totalAmount: number };
      };
    };
    expect(created.data.hospitalNo).toMatch(/^GFA\/HMS\//);
    expect(created.data.card.paymentStatus).toBe('Pending');
    expect(created.data.card.totalAmount).toBe(500);

    const pending = resolveOfflineApiResponse('/api/cashier/payments/cards?paymentStatus=Pending', 'GET') as {
      data: { items: Array<{ cardId: number }> };
    };
    expect(pending.data.items.some((c) => c.cardId === created.data.card.cardId)).toBe(true);

    const paid = resolveOfflineApiResponse(
      `/api/cashier/payments/cards/${created.data.card.cardId}/confirm`,
      'POST',
      { paymentChannel: 'Cash' },
    ) as { data: { paymentStatus: string } };
    expect(paid.data.paymentStatus).toBe('Paid');

    const status = resolveOfflineApiResponse(
      `/api/records/persons/${created.data.personId}/payment-status`,
      'GET',
    ) as { data: { paymentCleared: boolean } };
    expect(status.data.paymentCleared).toBe(true);

    const hmo = resolveOfflineApiResponse(
      '/api/insurance/hmo/eligibility?payerId=1&memberNo=HYG-123456',
      'GET',
    ) as { data: { status: string } };
    expect(hmo.data.status).toBe('ACTIVE');

    const triage = resolveOfflineApiResponse('/api/triage', 'POST', {
      personId: created.data.personId,
      clinic: 'General OPD',
      status: 'Sent to Consultation',
    }) as { data: { queueNo: string } };
    expect(triage.data.queueNo).toMatch(/^TQ-/);

    const search = resolveOfflineApiResponse('/api/patients?q=Nwosu', 'GET') as {
      data: { items: Array<{ lastName: string | null }> };
    };
    expect(search.data.items.some((p) => p.lastName === 'Nwosu')).toBe(true);

    const queue = resolveOfflineApiResponse('/api/nursing/patient-queues', 'GET') as {
      data: { items: Array<{ queueNo: string; person: { firstName: string | null } | null }> };
    };
    expect(Array.isArray(queue.data.items)).toBe(true);
    expect(queue.data.items.some((row) => row.person?.firstName === 'Ada')).toBe(true);
    expect(queue.data.items.some((row) => row.queueNo === triage.data.queueNo)).toBe(true);

    const stats = resolveOfflineApiResponse('/api/nursing/patient-queues/stats', 'GET') as {
      data: { waiting: number; total: number };
    };
    expect(typeof stats.data.waiting).toBe('number');
    expect(stats.data.total).toBeGreaterThan(0);
  });
});
