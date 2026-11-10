// ============================================================
// EMR BACKGROUND SYNC — Data layer (frontend-only demo)
// HMS → EMR + external systems (NHIS, NIBSS, NPHCDA)
// ============================================================

export type SyncEventType =
  | 'PATIENT_REGISTERED'
  | 'VISIT_CREATED'
  | 'CONSULTATION_COMPLETED'
  | 'LAB_REQUEST_CREATED'
  | 'LAB_RESULT_READY'
  | 'PRESCRIPTION_CREATED'
  | 'DRUG_DISPENSED'
  | 'ADMISSION_CREATED'
  | 'BED_TRANSFER'
  | 'DISCHARGE_COMPLETED'
  | 'INVOICE_PAID'
  | 'NHIS_CLAIM';

export type SyncStatus = 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'RETRY' | 'FAILED' | 'DEAD_LETTER';
export type SyncTier = 'REALTIME' | 'NEAR_REALTIME' | 'BATCH';
export type SyncTarget = 'EMR' | 'NHIS' | 'NIBSS' | 'NPHCDA';
export type SyncPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface SyncEvent {
  id: string;                    // EV0001
  hmsRef: string;                // HMS ref (visit, rx, lab id...)
  type: SyncEventType;
  module: 'Consultation' | 'Lab' | 'Pharmacy' | 'IPD' | 'Billing' | 'Records';
  target: SyncTarget;
  tier: SyncTier;
  priority: SyncPriority;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  syncedAt?: string;
  emrRef?: string;               // EMR-side ID after success
  payloadSize: number;           // bytes (display)
  errorCode?: string;
  errorMessage?: string;
  createdBy: string;
  patientName?: string;
  hmsId?: string;
}

export interface IdMapping {
  hmsId: string;
  emrId: string;
  type: 'PATIENT' | 'VISIT' | 'ADMISSION' | 'LAB' | 'RX';
  status: 'SYNCED' | 'PENDING';
  mappedAt: string;
}

export interface AdapterRule {
  id: string;
  name: string;
  hmsField: string;
  emrField: string;
  transform: string;
  example: string;
}

export interface SyncAuditEntry {
  id: string;
  eventId: string;
  action: 'CREATED' | 'PICKED' | 'TRANSFORMED' | 'SENT' | 'ACK' | 'NACK' | 'RETRIED' | 'DEAD_LETTERED' | 'MANUAL_RETRY' | 'MANUAL_RESOLVE';
  actor: string;
  at: string;
  detail: string;
}

export interface ChannelHealth {
  target: SyncTarget;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  uptimePct: number;
  avgLatencyMs: number;
  lastSuccess: string;
  lastFailure?: string;
  endpoint: string;
}

// ------------- Mock data (Nigerian hospital flavour) ---------
const N = (d: number, h = 9, m = 0) =>
  new Date(2026, 3, 28 - d, h, m).toISOString();

export const channelHealth: ChannelHealth[] = [
  { target: 'EMR',    status: 'UP',       uptimePct: 99.2, avgLatencyMs: 412, lastSuccess: N(0, 9, 18), endpoint: 'https://emr.oouth.gov.ng/api/v2' },
  { target: 'NHIS',   status: 'DEGRADED', uptimePct: 92.4, avgLatencyMs: 1840, lastSuccess: N(0, 8, 41), lastFailure: N(0, 9, 12), endpoint: 'https://api.nhis.gov.ng/claims' },
  { target: 'NIBSS',  status: 'UP',       uptimePct: 99.9, avgLatencyMs: 220, lastSuccess: N(0, 9, 14), endpoint: 'https://nibss-api.ng/recon' },
  { target: 'NPHCDA', status: 'DOWN',     uptimePct: 76.0, avgLatencyMs: 0,   lastSuccess: N(1, 17, 0), lastFailure: N(0, 9, 10), endpoint: 'https://nphcda.gov.ng/registry' },
];

