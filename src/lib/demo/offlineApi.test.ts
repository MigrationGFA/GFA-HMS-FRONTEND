import { describe, expect, it } from 'vitest';
import { resolveOfflineApiResponse } from './offlineApi';

describe('offline demo API stub', () => {
  it('returns doctor overview KPIs', () => {
    const res = resolveOfflineApiResponse('/api/doctor/overview', 'GET') as {
      data: { kpis: { patientsWaiting: number }; queue: unknown[] };
    };
    expect(res.data.kpis.patientsWaiting).toBeGreaterThan(0);
    expect(res.data.queue.length).toBeGreaterThan(0);
  });

  it('returns branded hospital numbers without FNPH', () => {
    const res = resolveOfflineApiResponse('/api/patients', 'GET') as {
      data: Array<{ hospitalNo: string }>;
    };
    expect(res.data[0].hospitalNo).toMatch(/^GFA\/HMS\/\d{4}\/\d{6}$/);
    expect(JSON.stringify(res)).not.toContain('FNPH');
  });

  it('returns pharmacy, lab and cashier lists', () => {
    const rx = resolveOfflineApiResponse('/api/prescriptions', 'GET') as { data: { items: unknown[] } };
    const lab = resolveOfflineApiResponse('/api/laboratory', 'GET') as { data: unknown[] };
    const bills = resolveOfflineApiResponse('/api/cashier', 'GET') as { data: unknown[] };
    expect(Array.isArray(rx.data.items)).toBe(true);
    expect(lab.data.length).toBeGreaterThan(0);
    expect(bills.data.length).toBeGreaterThan(0);
  });
});
