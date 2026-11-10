import { apiRequest } from './client';
import { env } from '../env';

type ApiEnvelope<T> = { data: T };
type Meta = { page: number; limit: number; total: number };
type Paged<T> = { items: T[]; meta: Meta };

export type ApiLabTest = {
  labTestId: number;
  testCode: string;
  name: string;
  category: string;
  specimenType: string;
  container: string | null;
  turnaround: string;
  unitPrice: number;
  loincCode: string | null;
  lisCode?: string | null;
  department?: string | null;
  description?: string | null;
  testGroupId?: number | null;
  testGroupName?: string | null;
  isPanel: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApiLabRequestItem = {
  itemId: number;
  labTestId: number;
  testCode: string;
  testName: string;
  category: string | null;
  specimenType: string | null;
  unitPrice: number;
  lineNotes: string | null;
  observation?: string | null;
  conclusion?: string | null;
  remark?: string | null;
};

export type ApiLabRequestPerson = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  phone: string | null;
};

export type ApiLabRequest = {
  labRequestId: number;
  requestNo: string;
  personId: number;
  encounterId: number | null;
  doctorId: number;
  source: string;
  priority: string;
  clinicalIndication: string | null;
  clinicalNotes: string | null;
  status: string;
  /** LIS workflow: AwaitingCollection | Collected | ResultDraft | AwaitingValidation | Validated | PendingRevalidation */
  labStatus?: string;
  paymentStatus: string;
  paymentChannel: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  paidBy: string | null;
  totalAmount: number;
  paymentCleared?: boolean;
  processingLocked?: boolean;
  billType?: string | null;
  requestReason?: string | null;
  patientContext?: string | null;
  clinicId?: number | null;
  doctorComment?: string | null;
  labComment?: string | null;
  admissionId?: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  doctorName: string | null;
  items: ApiLabRequestItem[];
  person: ApiLabRequestPerson | null;
};

export type CreateLabRequestPayload = {
  personId: number;
  encounterId?: number;
  priority?: 'Routine' | 'Urgent' | 'Stat';
  clinicalIndication?: string;
  clinicalNotes?: string;
  source?: 'Doctor' | 'WalkIn';
  items: { testId: number; lineNotes?: string }[];
};

export function isLaboratoryApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}

export function labPatientName(person: ApiLabRequestPerson | null | undefined): string {
  if (!person) return 'Unknown';
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ') || 'Unknown';
}

