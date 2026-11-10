import { describe, expect, it } from 'vitest';
import { allergyWarning, bedTaken, buildPaedsSeed, formatAge, isoDate, weightDose } from './paedsData';

describe('paediatric demonstration data', () => {
  it('formats a newborn in weeks and an older child in years', () => {
    const today = '2026-10-27';
    expect(formatAge('2026-10-13', today)).toMatch(/2 weeks/);
    expect(formatAge('2022-01-15', today)).toMatch(/years/);
  });

  it('blocks a second child from an occupied bed and multiplies a stated dose', () => {
    const state = buildPaedsSeed();
    expect(bedTaken(state.beds, 'PB1', 'PAE-P-0001')).toBe(true);
    expect(bedTaken(state.beds, 'PB1', 'PAE-P-0005')).toBe(false);
    expect(weightDose('10', '15')).toEqual({ ok: true, value: '150' });
    expect(allergyWarning('Penicillin', 'Amoxicillin suspension')).toMatch(/allergy/i);
  });

  it('does not treat a booked immunisation visit as a given dose', () => {
    const scheduled = buildPaedsSeed(isoDate()).immunisations.find((row) => row.appointmentId === 'PAP-0002')!;
    expect(scheduled.status).not.toBe('Administered');
    expect(scheduled.dateGiven).toBe('');
  });
});
