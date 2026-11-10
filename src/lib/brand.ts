// Canonical hospital identity for the GFA Health HMS sales demo.
export const HOSPITAL_NAME = 'GFA Demo Hospital';
export const HOSPITAL_SHORT = 'GFA HMS';
export const HOSPITAL_CODE = 'GFA';
export const VENDOR_NAME = 'GFA Health Technologies Ltd';
export const VENDOR_URL = 'https://gfa-health.com/';

/** Hospital number: GFA/HMS/2026/000145 (one format, zero-padded to 6). */
export const hospitalId = (seq: number, year = new Date().getFullYear()) =>
  `${HOSPITAL_CODE}/HMS/${year}/${String(seq).padStart(6, '0')}`;

/** Parse legacy seed ids like "GFA HMS/2026/00145" → canonical GFA/HMS/2026/000145. */
export const normalizeLegacyHospitalId = (legacy: string): string => {
  const m = legacy.match(/(\d{4})\/(\d+)/);
  if (!m) return legacy;
  return hospitalId(Number(m[2]), Number(m[1]));
};

export const bookingCode = (seq: number) => `GFA-APPT-${String(seq).padStart(5, '0')}`;
export const invoiceNo = (seq: number) => `INV-${String(seq).padStart(6, '0')}`;
export const receiptNo = (seq: number) => `RCP-${String(seq).padStart(6, '0')}`;
export const sampleNo = (seq: number) => `SMP-${String(seq).padStart(6, '0')}`;
