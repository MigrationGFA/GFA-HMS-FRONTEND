import { describe, expect, it } from 'vitest';
import {
  allergyWarning,
  buildDentalSeed,
  followUpDisplayStatus,
  isoDate,
  stockStatus,
  timesOverlap,
} from './dentalData';

describe('dental demonstration data', () => {
  it('seeds a connected clinic for today', () => {
    const today = isoDate(0);
    const state = buildDentalSeed(today);
    expect(state.patients.length).toBeGreaterThanOrEqual(8);
    expect(state.chairs).toHaveLength(4);
    const todayAppts = state.appointments.filter((a) => a.date === today && a.status !== 'Cancelled');
    expect(todayAppts.length).toBeGreaterThan(0);
    for (const appt of state.appointments) {
      expect(state.patients.some((p) => p.id === appt.patientId)).toBe(true);
    }
    const john = state.patients.find((p) => p.id === 'DEN-P-0001');
    expect(john?.drugAllergies.toLowerCase()).toContain('penicillin');
    expect(state.charts.find((c) => c.patientId === 'DEN-P-0001')?.findings.length).toBeGreaterThan(0);
  });

  it('warns when a penicillin-allergic patient is linked to amoxicillin', () => {
    expect(allergyWarning('Penicillin', 'Amoxicillin')).toMatch(/penicillin/i);
    expect(allergyWarning('None', 'Amoxicillin')).toBe('');
    expect(allergyWarning('Aspirin', 'Ibuprofen')).toMatch(/aspirin/i);
  });

  it('detects dentist or chair overlaps and follow-up overdue display', () => {
    expect(timesOverlap('09:00', '09:30', '09:15', '09:45')).toBe(true);
    expect(timesOverlap('09:00', '09:30', '09:30', '10:00')).toBe(false);
    const today = isoDate(0);
    expect(followUpDisplayStatus({
      id: 'FU', patientId: 'P', encounterId: '', procedureId: '', dueDate: isoDate(-1),
      reason: '', dentist: '', status: 'Upcoming', notes: '', appointmentId: '',
    }, today)).toBe('Overdue');
  });

  it('flags low and out-of-stock materials', () => {
    const today = isoDate(0);
    const state = buildDentalSeed(today);
    const statuses = state.inventory.map((item) => stockStatus(item, today));
    expect(statuses).toContain('Low stock');
    expect(statuses).toContain('Out of stock');
  });
});