export async function listLabTests(params?: {
  q?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabTest>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabTest>>>(
    `/api/laboratory/tests?${qs}`,
  );
  return body.data;
}

export async function getLabTest(id: number): Promise<ApiLabTest> {
  const body = await apiRequest<ApiEnvelope<ApiLabTest>>(
    `/api/laboratory/tests/${id}`,
  );
  return body.data;
}

export async function createLabRequest(
  payload: CreateLabRequestPayload,
): Promise<ApiLabRequest> {
  const body = await apiRequest<ApiEnvelope<ApiLabRequest>>(
    `/api/laboratory/requests`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listLabRequests(params?: {
  personId?: number;
  encounterId?: number;
  status?: string;
  labStatus?: string;
  paymentStatus?: string;
  source?: string;
  workQueue?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabRequest>> {
  const qs = new URLSearchParams();
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.encounterId != null) qs.set('encounterId', String(params.encounterId));
  if (params?.status) qs.set('status', params.status);
  if (params?.labStatus) qs.set('labStatus', params.labStatus);
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.source) qs.set('source', params.source);
  if (params?.workQueue) qs.set('workQueue', 'true');
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabRequest>>>(
    `/api/laboratory/requests?${qs}`,
  );
  return body.data;
}

/** Full lab request list (includes Unpaid). Optional workQueue=true → Paid/Waived only. */
export async function listLabRequestCenter(params?: {
  source?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabRequest>> {
  return listLabRequests({
    status: 'Sent',
    source: params?.source,
    q: params?.q,
    page: params?.page,
    limit: params?.limit ?? 100,
  });
}

/** Paid/Waived only — ready for sample/result processing. */
export async function listLabWorkQueue(params?: {
  source?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabRequest>> {
  return listLabRequests({
    workQueue: true,
    status: 'Sent',
    paymentStatus: 'Paid,Waived',
    source: params?.source,
    q: params?.q,
    page: params?.page,
    limit: params?.limit ?? 100,
  });
}

export function isLabPaymentCleared(r: Pick<ApiLabRequest, 'paymentStatus' | 'paymentCleared'>): boolean {
  if (typeof r.paymentCleared === 'boolean') return r.paymentCleared;
  return r.paymentStatus === 'Paid' || r.paymentStatus === 'Waived';
}

export function isLabProcessingLocked(r: Pick<ApiLabRequest, 'paymentStatus' | 'processingLocked' | 'paymentCleared'>): boolean {
  if (typeof r.processingLocked === 'boolean') return r.processingLocked;
  return !isLabPaymentCleared(r);
}

export async function getLabRequest(id: number): Promise<ApiLabRequest> {
  const body = await apiRequest<ApiEnvelope<ApiLabRequest>>(
    `/api/laboratory/requests/${id}`,
  );
  return body.data;
}

export async function cancelLabRequest(id: number): Promise<ApiLabRequest> {
  const body = await apiRequest<ApiEnvelope<ApiLabRequest>>(
    `/api/laboratory/requests/${id}/cancel`,
    { method: 'POST' },
  );
  return body.data;
}

export async function listCashierLabRequests(params?: {
  paymentStatus?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabRequest>> {
  const qs = new URLSearchParams();
  qs.set('paymentStatus', params?.paymentStatus ?? 'Unpaid');
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabRequest>>>(
    `/api/cashier/payments/lab-requests?${qs}`,
  );
  return body.data;
}

export async function confirmLabRequestPayment(
  id: number,
  payload: { paymentChannel: string; paymentRef?: string },
): Promise<ApiLabRequest> {
  const body = await apiRequest<ApiEnvelope<ApiLabRequest>>(
    `/api/cashier/payments/lab-requests/${id}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

// ---------------------------------------------------------------------------
// Result templates (DB-managed)
// ---------------------------------------------------------------------------

export type ApiTemplateFieldType = 'select' | 'number' | 'text' | 'textarea' | 'multiselect';

export type ApiTemplateField = {
  key: string;
  label: string;
  type: ApiTemplateFieldType;
  options?: string[];
  unit?: string;
  ref?: string;
  critical?: string[];
  required?: boolean;
};

export type ApiLabTemplate = {
  templateId: number;
  code: string;
  name: string;
  category: string;
  description: string | null;
  fields: ApiTemplateField[];
  status: string;
  createdBy: string | null;
  createdAt: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

export async function listLabTemplates(params?: {
  q?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabTemplate>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  if (params?.status) qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabTemplate>>>(
    `/api/laboratory/templates?${qs}`,
  );
  return body.data;
}

export async function getLabTemplate(id: number): Promise<ApiLabTemplate> {
  const body = await apiRequest<ApiEnvelope<ApiLabTemplate>>(
    `/api/laboratory/templates/${id}`,
  );
  return body.data;
}

export async function createLabTemplate(payload: {
  code?: string;
  name: string;
  category: string;
  description?: string;
  fields: ApiTemplateField[];
  status?: string;
}): Promise<ApiLabTemplate> {
  const body = await apiRequest<ApiEnvelope<ApiLabTemplate>>(
    `/api/laboratory/templates`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function updateLabTemplate(
  id: number,
  payload: {
    name?: string;
    category?: string;
    description?: string;
    fields?: ApiTemplateField[];
    status?: string;
  },
): Promise<ApiLabTemplate> {
  const body = await apiRequest<ApiEnvelope<ApiLabTemplate>>(
    `/api/laboratory/templates/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

// ---------------------------------------------------------------------------
// LIS pipeline: samples, results, validation, amendment
// ---------------------------------------------------------------------------

export type ApiLabSample = {
  sampleId: number;
  sampleNo: string;
  labRequestId: number;
  specimenType: string;
  container: string | null;
  status: string;
  collectedBy: string | null;
  collectedAt: string | null;
  rejectReason: string | null;
  createdAt: string | null;
  requestNo: string | null;
  priority: string | null;
  labStatus: string | null;
  personId: number | null;
  personName: string | null;
  hospitalNo: string | null;
};

export type ApiLabResultValues = Record<string, string | number | string[] | null>;

export type ApiLabResult = {
  labResultId: number;
  labRequestId: number;
  requestItemId: number;
  templateId: number | null;
  templateCode: string | null;
  templateName: string | null;
  templateFields: ApiTemplateField[] | null;
  values: ApiLabResultValues;
  comment: string | null;
  status: string;
  enteredBy: string | null;
  enteredAt: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  returnReason: string | null;
  version: number;
  testCode: string | null;
  testName: string | null;
  category: string | null;
  specimenType: string | null;
  requestNo: string | null;
  priority: string | null;
  labStatus: string | null;
  personId: number | null;
  personName: string | null;
  hospitalNo: string | null;
  sex: string | null;
  criticalFlag?: boolean;
  criticalAckAt?: string | null;
  criticalAckBy?: string | null;
  labNo?: string | null;
  flag?: string | null;
  lBand?: string | null;
  hBand?: string | null;
  uom?: string | null;
  machineId?: number | null;
  machineName?: string | null;
  machineCode?: string | null;
};

export type ApiLabResultVersion = {
  versionId: number;
  labResultId: number;
  version: number;
  values: ApiLabResultValues;
  comment: string | null;
  action: string;
  reason: string | null;
  actedBy: string | null;
  actedAt: string;
};

export async function collectLabRequestSamples(
  requestId: number,
): Promise<{ request: ApiLabRequest; samples: ApiLabSample[] }> {
  const body = await apiRequest<ApiEnvelope<{ request: ApiLabRequest; samples: ApiLabSample[] }>>(
    `/api/laboratory/requests/${requestId}/collect`,
    { method: 'POST' },
  );
  return body.data;
}

export async function listLabSamples(params?: {
  status?: string;
  requestId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabSample>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.requestId != null) qs.set('requestId', String(params.requestId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabSample>>>(
    `/api/laboratory/samples?${qs}`,
  );
  return body.data;
}

export async function rejectLabSample(
  sampleId: number,
  reason: string,
): Promise<ApiLabSample> {
  const body = await apiRequest<ApiEnvelope<ApiLabSample>>(
    `/api/laboratory/samples/${sampleId}/reject`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function saveLabResults(
  requestId: number,
  payload: {
    action: 'draft' | 'submit';
    items: {
      requestItemId: number;
      templateId?: number;
      values: ApiLabResultValues;
      comment?: string;
    }[];
  },
): Promise<{ request: ApiLabRequest; results: ApiLabResult[] }> {
  const body = await apiRequest<ApiEnvelope<{ request: ApiLabRequest; results: ApiLabResult[] }>>(
    `/api/laboratory/requests/${requestId}/results`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export async function listLabResults(params?: {
  status?: string;
  requestId?: number;
  personId?: number;
  critical?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabResult>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.requestId != null) qs.set('requestId', String(params.requestId));
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.critical) qs.set('critical', 'true');
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabResult>>>(
    `/api/laboratory/results?${qs}`,
  );
  return body.data;
}

export async function acknowledgeLabResult(id: number): Promise<ApiLabResult> {
  const body = await apiRequest<ApiEnvelope<ApiLabResult>>(
    `/api/laboratory/results/${id}/acknowledge`,
    { method: 'POST' },
  );
  return body.data;
}

export async function getLabResult(id: number): Promise<ApiLabResult> {
  const body = await apiRequest<ApiEnvelope<ApiLabResult>>(
    `/api/laboratory/results/${id}`,
  );
  return body.data;
}

export async function listLabResultVersions(
  id: number,
): Promise<ApiLabResultVersion[]> {
  const body = await apiRequest<ApiEnvelope<ApiLabResultVersion[]>>(
    `/api/laboratory/results/${id}/versions`,
  );
  return body.data;
}

export async function validateLabResult(id: number): Promise<ApiLabResult> {
  const body = await apiRequest<ApiEnvelope<ApiLabResult>>(
    `/api/laboratory/results/${id}/validate`,
    { method: 'POST' },
  );
  return body.data;
}

export async function returnLabResult(
  id: number,
  reason: string,
): Promise<ApiLabResult> {
  const body = await apiRequest<ApiEnvelope<ApiLabResult>>(
    `/api/laboratory/results/${id}/return`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function amendLabResult(
  id: number,
  payload: { values: ApiLabResultValues; comment?: string; reason: string },
): Promise<ApiLabResult> {
  const body = await apiRequest<ApiEnvelope<ApiLabResult>>(
    `/api/laboratory/results/${id}/amend`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

/* ─── Lab history ─────────────────────────────────────────────────── */

export type ApiLabHistoryItem = {
  requestId: number;
  requestNo: string;
  testName: string;
  testCode: string;
  category: string | null;
  requestedAt: string | null;
  paymentStatus: string;
  labStatus: string;
  resultId: number | null;
  resultStatus: string | null;
  resultSummary: string | null;
  validatedAt: string | null;
};

export type ApiLabHistory = {
  patient: {
    personId: number;
    hospitalNo: string | null;
    firstName: string | null;
    lastName: string | null;
    middleName: string | null;
    sex: string | null;
    dateOfBirth: string | null;
    name: string;
  };
  items: ApiLabHistoryItem[];
  meta: { page: number; limit: number; total: number };
};

export async function getLabHistory(params: {
  personId: number;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<ApiLabHistory> {
  const qs = new URLSearchParams();
  qs.set('personId', String(params.personId));
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.q) qs.set('q', params.q);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<ApiLabHistory>>(`/api/laboratory/history?${qs}`);
  return body.data;
}

/* ─── Blood bank ──────────────────────────────────────────────────── */

export type ApiBloodUnit = {
  bloodUnitId: number;
  unitNo: string;
  bloodGroup: string;
  component: string;
  expiryDate: string;
  status: string;
  donorId?: number | null;
  donorLabel: string | null;
  doctorId?: number | null;
  doctorLabel?: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApiBloodDonor = {
  donorId: number;
  donorNo: string;
  fullName: string;
  phone: string;
  address: string | null;
  bloodGroup: string | null;
  notes: string | null;
  status: string;
  createdAt: string | null;
  createdBy: string | null;
};

export type ApiBloodDoctorHit = {
  userId: number;
  name: string;
  email: string | null;
  role: string | null;
};

export type ApiBloodIssueHistoryItem = {
  crossmatchId: number;
  crossmatchNo: string;
  requestNo: string | null;
  personId: number | null;
  patientName: string | null;
  unitNo: string | null;
  bloodGroup: string;
  component: string | null;
  unitStatus: string | null;
  donorLabel: string | null;
  department: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  requestStatus: string | null;
};

export type ApiBloodRequestEvent = {
  eventId: number;
  action: string;
  reason: string | null;
  actorLabel: string | null;
  at: string;
};

export type ApiBloodRequest = {
  bloodRequestId: number;
  requestNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string;
  bloodGroup: string;
  unitsRequested: number;
  department: string;
  doctorId?: number | null;
  doctorLabel: string | null;
  status: string;
  crossMatchResult: string | null;
  notes: string | null;
  rejectReason: string | null;
  issuedAt: string | null;
  issuedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
  events: ApiBloodRequestEvent[];
};

export type ApiBloodCrossmatch = {
  crossmatchId: number;
  crossmatchNo: string;
  requestNo: string | null;
  unitNo: string | null;
  patientName: string | null;
  bloodGroup: string;
  result: string;
  notes: string | null;
  createdAt: string | null;
  createdBy: string | null;
};

export type ApiBloodBankSummary = {
  available: number;
  reserved: number;
  expired: number;
  issued: number;
  crossMatchRequests: number;
  emergencyRequests: number;
  stockByGroup: { bloodGroup: string; units: number }[];
};

export async function getBloodBankSummary(): Promise<ApiBloodBankSummary> {
  const body = await apiRequest<ApiEnvelope<ApiBloodBankSummary>>('/api/laboratory/blood-bank/summary');
  return body.data;
}

export async function listBloodUnits(params?: {
  status?: string;
  bloodGroup?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiBloodUnit>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.bloodGroup) qs.set('bloodGroup', params.bloodGroup);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiBloodUnit>>>(`/api/laboratory/blood-bank/units?${qs}`);
  return body.data;
}

export async function createBloodUnit(payload: {
  unitNo: string;
  bloodGroup: string;
  component: string;
  expiryDate: string;
  status?: string;
  donorId?: number;
  donorLabel?: string;
  doctorId?: number;
  doctorLabel?: string;
  notes?: string;
}): Promise<ApiBloodUnit> {
  const body = await apiRequest<ApiEnvelope<ApiBloodUnit>>('/api/laboratory/blood-bank/units', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function updateBloodUnit(
  id: number,
  payload: { status?: string; donorLabel?: string; notes?: string; expiryDate?: string },
): Promise<ApiBloodUnit> {
  const body = await apiRequest<ApiEnvelope<ApiBloodUnit>>(`/api/laboratory/blood-bank/units/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function listBloodRequests(params?: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiBloodRequest>> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiBloodRequest>>>(
    `/api/laboratory/blood-bank/requests?${qs}`,
  );
  return body.data;
}

export async function getBloodRequest(id: number): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}`,
  );
  return body.data;
}

export async function createBloodRequest(payload: {
  personId: number;
  bloodGroup: string;
  unitsRequested: number;
  department: string;
  doctorId?: number;
  doctorLabel?: string;
  notes?: string;
}): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>('/api/laboratory/blood-bank/requests', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function startBloodCrossmatch(id: number): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}/start-crossmatch`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function recordBloodCrossmatch(
  id: number,
  payload: { result: string; bloodUnitId?: number; notes?: string },
): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}/crossmatch`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function issueBloodRequest(
  id: number,
  payload?: { bloodUnitId?: number; bloodUnitIds?: number[]; notes?: string },
): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}/issue`,
    { method: 'PATCH', body: payload ?? {} },
  );
  return body.data;
}

export async function listBloodDonors(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiBloodDonor>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.status) qs.set('status', params.status);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiBloodDonor>>>(
    `/api/laboratory/blood-bank/donors?${qs}`,
  );
  return body.data;
}

export async function createBloodDonor(payload: {
  fullName: string;
  phone: string;
  address?: string;
  bloodGroup?: string;
  notes?: string;
}): Promise<ApiBloodDonor> {
  const body = await apiRequest<ApiEnvelope<ApiBloodDonor>>('/api/laboratory/blood-bank/donors', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function updateBloodDonor(
  id: number,
  payload: {
    fullName?: string;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    notes?: string;
    status?: 'Active' | 'Inactive';
  },
): Promise<ApiBloodDonor> {
  const body = await apiRequest<ApiEnvelope<ApiBloodDonor>>(
    `/api/laboratory/blood-bank/donors/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function searchBloodBankDoctors(params?: {
  q?: string;
  limit?: number;
}): Promise<{ items: ApiBloodDoctorHit[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const body = await apiRequest<ApiEnvelope<{ items: ApiBloodDoctorHit[] }>>(
    `/api/laboratory/blood-bank/doctors?${qs}`,
  );
  return body.data;
}

export async function searchLabStaff(params?: {
  q?: string;
  limit?: number;
}): Promise<{ items: ApiBloodDoctorHit[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('limit', String(params?.limit ?? 20));
  const body = await apiRequest<ApiEnvelope<{ items: ApiBloodDoctorHit[] }>>(
    `/api/laboratory/staff?${qs}`,
  );
  return body.data;
}

export async function listBloodIssueHistory(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiBloodIssueHistoryItem>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiBloodIssueHistoryItem>>>(
    `/api/laboratory/blood-bank/issue-history?${qs}`,
  );
  return body.data;
}

export async function rejectBloodRequest(id: number, reason: string): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}/reject`,
    { method: 'PATCH', body: { reason } },
  );
  return body.data;
}

export async function completeBloodRequest(id: number): Promise<ApiBloodRequest> {
  const body = await apiRequest<ApiEnvelope<ApiBloodRequest>>(
    `/api/laboratory/blood-bank/requests/${id}/complete`,
    { method: 'PATCH', body: {} },
  );
  return body.data;
}

export async function listBloodCrossmatches(params?: {
  page?: number;
  limit?: number;
}): Promise<Paged<ApiBloodCrossmatch>> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<ApiEnvelope<Paged<ApiBloodCrossmatch>>>(
    `/api/laboratory/blood-bank/crossmatches?${qs}`,
  );
  return body.data;
}

// ---------- Laboratory Dashboard Overview ----------

export type LabOverviewKpis = {
  requestsToday: number;
  pendingRequests: number;
  awaitingCollection: number;
  samplesCollected: number;
  awaitingValidation: number;
  released: number;
  emergency: number;
  revenueToday: number;
};

export type LabOverviewActivity = {
  labRequestId: number;
  requestNo: string;
  patientName: string;
  hospitalNo: string | null;
  testSummary: string;
  charge: number;
  status: string;
  statusTone: string;
  priority: string;
  labStatus: string;
  paymentStatus: string;
  createdAt: string | null;
};

export type LabOverviewAlert = {
  id: string;
  message: string;
  severity: 'critical' | 'stat' | 'warning';
  labRequestId?: number;
  personId?: number;
  requestNo?: string;
};

export type LabOverviewPendingTasks = {
  samplesToCollect: number;
  resultsToEnter: number;
  awaitingValidation: number;
  emrSyncQueue: number;
};

export type LabOverviewPayload = {
  asOf: string;
  kpis: LabOverviewKpis;
  recentActivity: LabOverviewActivity[];
  criticalAlerts: LabOverviewAlert[];
  pendingTasks: LabOverviewPendingTasks;
};

export function emptyLabOverviewKpis(): LabOverviewKpis {
  return {
    requestsToday: 0,
    pendingRequests: 0,
    awaitingCollection: 0,
    samplesCollected: 0,
    awaitingValidation: 0,
    released: 0,
    emergency: 0,
    revenueToday: 0,
  };
}

export function emptyLabOverviewPendingTasks(): LabOverviewPendingTasks {
  return {
    samplesToCollect: 0,
    resultsToEnter: 0,
    awaitingValidation: 0,
    emrSyncQueue: 0,
  };
}

export async function fetchLabOverview(params?: {
  timezoneOffsetMinutes?: number;
  recentLimit?: number;
}): Promise<LabOverviewPayload> {
  const qs = new URLSearchParams();
  if (params?.timezoneOffsetMinutes != null) {
    qs.set('timezoneOffsetMinutes', String(params.timezoneOffsetMinutes));
  }
  if (params?.recentLimit != null) {
    qs.set('recentLimit', String(params.recentLimit));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const body = await apiRequest<ApiEnvelope<LabOverviewPayload>>(
    `/api/laboratory/overview${suffix}`,
  );
  return body.data;
}

/* ─── Specialty: drug screens / cultures / reports ───────────────── */

export type ApiDrugCatalogItem = { code: string; name: string };

export type ApiDrugScreenResult = {
  resultId: number;
  drugCode: string;
  drugName: string;
  result: string;
  remarks: string | null;
};

export type ApiDrugScreen = {
  screenId: number;
  screenNo: string;
  personId: number;
  labRequestId: number | null;
  patientName: string;
  hospitalNo: string | null;
  sex: string | null;
  sampleNo: string | null;
  sampleType: string | null;
  collectedAt: string | null;
  collectedBy: string | null;
  status: string;
  rejectReason: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
  results: ApiDrugScreenResult[];
};

export type ApiLabCulture = {
  cultureId: number;
  cultureNo: string;
  personId: number;
  labRequestId: number | null;
  patientName: string;
  hospitalNo: string | null;
  cultureType: string;
  organism: string | null;
  colonyCount: string | null;
  gramStain: string | null;
  status: string;
  scientist: string | null;
  reportedAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
  sensitivity: Record<string, string>;
  sensitivities: { antibiotic: string; result: string }[];
};

export type ApiLabReportListItem = {
  reportId: number;
  reportType: string;
  from: string;
  to: string;
  title: string;
  fileSizeLabel: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type ApiLabReportDetail = ApiLabReportListItem & {
  payload: {
    reportType?: string;
    from?: string;
    to?: string;
    totalTestsPerformed?: number;
    paidRequests?: number;
    revenue?: number;
    drugScreens?: number;
    cultures?: number;
    topTests?: { name: string; count: number }[];
    summary?: string;
    [key: string]: unknown;
  };
};

export type ApiDrugScreenKpis = {
  draft: number;
  inProgress: number;
  validated: number;
  rejected: number;
  total: number;
};

export async function listDrugScreens(params?: {
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiDrugScreen> & { drugCatalog: ApiDrugCatalogItem[]; kpis?: ApiDrugScreenKpis }
> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<Paged<ApiDrugScreen> & { drugCatalog: ApiDrugCatalogItem[]; kpis?: ApiDrugScreenKpis }>
  >(`/api/laboratory/drug-screens?${qs}`);
  return body.data;
}

export async function getDrugScreen(id: number): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(`/api/laboratory/drug-screens/${id}`);
  return body.data;
}

export async function createDrugScreen(payload: {
  personId: number;
  drugCodes: string[];
  labRequestId?: number;
}): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>('/api/laboratory/drug-screens', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function collectDrugScreen(
  id: number,
  payload?: { sampleNo?: string; sampleType?: string; collectedAt?: string },
): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(
    `/api/laboratory/drug-screens/${id}/collect`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

export async function patchDrugScreenResults(
  id: number,
  results: { drugCode: string; result: 'Negative' | 'Positive' | 'Pending'; remarks?: string }[],
): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(
    `/api/laboratory/drug-screens/${id}/results`,
    { method: 'PATCH', body: { results } },
  );
  return body.data;
}

export async function submitDrugScreen(id: number): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(
    `/api/laboratory/drug-screens/${id}/submit`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function validateDrugScreen(id: number): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(
    `/api/laboratory/drug-screens/${id}/validate`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function rejectDrugScreen(id: number, reason: string): Promise<ApiDrugScreen> {
  const body = await apiRequest<ApiEnvelope<ApiDrugScreen>>(
    `/api/laboratory/drug-screens/${id}/reject`,
    { method: 'POST', body: { reason } },
  );
  return body.data;
}

export async function listLabCultures(params?: {
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiLabCulture> & {
    kpis: {
      savedCultures: number;
      finalReports: number;
      provisional: number;
      organismsTracked: number;
    };
  }
> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiLabCulture> & {
        kpis: {
          savedCultures: number;
          finalReports: number;
          provisional: number;
          organismsTracked: number;
        };
      }
    >
  >(`/api/laboratory/cultures?${qs}`);
  return body.data;
}

export async function getLabCulture(id: number): Promise<ApiLabCulture> {
  const body = await apiRequest<ApiEnvelope<ApiLabCulture>>(`/api/laboratory/cultures/${id}`);
  return body.data;
}

export async function createLabCulture(payload: {
  personId: number;
  cultureType: string;
  organism?: string;
  colonyCount?: string;
  gramStain?: string;
  status?: 'Provisional' | 'Final' | 'Cancelled';
  scientist?: string;
  labRequestId?: number;
  sensitivities?: { antibiotic: string; result: string }[];
}): Promise<ApiLabCulture> {
  const body = await apiRequest<ApiEnvelope<ApiLabCulture>>('/api/laboratory/cultures', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function patchLabCulture(
  id: number,
  payload: {
    organism?: string;
    colonyCount?: string;
    gramStain?: string;
    status?: 'Provisional' | 'Final' | 'Cancelled';
    scientist?: string;
    sensitivities?: { antibiotic: string; result: string }[];
  },
): Promise<ApiLabCulture> {
  const body = await apiRequest<ApiEnvelope<ApiLabCulture>>(`/api/laboratory/cultures/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function listLabReports(params?: {
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiLabReportListItem> & {
    kpis: { reportsGenerated: number; scheduled: number; downloadsMonth: number };
  }
> {
  const qs = new URLSearchParams();
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiLabReportListItem> & {
        kpis: { reportsGenerated: number; scheduled: number; downloadsMonth: number };
      }
    >
  >(`/api/laboratory/reports?${qs}`);
  return body.data;
}

export async function getLabReport(id: number): Promise<ApiLabReportDetail> {
  const body = await apiRequest<ApiEnvelope<ApiLabReportDetail>>(`/api/laboratory/reports/${id}`);
  return body.data;
}

export async function generateLabReport(payload: {
  reportType: string;
  from: string;
  to: string;
  title?: string;
}): Promise<ApiLabReportDetail> {
  const body = await apiRequest<ApiEnvelope<ApiLabReportDetail>>(
    '/api/laboratory/reports/generate',
    { method: 'POST', body: payload },
  );
  return body.data;
}

/* ─── SFA / Analytics / Specimens / Microbiology ─────────────────── */

export type ApiSfa = {
  sfaId: number;
  sfaNo: string;
  personId: number;
  labRequestId: number | null;
  patientName: string;
  hospitalNo: string | null;
  sex: string | null;
  volumeMl: string | null;
  colour: string | null;
  viscosity: string | null;
  liquefactionMin: string | null;
  ph: string | null;
  countMMl: string | null;
  motilityPct: string | null;
  morphologyPct: string | null;
  pusCells: string | null;
  rbc: string | null;
  epithelial: string | null;
  interpretation: string | null;
  status: string;
  rejectReason: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  createdAt: string | null;
  createdBy: string | null;
};

export type ApiLabAnalyticsSummary = {
  from: string;
  to: string;
  revenue: number;
  tests: number;
  avgTatHours: number;
  avgTatLabel: string;
  criticalResults: number;
  topTests: { name: string; count: number; pct: number }[];
  workloadByCategory: { category: string; count: number }[];
};

export type ApiSpecimenEvent = {
  eventId: number;
  action: string;
  fromLocation: string | null;
  toLocation: string | null;
  reason: string | null;
  actorLabel: string | null;
  at: string;
};

export type ApiSpecimen = {
  specimenId: number;
  specimenNo: string;
  personId: number;
  patientName: string;
  hospitalNo: string | null;
  labRequestId: number | null;
  labSampleId: number | null;
  testLabel: string;
  collectedBy: string | null;
  location: string;
  status: string;
  collectedAt: string | null;
  tatLabel: string | null;
  createdAt: string | null;
  createdBy: string | null;
  events: ApiSpecimenEvent[];
};

export type ApiMicroItem = ApiLabCulture & {
  microOutcome: string;
  awaitingValidation: boolean;
};

export async function listSfa(params?: {
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiSfa> & {
    kpis: { draft: number; submitted: number; validated: number; rejected: number; total: number };
  }
> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiSfa> & {
        kpis: { draft: number; submitted: number; validated: number; rejected: number; total: number };
      }
    >
  >(`/api/laboratory/sfa?${qs}`);
  return body.data;
}

export async function getSfa(id: number): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>(`/api/laboratory/sfa/${id}`);
  return body.data;
}

export async function createSfa(payload: {
  personId: number;
  volumeMl?: string;
  colour?: string;
  viscosity?: string;
  liquefactionMin?: string;
  ph?: string;
  countMMl?: string;
  motilityPct?: string;
  morphologyPct?: string;
  pusCells?: string;
  rbc?: string;
  epithelial?: string;
  interpretation?: string;
}): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>('/api/laboratory/sfa', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function patchSfa(
  id: number,
  payload: Partial<{
    volumeMl: string;
    colour: string;
    viscosity: string;
    liquefactionMin: string;
    ph: string;
    countMMl: string;
    motilityPct: string;
    morphologyPct: string;
    pusCells: string;
    rbc: string;
    epithelial: string;
    interpretation: string;
  }>,
): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>(`/api/laboratory/sfa/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function submitSfa(id: number): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>(`/api/laboratory/sfa/${id}/submit`, {
    method: 'POST',
    body: {},
  });
  return body.data;
}

export async function validateSfa(id: number): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>(`/api/laboratory/sfa/${id}/validate`, {
    method: 'POST',
    body: {},
  });
  return body.data;
}

export async function rejectSfa(id: number, reason: string): Promise<ApiSfa> {
  const body = await apiRequest<ApiEnvelope<ApiSfa>>(`/api/laboratory/sfa/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
  return body.data;
}

export async function fetchLabAnalyticsSummary(params?: {
  from?: string;
  to?: string;
  timezoneOffsetMinutes?: number;
}): Promise<ApiLabAnalyticsSummary> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.timezoneOffsetMinutes != null) {
    qs.set('timezoneOffsetMinutes', String(params.timezoneOffsetMinutes));
  }
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<ApiEnvelope<ApiLabAnalyticsSummary>>(
    `/api/laboratory/analytics/summary${suffix}`,
  );
  return body.data;
}

export async function listLabSpecimens(params?: {
  status?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiSpecimen> & {
    kpis: {
      total: number;
      transit: number;
      received: number;
      rejected: number;
      lost: number;
      delayed: number;
      completed: number;
    };
  }
> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiSpecimen> & {
        kpis: {
          total: number;
          transit: number;
          received: number;
          rejected: number;
          lost: number;
          delayed: number;
          completed: number;
        };
      }
    >
  >(`/api/laboratory/specimens?${qs}`);
  return body.data;
}

export async function getLabSpecimen(id: number): Promise<ApiSpecimen> {
  const body = await apiRequest<ApiEnvelope<ApiSpecimen>>(`/api/laboratory/specimens/${id}`);
  return body.data;
}

export async function createLabSpecimen(payload: {
  personId: number;
  testLabel: string;
  collectedBy?: string;
  location?: string;
  labRequestId?: number;
}): Promise<ApiSpecimen> {
  const body = await apiRequest<ApiEnvelope<ApiSpecimen>>('/api/laboratory/specimens', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function transferLabSpecimen(
  id: number,
  payload: { toLocation: string; reason?: string; staffLabel?: string },
): Promise<ApiSpecimen> {
  const body = await apiRequest<ApiEnvelope<ApiSpecimen>>(
    `/api/laboratory/specimens/${id}/transfer`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function updateLabSpecimenStatus(
  id: number,
  payload: { status: string; reason?: string; location?: string },
): Promise<ApiSpecimen> {
  const body = await apiRequest<ApiEnvelope<ApiSpecimen>>(
    `/api/laboratory/specimens/${id}/status`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function listMicrobiology(params?: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiMicroItem> & {
    kpis: {
      pending: number;
      positive: number;
      negative: number;
      awaitingValidation: number;
      completed: number;
    };
  }
> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiMicroItem> & {
        kpis: {
          pending: number;
          positive: number;
          negative: number;
          awaitingValidation: number;
          completed: number;
        };
      }
    >
  >(`/api/laboratory/microbiology?${qs}`);
  return body.data;
}

export async function createMicrobiology(payload: {
  personId: number;
  cultureType: string;
  organism?: string;
  colonyCount?: string;
  gramStain?: string;
  status?: 'Provisional' | 'Final' | 'Cancelled';
  scientist?: string;
  sensitivities?: { antibiotic: string; result: string }[];
}): Promise<ApiMicroItem> {
  const body = await apiRequest<ApiEnvelope<ApiMicroItem>>('/api/laboratory/microbiology', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function patchMicrobiology(
  id: number,
  payload: {
    organism?: string;
    colonyCount?: string;
    gramStain?: string;
    status?: 'Provisional' | 'Final' | 'Cancelled';
    scientist?: string;
    sensitivities?: { antibiotic: string; result: string }[];
  },
): Promise<ApiMicroItem> {
  const body = await apiRequest<ApiEnvelope<ApiMicroItem>>(`/api/laboratory/microbiology/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function validateMicrobiology(id: number): Promise<ApiMicroItem> {
  const body = await apiRequest<ApiEnvelope<ApiMicroItem>>(
    `/api/laboratory/microbiology/${id}/validate`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export type ApiHistopathology = {
  caseId: number;
  caseNo: string;
  personId: number;
  labRequestId: number | null;
  patientName: string;
  hospitalNo: string | null;
  sex: string | null;
  specimenType: string;
  stage: string;
  site: string | null;
  gross: string | null;
  micro: string | null;
  diagnosis: string | null;
  grade: string | null;
  receivedAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
};

export type ApiQcRun = {
  qcRunId: number;
  runNo: string;
  analyte: string;
  instrument: string;
  level: string;
  expected: string;
  observed: string;
  result: string;
  freq: string;
  runDate: string;
  corrective: string | null;
  preventive: string | null;
  assignedTo: string | null;
  targetDate: string | null;
  capaStatus: string;
  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
};

export async function createLabTest(payload: {
  testCode: string;
  name: string;
  category: string;
  specimenType: string;
  turnaround: string;
  unitPrice: number;
  container?: string;
  loincCode?: string;
  lisCode?: string;
  department?: string;
  description?: string;
  testGroupId?: number;
  isPanel?: boolean;
  status?: string;
}): Promise<ApiLabTest> {
  const body = await apiRequest<ApiEnvelope<ApiLabTest>>('/api/laboratory/tests', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function updateLabTest(
  id: number,
  payload: {
    name?: string;
    category?: string;
    specimenType?: string;
    container?: string;
    turnaround?: string;
    unitPrice?: number;
    loincCode?: string;
    lisCode?: string;
    department?: string;
    description?: string;
    testGroupId?: number | null;
    isPanel?: boolean;
    status?: string;
  },
): Promise<ApiLabTest> {
  const body = await apiRequest<ApiEnvelope<ApiLabTest>>(`/api/laboratory/tests/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export type ApiLabTestGroup = {
  testGroupId: number;
  name: string;
  groupType: string | null;
};

export type ApiLabMachine = {
  machineId: number;
  name: string | null;
  code: string | null;
  manufactureName: string | null;
  machineType: string | null;
  machineSubType: string | null;
  testGroupId: number | null;
  providerName: string | null;
};

export async function listLabTestGroups(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabTestGroup>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabTestGroup>>>(
    `/api/laboratory/test-groups?${qs}`,
  );
  return body.data;
}

export async function listLabMachines(params?: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiLabMachine>> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 100));
  const body = await apiRequest<ApiEnvelope<Paged<ApiLabMachine>>>(
    `/api/laboratory/machines?${qs}`,
  );
  return body.data;
}

export async function listHistopathology(params?: {
  stage?: string;
  personId?: number;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<
  Paged<ApiHistopathology> & {
    kpis: {
      received: number;
      grossing: number;
      microscopy: number;
      awaitingApproval: number;
      released: number;
      total: number;
    };
  }
> {
  const qs = new URLSearchParams();
  if (params?.stage) qs.set('stage', params.stage);
  if (params?.personId != null) qs.set('personId', String(params.personId));
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<
      Paged<ApiHistopathology> & {
        kpis: {
          received: number;
          grossing: number;
          microscopy: number;
          awaitingApproval: number;
          released: number;
          total: number;
        };
      }
    >
  >(`/api/laboratory/histopathology?${qs}`);
  return body.data;
}

export async function createHistopathology(payload: {
  personId: number;
  specimenType: string;
  site?: string;
  gross?: string;
  micro?: string;
  diagnosis?: string;
  grade?: string;
}): Promise<ApiHistopathology> {
  const body = await apiRequest<ApiEnvelope<ApiHistopathology>>('/api/laboratory/histopathology', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function patchHistopathology(
  id: number,
  payload: {
    site?: string;
    gross?: string;
    micro?: string;
    diagnosis?: string;
    grade?: string;
    specimenType?: string;
  },
): Promise<ApiHistopathology> {
  const body = await apiRequest<ApiEnvelope<ApiHistopathology>>(
    `/api/laboratory/histopathology/${id}`,
    { method: 'PATCH', body: payload },
  );
  return body.data;
}

export async function advanceHistopathology(
  id: number,
  payload?: { stage?: string },
): Promise<ApiHistopathology> {
  const body = await apiRequest<ApiEnvelope<ApiHistopathology>>(
    `/api/laboratory/histopathology/${id}/advance`,
    { method: 'POST', body: payload ?? {} },
  );
  return body.data;
}

export async function releaseHistopathology(id: number): Promise<ApiHistopathology> {
  const body = await apiRequest<ApiEnvelope<ApiHistopathology>>(
    `/api/laboratory/histopathology/${id}/release`,
    { method: 'POST', body: {} },
  );
  return body.data;
}

export async function listQc(params?: {
  freq?: string;
  result?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paged<ApiQcRun> & { kpis: { passed: number; failed: number; total: number } }> {
  const qs = new URLSearchParams();
  if (params?.freq) qs.set('freq', params.freq);
  if (params?.result) qs.set('result', params.result);
  if (params?.q) qs.set('q', params.q);
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const body = await apiRequest<
    ApiEnvelope<Paged<ApiQcRun> & { kpis: { passed: number; failed: number; total: number } }>
  >(`/api/laboratory/qc?${qs}`);
  return body.data;
}

export async function createQcRun(payload: {
  analyte: string;
  instrument: string;
  level: string;
  expected: string;
  observed: string;
  result: string;
  freq: string;
  runDate?: string;
}): Promise<ApiQcRun> {
  const body = await apiRequest<ApiEnvelope<ApiQcRun>>('/api/laboratory/qc', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function patchQcRun(
  id: number,
  payload: {
    analyte?: string;
    instrument?: string;
    level?: string;
    expected?: string;
    observed?: string;
    result?: string;
    freq?: string;
    runDate?: string;
  },
): Promise<ApiQcRun> {
  const body = await apiRequest<ApiEnvelope<ApiQcRun>>(`/api/laboratory/qc/${id}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function upsertQcCapa(
  id: number,
  payload: {
    corrective: string;
    preventive: string;
    assignedTo: string;
    targetDate?: string;
    capaStatus?: string;
  },
): Promise<ApiQcRun> {
  const body = await apiRequest<ApiEnvelope<ApiQcRun>>(`/api/laboratory/qc/${id}/capa`, {
    method: 'POST',
    body: payload,
  });
  return body.data;
}
