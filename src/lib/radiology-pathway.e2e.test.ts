/**
 * Radiology pathway smoke (Phases 5–7 local spine).
 * Full browser Playwright against live API is optional when server is up;
 * this suite guarantees the clinical pathway + ECG critical + result-ready event.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/database';
import { clear } from '@/db/persistence';
import {
  createImagingRequest, markRadPaid, scheduleRequest, startExam, completeImaging,
  submitReport, verifyReport, releaseResult, recordEcg,
} from '@/lib/radiology-actions';
import { evaluateEcgFlags } from '@/lib/ecg-critical-rules';

describe('radiology pathway e2e (local dual-mode spine)', () => {
  beforeEach(() => { db._testReset(); });
  afterEach(() => { clear(); db._testReset(); });

  it('request → pay → schedule → image → report → verify → release emits IMAGING_RESULT_READY', () => {
    const p = db.patients.list()[0];
    const r = createImagingRequest({ patientId: p.id, modality: 'CT Scan', region: 'Brain', indication: 'Seizure' });
    markRadPaid(r.id, { amount: 45000, method: 'Cash', cashier: 'Cashier' });
    expect(scheduleRequest(r.id, { machineId: 'EQ-CT-1' }).ok).toBe(true);
    startExam(r.id, 'Tech');
    expect(completeImaging(r.id, { radiographer: 'Tech' }).ok).toBe(true);
    const sub = submitReport({ requestId: r.id, findings: 'Normal', impression: 'No acute bleed', reportedBy: 'Rad' });
    verifyReport(sub.id!, 'Consultant');
    let fired = false;
    const off = db.on('IMAGING_RESULT_READY', () => { fired = true; });
    expect(releaseResult(sub.id!, 'Consultant').ok).toBe(true);
    off();
    expect(fired).toBe(true);
    expect(db.imagingRequests.get(r.id)!.status).toBe('RELEASED');
  });

  it('emergency bypasses payment gate', () => {
    const p = db.patients.list()[0];
    const r = createImagingRequest({
      patientId: p.id, modality: 'X-Ray', region: 'Chest', indication: 'Trauma', priority: 'EMERGENCY',
    });
    expect(scheduleRequest(r.id, {}).ok).toBe(true);
  });

  it('ECG STEMI critical flags for Critical Findings consumers', () => {
    expect(evaluateEcgFlags({ heartRate: 100, qtc: 440, stElevation: true }).critical).toBe(true);
    const p = db.patients.list()[0];
    const ecg = recordEcg({
      patientId: p.id, type: '12-Lead',
      measurements: { heartRate: 110, rhythm: 'Sinus', stElevation: true, qtc: 430 },
    });
    expect(ecg.critical).toBe(true);
  });
});
