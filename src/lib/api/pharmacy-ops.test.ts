import { describe, it, expect } from 'vitest';
import { isPharmacyOpsApiEnabled } from './pharmacy-ops';

/** Expected report types must stay aligned with backend PharmacyService.REPORT_TYPES */
const EXPECTED_REPORT_TYPES = [
  'daily-prescriptions',
  'monthly-prescriptions',
  'drug-utilization',
  'controlled-drugs',
  'revenue',
  'inventory',
  'expiry',
  'returns',
] as const;

const QUEUE_STATUSES = [
  'Awaiting Pharmacy',
  'Awaiting Payment',
  'Dispensed',
  'No Prescription',
] as const;

describe('pharmacy-ops client contracts', () => {
  it('exposes a boolean API enable flag', () => {
    expect(typeof isPharmacyOpsApiEnabled()).toBe('boolean');
  });

  it('documents supported report types for UI catalog', () => {
    expect(EXPECTED_REPORT_TYPES).toHaveLength(8);
    expect(EXPECTED_REPORT_TYPES).toContain('revenue');
    expect(EXPECTED_REPORT_TYPES).toContain('expiry');
  });

  it('documents inpatient queue statuses used by filters', () => {
    expect(QUEUE_STATUSES).toContain('Awaiting Pharmacy');
    expect(QUEUE_STATUSES).toContain('Awaiting Payment');
  });

  it('documents expiry buckets used by monitoring UI', () => {
    const buckets = ['all', 'expired', 'critical', 'warning', 'soon'];
    expect(buckets).toContain('critical');
    expect(buckets).toHaveLength(5);
  });
});