export const idMappings: IdMapping[] = [
  { hmsId: 'GFA HMS/2026/000145', emrId: 'EMR-778201', type: 'PATIENT', status: 'SYNCED', mappedAt: N(2) },
  { hmsId: 'GFA HMS/2026/000146', emrId: 'EMR-778202', type: 'PATIENT', status: 'SYNCED', mappedAt: N(2, 10) },
  { hmsId: 'GFA HMS/2026/000147', emrId: '—',          type: 'PATIENT', status: 'PENDING', mappedAt: N(0, 9) },
  { hmsId: 'V-2026-0481',       emrId: 'EMR-V-22014',type: 'VISIT',   status: 'SYNCED', mappedAt: N(0, 8, 20) },
  { hmsId: 'V-2026-0482',       emrId: 'EMR-V-22015',type: 'VISIT',   status: 'SYNCED', mappedAt: N(0, 8, 41) },
  { hmsId: 'ADM-2026-0091',     emrId: 'EMR-A-9921', type: 'ADMISSION', status: 'SYNCED', mappedAt: N(1, 14) },
  { hmsId: 'ADM-2026-0092',     emrId: '—',          type: 'ADMISSION', status: 'PENDING', mappedAt: N(0, 7) },
  { hmsId: 'LAB-2026-0331',     emrId: 'EMR-L-1881', type: 'LAB',     status: 'SYNCED', mappedAt: N(0, 8) },
  { hmsId: 'RX-2026-1102',      emrId: 'EMR-R-4421', type: 'RX',      status: 'SYNCED', mappedAt: N(0, 9) },
];

export const adapterRules: AdapterRule[] = [
  { id: 'AR-01', name: 'Diagnosis → ICD-10', hmsField: 'diagnosis.text', emrField: 'condition.code', transform: 'ICD10_LOOKUP(text)', example: '"Malaria" → B50' },
  { id: 'AR-02', name: 'Lab Test → LOINC', hmsField: 'lab.test_name', emrField: 'observation.code', transform: 'LOINC_LOOKUP(name)', example: '"FBC" → 58410-2' },
  { id: 'AR-03', name: 'Drug → ATC', hmsField: 'drug.name', emrField: 'medication.code', transform: 'ATC_LOOKUP(name)', example: '"Artemether" → P01BF01' },
  { id: 'AR-04', name: 'Patient ID Mapping', hmsField: 'patient.hmsId', emrField: 'patient.identifier', transform: 'ID_MAP(HMS→EMR)', example: 'GFA HMS/2026/000145 → EMR-778201' },
  { id: 'AR-05', name: 'Date Format', hmsField: '*.date', emrField: '*.date', transform: 'ISO8601(localDate, Africa/Lagos)', example: '28/04/2026 → 2026-04-28T09:00:00+01:00' },
  { id: 'AR-06', name: 'Currency Normalisation', hmsField: 'invoice.amount', emrField: 'claim.total', transform: 'NGN_TO_MINOR(amount)', example: '₦12,500.00 → 1250000 NGN' },
  { id: 'AR-07', name: 'Gender → HL7', hmsField: 'patient.gender', emrField: 'patient.gender', transform: 'M→male, F→female', example: '"Male" → male' },
  { id: 'AR-08', name: 'Ward → Location', hmsField: 'admission.ward', emrField: 'encounter.location', transform: 'WARD_MAP(name)', example: 'Medical Ward A → LOC-MWA' },
];

