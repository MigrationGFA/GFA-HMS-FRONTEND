import { describe, it, expect } from 'vitest';
import { evaluateEcgFlags } from './ecg-critical-rules';

describe('evaluateEcgFlags (Phase 5)', () => {
  it('normal sinus', () => {
    expect(evaluateEcgFlags({ heartRate: 78, qtc: 420, rhythm: 'Sinus' }).critical).toBe(false);
  });
  it('STEMI via stElevation boolean', () => {
    expect(evaluateEcgFlags({ heartRate: 90, qtc: 430, rhythm: 'Sinus', stElevation: true }).critical).toBe(true);
  });
  it('STEMI via stChanges string', () => {
    expect(evaluateEcgFlags({ heartRate: 90, qtcMs: 430, rhythm: 'Sinus', stChanges: 'ST elevation' }).critical).toBe(true);
  });
  it('QTc thresholds', () => {
    expect(evaluateEcgFlags({ heartRate: 70, qtc: 480, rhythm: 'Sinus' }).abnormal).toBe(true);
    expect(evaluateEcgFlags({ heartRate: 70, qtc: 480, rhythm: 'Sinus' }).critical).toBe(false);
    expect(evaluateEcgFlags({ heartRate: 70, qtc: 510, rhythm: 'Sinus' }).critical).toBe(true);
  });
  it('VT / VF / extreme HR', () => {
    expect(evaluateEcgFlags({ heartRate: 180, rhythm: 'VT' }).critical).toBe(true);
    expect(evaluateEcgFlags({ heartRate: 200, rhythm: 'VF' }).critical).toBe(true);
    expect(evaluateEcgFlags({ heartRate: 35, rhythm: 'Sinus' }).critical).toBe(true);
  });
});
