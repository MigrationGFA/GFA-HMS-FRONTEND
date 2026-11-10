import { describe, expect, it } from 'vitest';
import { allergyWarning, buildEyeSeed, canGenerateSpectacle, isoDate, timesOverlap, validateEyeRefraction, emptyRefractionEye } from './eyeData';

describe('eye clinic demonstration data', () => {
  it('links today’s appointments to seeded patients', () => {
    const today = isoDate(0);
    const state = buildEyeSeed(today);
    expect(state.patients.length).toBeGreaterThanOrEqual(8);
    const todayAppts = state.appointments.filter((a) => a.date === today && a.status !== 'Cancelled');
    expect(todayAppts.length).toBeGreaterThan(0);
    for (const appt of state.appointments) {
      expect(state.patients.some((p) => p.id === appt.patientId)).toBe(true);
    }
    const linked = state.spectacles[0];
    const source = state.refractions.find((r) => r.id === linked.refractionId);
    expect(source?.status).toBe('Saved');
    expect(source?.od.sphere).toBe(linked.od.sphere);
  });

  it('warns on a matching ophthalmic allergy and rejects a bad axis', () => {
    expect(allergyWarning('Chloramphenicol', 'Chloramphenicol eye drops')).toMatch(/allergy/i);
    expect(allergyWarning('None', 'Timolol eye drops')).toBe('');
    const eye = { ...emptyRefractionEye(), sphere: '-1.25', cylinder: '-0.50', axis: '200' };
    expect(validateEyeRefraction(eye, 'OD')).toMatch(/axis/i);
  });

  it('blocks spectacle generation from an incomplete draft', () => {
    const today = isoDate(0);
    const draft = buildEyeSeed(today).refractions.find((r) => r.status === 'Draft')!;
    expect(canGenerateSpectacle(draft)).toMatch(/save the refraction/i);
    expect(timesOverlap('09:00', '09:40', '09:20', '10:00')).toBe(true);
    expect(timesOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false);
  });
});