export const syncEvents: SyncEvent[] = [
  // Synced (success)
  { id: 'EV-1042', hmsRef: 'V-2026-0481', type: 'CONSULTATION_COMPLETED', module: 'Consultation', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'SYNCED', retryCount: 0, maxRetries: 5, createdAt: N(0, 8, 20), lastAttemptAt: N(0, 8, 21), syncedAt: N(0, 8, 21),
    emrRef: 'EMR-V-22014', payloadSize: 2840, createdBy: 'Dr. Adebayo O.', patientName: 'Adebayo Ogundimu', hmsId: 'GFA HMS/2026/000145' },
  { id: 'EV-1043', hmsRef: 'LAB-2026-0331', type: 'LAB_RESULT_READY', module: 'Lab', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'SYNCED', retryCount: 1, maxRetries: 5, createdAt: N(0, 8, 30), lastAttemptAt: N(0, 8, 33), syncedAt: N(0, 8, 33),
    emrRef: 'EMR-L-1881', payloadSize: 1180, createdBy: 'Lab Tech B.', patientName: 'Adebayo Ogundimu', hmsId: 'GFA HMS/2026/000145' },
  { id: 'EV-1044', hmsRef: 'RX-2026-1102', type: 'DRUG_DISPENSED', module: 'Pharmacy', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'SYNCED', retryCount: 0, maxRetries: 5, createdAt: N(0, 9, 0), lastAttemptAt: N(0, 9, 1), syncedAt: N(0, 9, 1),
    emrRef: 'EMR-R-4421', payloadSize: 920, createdBy: 'Pharm. Chioma', patientName: 'Adebayo Ogundimu', hmsId: 'GFA HMS/2026/000145' },

  // In-flight
  { id: 'EV-1051', hmsRef: 'V-2026-0490', type: 'VISIT_CREATED', module: 'Records', target: 'EMR', tier: 'REALTIME', priority: 'HIGH',
    status: 'IN_FLIGHT', retryCount: 0, maxRetries: 5, createdAt: N(0, 9, 17), lastAttemptAt: N(0, 9, 18),
    payloadSize: 540, createdBy: 'Records Officer', patientName: 'Funmi Adekunle', hmsId: 'GFA HMS/2026/000148' },

  // Pending in queue
  { id: 'EV-1052', hmsRef: 'V-2026-0491', type: 'CONSULTATION_COMPLETED', module: 'Consultation', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'PENDING', retryCount: 0, maxRetries: 5, createdAt: N(0, 9, 12),
    payloadSize: 3120, createdBy: 'Dr. Bisi Akinwale', patientName: 'Tunde Bakare', hmsId: 'GFA HMS/2026/000150' },
  { id: 'EV-1053', hmsRef: 'LAB-2026-0339', type: 'LAB_REQUEST_CREATED', module: 'Lab', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'PENDING', retryCount: 0, maxRetries: 5, createdAt: N(0, 9, 14),
    payloadSize: 410, createdBy: 'Dr. Bisi Akinwale', patientName: 'Tunde Bakare', hmsId: 'GFA HMS/2026/000150' },
  { id: 'EV-1054', hmsRef: 'ADM-2026-0092', type: 'ADMISSION_CREATED', module: 'IPD', target: 'EMR', tier: 'REALTIME', priority: 'HIGH',
    status: 'PENDING', retryCount: 0, maxRetries: 5, createdAt: N(0, 7, 32),
    payloadSize: 1820, createdBy: 'Nurse Ngozi', patientName: 'Yusuf Mohammed', hmsId: 'GFA HMS/2026/000147' },

  // Retry (transient error)
  { id: 'EV-1048', hmsRef: 'INV-2026-2210', type: 'INVOICE_PAID', module: 'Billing', target: 'NIBSS', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'RETRY', retryCount: 2, maxRetries: 5, createdAt: N(0, 8, 50), lastAttemptAt: N(0, 9, 10), nextRetryAt: N(0, 9, 25),
    payloadSize: 740, createdBy: 'Cashier Halima', errorCode: 'TIMEOUT', errorMessage: 'NIBSS gateway timed out after 30s',
    patientName: 'Tunde Bakare', hmsId: 'GFA HMS/2026/000150' },
  { id: 'EV-1049', hmsRef: 'INV-2026-2211', type: 'NHIS_CLAIM', module: 'Billing', target: 'NHIS', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'RETRY', retryCount: 3, maxRetries: 5, createdAt: N(0, 8, 55), lastAttemptAt: N(0, 9, 11), nextRetryAt: N(0, 9, 30),
    payloadSize: 2210, createdBy: 'Finance Office', errorCode: 'NHIS_503', errorMessage: 'NHIS upstream degraded — retry queued',
    patientName: 'Funmi Adekunle', hmsId: 'GFA HMS/2026/000148' },

  // Failed (max retries) — Dead-letter candidates
  { id: 'EV-1031', hmsRef: 'V-2026-0470', type: 'CONSULTATION_COMPLETED', module: 'Consultation', target: 'EMR', tier: 'NEAR_REALTIME', priority: 'NORMAL',
    status: 'DEAD_LETTER', retryCount: 5, maxRetries: 5, createdAt: N(1, 16), lastAttemptAt: N(0, 8, 0),
    payloadSize: 2980, createdBy: 'Dr. Adebayo O.', errorCode: 'EMR_VALIDATION', errorMessage: 'Diagnosis code not mapped — ICD-10 lookup miss',
    patientName: 'Mary Okonkwo', hmsId: 'GFA HMS/2026/000142' },
  { id: 'EV-1032', hmsRef: 'ADM-2026-0089', type: 'DISCHARGE_COMPLETED', module: 'IPD', target: 'NPHCDA', tier: 'BATCH', priority: 'LOW',
    status: 'FAILED', retryCount: 4, maxRetries: 5, createdAt: N(1, 18), lastAttemptAt: N(0, 9, 5), nextRetryAt: N(0, 10, 0),
    payloadSize: 4120, createdBy: 'Records Officer', errorCode: 'CONN_REFUSED', errorMessage: 'NPHCDA registry endpoint unreachable',
    patientName: 'Ibrahim Salami', hmsId: 'GFA HMS/2026/000139' },
];

export const syncAuditTrail: SyncAuditEntry[] = [
  { id: 'A-9001', eventId: 'EV-1042', action: 'CREATED',     actor: 'Consultation Module', at: N(0, 8, 20), detail: 'CONSULTATION_COMPLETED → queued for EMR' },
  { id: 'A-9002', eventId: 'EV-1042', action: 'PICKED',      actor: 'Worker #2', at: N(0, 8, 20, ), detail: 'Picked from queue (lease 60s)' },
  { id: 'A-9003', eventId: 'EV-1042', action: 'TRANSFORMED', actor: 'EMR Adapter v2.1', at: N(0, 8, 20), detail: 'Diagnosis "Malaria" → ICD-10 B50; mapped 12 fields' },
  { id: 'A-9004', eventId: 'EV-1042', action: 'SENT',        actor: 'Worker #2', at: N(0, 8, 21), detail: 'POST /api/v2/encounters · 2,840 bytes' },
  { id: 'A-9005', eventId: 'EV-1042', action: 'ACK',         actor: 'EMR', at: N(0, 8, 21), detail: 'HTTP 201 · emrRef=EMR-V-22014 · 386ms' },
  { id: 'A-9006', eventId: 'EV-1048', action: 'NACK',        actor: 'NIBSS', at: N(0, 9, 10), detail: 'HTTP 504 · TIMEOUT after 30s' },
  { id: 'A-9007', eventId: 'EV-1048', action: 'RETRIED',     actor: 'Worker #1', at: N(0, 9, 10), detail: 'Backoff 15min · attempt 3/5' },
  { id: 'A-9008', eventId: 'EV-1031', action: 'DEAD_LETTERED', actor: 'Worker #3', at: N(0, 8, 0), detail: 'Max retries exceeded (5/5) · admin alert raised' },
];

export const failureCodes: { code: string; meaning: string; recommended: string }[] = [
  { code: 'TIMEOUT',         meaning: 'Upstream did not respond within 30s', recommended: 'Auto-retry with backoff (network)' },
  { code: 'EMR_VALIDATION',  meaning: 'EMR rejected payload structure',      recommended: 'Manual fix: review adapter mapping' },
  { code: 'CONN_REFUSED',    meaning: 'Upstream endpoint unreachable',       recommended: 'Wait for system recovery' },
  { code: 'NHIS_503',        meaning: 'NHIS service degraded',               recommended: 'Auto-retry with longer backoff' },
  { code: 'AUTH_EXPIRED',    meaning: 'OAuth token expired',                 recommended: 'Refresh token + retry automatically' },
  { code: 'DUPLICATE',       meaning: 'EMR reported duplicate record',       recommended: 'Mark as synced (use existing emrRef)' },
];

// ----------- Aggregations -----------
export const sumByStatus = () => {
  return syncEvents.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<SyncStatus, number>);
};

export const sumByTarget = () => {
  return syncEvents.reduce((acc, e) => {
    acc[e.target] = (acc[e.target] ?? 0) + 1;
    return acc;
  }, {} as Record<SyncTarget, number>);
};

export const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`;

export const tierColor = (t: SyncTier) =>
  t === 'REALTIME' ? 'emerald' : t === 'NEAR_REALTIME' ? 'sky' : 'violet';

export const statusBadge = (s: SyncStatus): 'success' | 'warning' | 'pending' | 'destructive' | 'info' => {
  if (s === 'SYNCED') return 'success';
  if (s === 'PENDING' || s === 'IN_FLIGHT') return 'info';
  if (s === 'RETRY') return 'warning';
  return 'destructive';
};

// Example payload templates (for the “Event payload” preview)
export const samplePayload = (e: SyncEvent) => {
  switch (e.type) {
    case 'CONSULTATION_COMPLETED':
      return {
        event_type: e.type,
        patient_id: e.hmsId,
        visit_id: e.hmsRef,
        diagnosis: 'Malaria',
        icd10: 'B50',
        notes: 'Fever, chills, +ve MP',
        provider: e.createdBy,
        timestamp: e.createdAt,
      };
    case 'LAB_RESULT_READY':
      return { event_type: e.type, lab_id: e.hmsRef, test: 'FBC', loinc: '58410-2', result: 'Normal', verified_by: 'Dr. Pathologist' };
    case 'DRUG_DISPENSED':
      return { event_type: e.type, rx_id: e.hmsRef, drugs: [{ name: 'Artemether', atc: 'P01BF01', qty: 6 }], dispensed_by: e.createdBy };
    case 'ADMISSION_CREATED':
      return { event_type: e.type, admission_id: e.hmsRef, ward: 'Medical Ward A', location_code: 'LOC-MWA', admitted_by: e.createdBy };
    case 'INVOICE_PAID':
      return { event_type: e.type, invoice_id: e.hmsRef, amount_minor: 1250000, currency: 'NGN', channel: 'POS', terminal: 'TERM-04' };
    case 'NHIS_CLAIM':
      return { event_type: e.type, claim_id: e.hmsRef, nhis_no: 'NHIS-220198', total: 18450, items: 4 };
    default:
      return { event_type: e.type, ref: e.hmsRef };
  }
};