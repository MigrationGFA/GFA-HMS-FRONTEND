import { apiRequest } from './client';
import { env } from '../env';

export type CardRecord = {
  cardId: number;
  personId: number;
  cardNo: string;
  cardType: string;
  paymentStatus: 'Pending' | 'Paid' | 'Waived' | string;
  cardFee: number;
  regFee: number;
  consultFee: number;
  totalAmount: number;
  paymentChannel: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  confirmedBy: string | null;
  status: string;
  createdBy: string | null;
  createdAt: string | null;
  person?: {
    personId: number;
    hospitalNo: string | null;
    firstName: string | null;
    lastName: string | null;
    patientPhoneNo: string | null;
  } | null;
};

export type CreatePersonPayload = {
  firstName: string;
  lastName: string;
  middleName?: string;
  sex: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  maritalStatus?: string;
  religion?: string;
  tribe?: string;
  ethnicGroup?: string;
  residentialAddress?: string;
  homeTown?: string;
  stateOfOrigin?: string;
  nationality?: string;
  patientPhoneNo: string;
  email?: string;
  occupation?: string;
  nameOfEmployer?: string;
  nameOfNextOfKin?: string;
  relationship?: string;
  addressOfNextOfKin?: string;
  telephoneOfNextOfKin?: string;
  identityType?: string;
  identityNo?: string;
  nhisNo?: string;
  bloodGroup?: string;
  patientType?: string;
  regType?: string;
  cardNo?: string;
  regFee?: number;
  consultFee?: number;
  cardFee?: number;
  idempotencyKey?: string;
};

export type UpdatePersonPayload = {
  middleName?: string;
  sex?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  religion?: string;
  tribe?: string;
  ethnicGroup?: string;
  residentialAddress?: string;
  homeTown?: string;
  stateOfOrigin?: string;
  nationality?: string;
  patientPhoneNo?: string;
  email?: string;
  occupation?: string;
  nameOfEmployer?: string;
  nameOfNextOfKin?: string;
  relationship?: string;
  addressOfNextOfKin?: string;
  telephoneOfNextOfKin?: string;
  identityType?: string;
  identityNo?: string;
  nhisNo?: string;
  bloodGroup?: string;
  patientType?: string;
  regType?: string;
  status?: 'Pending Payment' | 'Incomplete' | 'Active';
};

export type PersonRecord = {
  personId: number;
  hospitalNo: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  sex: string | null;
  dateOfBirth: string | null;
  maritalStatus?: string | null;
  religion?: string | null;
  tribe?: string | null;
  ethnicGroup?: string | null;
  residentialAddress?: string | null;
  homeTown?: string | null;
  stateOfOrigin?: string | null;
  nationality?: string | null;
  patientPhoneNo: string | null;
  email: string | null;
  occupation?: string | null;
  nameOfEmployer?: string | null;
  nameOfNextOfKin?: string | null;
  relationship?: string | null;
  addressOfNextOfKin?: string | null;
  telephoneOfNextOfKin?: string | null;
  identityNo?: string | null;
  nhisNo?: string | null;
  bloodGroup: string | null;
  patientType?: string | null;
  regType?: string | null;
  cardNo?: string | null;
  status: string | null;
  dateOfRegistration: string | null;
  createdAt?: string | null;
  /** Registration card opened with the person; payment starts Pending. */
  card?: CardRecord | null;
};

type ApiEnvelope<T> = { data: T };

/** Early register after Next of Kin — opens PERSONS + pending PATIENT_CARDS. */
export async function registerPerson(payload: CreatePersonPayload): Promise<PersonRecord> {
  const body = await apiRequest<ApiEnvelope<PersonRecord>>('/api/patients', {
    method: 'POST',
    body: payload,
  });
  return body.data;
}

export async function getPerson(personId: number): Promise<PersonRecord> {
  const body = await apiRequest<ApiEnvelope<PersonRecord>>(`/api/patients/${personId}`);
  return body.data;
}

export async function updatePerson(
  personId: number,
  payload: UpdatePersonPayload,
): Promise<PersonRecord> {
  const body = await apiRequest<ApiEnvelope<PersonRecord>>(`/api/patients/${personId}`, {
    method: 'PATCH',
    body: payload,
  });
  return body.data;
}

export async function searchPersons(q: string): Promise<PersonRecord[]> {
  const qs = new URLSearchParams({ q, limit: '20' });
  const body = await apiRequest<
    ApiEnvelope<{ items?: PersonRecord[] } | PersonRecord[]>
  >(`/api/patients?${qs.toString()}`);
  const data = body.data;
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
}

/** Latest registration card + payment gate for a person. */
export async function getCardForPerson(
  personId: number,
): Promise<{ card: CardRecord | null; paymentCleared: boolean }> {
  const body = await apiRequest<
    ApiEnvelope<{ card: CardRecord | null; paymentCleared: boolean }>
  >(`/api/cards/person/${personId}`);
  return body.data;
}

/** Check payment status for a specific card. */
export async function getCardPaymentStatus(
  cardId: number,
): Promise<{ card: CardRecord; paymentCleared: boolean }> {
  const body = await apiRequest<
    ApiEnvelope<{ card: CardRecord; paymentCleared: boolean }>
  >(`/api/cards/${cardId}`);
  return body.data;
}

/** List registration cards (Patient Entry queue + cashier). */
export async function listCards(params?: {
  paymentStatus?: string;
  q?: string;
  limit?: number;
}): Promise<CardRecord[]> {
  const qs = new URLSearchParams();
  if (params?.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params?.q) qs.set('q', params.q);
  qs.set('limit', String(params?.limit ?? 50));
  const suffix = qs.toString() ? `?${qs}` : '';
  const body = await apiRequest<
    ApiEnvelope<{ items: CardRecord[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/cards${suffix}`);
  return body.data.items;
}

/** Cashier queue: registration cards awaiting payment confirmation. */
export async function listCardPayments(params?: {
  paymentStatus?: string;
  q?: string;
}): Promise<CardRecord[]> {
  const qs = new URLSearchParams();
  qs.set('paymentStatus', params?.paymentStatus ?? 'Pending');
  if (params?.q) qs.set('q', params.q);
  const body = await apiRequest<
    ApiEnvelope<{ items: CardRecord[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/cashier/payments/cards?${qs.toString()}`);
  return body.data.items;
}

/** Cashier confirms a pending card payment (unblocks the Records workflow). */
export async function confirmCardPayment(
  cardId: number,
  payload: {
    paymentChannel: string;
    paymentRef?: string;
    /** Patient co-pay when HMO covers the rest */
    patientAmount?: number;
    /** Accrued HMO/NHIA liability (not collected at desk) */
    payerLiability?: number;
    payerId?: number;
    authCode?: string;
  },
): Promise<CardRecord> {
  const body = await apiRequest<ApiEnvelope<CardRecord>>(
    `/api/cashier/payments/cards/${cardId}/confirm`,
    { method: 'POST', body: payload },
  );
  return body.data;
}

export type StaffUserRecord = {
  userId: number;
  userName: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  isAdmin: boolean;
  locked: boolean;
};

export async function searchStaffUsers(q: string): Promise<StaffUserRecord[]> {
  const qs = new URLSearchParams({ q, limit: '20' });
  const body = await apiRequest<
    ApiEnvelope<{ items: StaffUserRecord[]; meta: { page: number; limit: number; total: number } }>
  >(`/api/users?${qs.toString()}`);
  return body.data.items;
}

/** Map wizard form (UI) → PERSONS-aligned API payload (used after step 3). */
export function mapWizardFormToPersonPayload(
  form: {
    surname: string;
    firstName: string;
    middleName: string;
    gender: string;
    dob: string;
    maritalStatus: string;
    nationality: string;
    stateOfOrigin: string;
    lga: string;
    religion: string;
    ethnicity: string;
    nin: string;
    mobile: string;
    email: string;
    houseNo: string;
    street: string;
    area: string;
    city: string;
    state: string;
    country: string;
    nokName: string;
    nokRelationship: string;
    nokPhone: string;
    nokAddress: string;
    occupation: string;
    employerName: string;
    hmoNumber: string;
    enrolleeNumber: string;
    bloodGroup: string;
    patientType: string;
    patientCategory: string;
    regFee: number | string;
    consultFee: number | string;
    cardFee: number | string;
  },
  idempotencyKey?: string,
): CreatePersonPayload {
  const address = [form.houseNo, form.street, form.area, form.city, form.state, form.country]
    .filter(Boolean)
    .join(', ');

  return {
    firstName: form.firstName.trim(),
    lastName: form.surname.trim(),
    middleName: form.middleName.trim() || undefined,
    sex: form.gender === 'Female' ? 'Female' : form.gender === 'Other' ? 'Other' : 'Male',
    dateOfBirth: form.dob || undefined,
    maritalStatus: form.maritalStatus || undefined,
    religion: form.religion || undefined,
    tribe: form.ethnicity || undefined,
    ethnicGroup: form.ethnicity || undefined,
    residentialAddress: address || undefined,
    homeTown: form.lga || undefined,
    stateOfOrigin: form.stateOfOrigin || undefined,
    nationality: form.nationality || 'Nigerian',
    patientPhoneNo: form.mobile.trim(),
    email: form.email.trim() || undefined,
    occupation: form.occupation || undefined,
    nameOfEmployer: form.employerName || undefined,
    nameOfNextOfKin: form.nokName || undefined,
    relationship: form.nokRelationship || undefined,
    addressOfNextOfKin: form.nokAddress || undefined,
    telephoneOfNextOfKin: form.nokPhone || undefined,
    identityType: form.nin ? 'NIN' : undefined,
    identityNo: form.nin || undefined,
    nhisNo: form.hmoNumber || form.enrolleeNumber || undefined,
    bloodGroup: form.bloodGroup || undefined,
    patientType: form.patientCategory || undefined,
    regType: form.patientType || undefined,
    regFee: Number(form.regFee) || 0,
    consultFee: Number(form.consultFee) || 0,
    cardFee: Number(form.cardFee) || 0,
    idempotencyKey,
  };
}

/** Prefill wizard form from a PERSONS API record. */
export function mapPersonToWizardForm(person: PersonRecord): Partial<{
  surname: string;
  firstName: string;
  middleName: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  religion: string;
  ethnicity: string;
  nin: string;
  mobile: string;
  email: string;
  nokName: string;
  nokRelationship: string;
  nokPhone: string;
  nokAddress: string;
  occupation: string;
  employerName: string;
  bloodGroup: string;
  patientType: string;
  patientCategory: string;
}> {
  const dob = person.dateOfBirth ? person.dateOfBirth.slice(0, 10) : '';
  return {
    surname: person.lastName || '',
    firstName: person.firstName || '',
    middleName: person.middleName || '',
    gender: person.sex || 'Male',
    dob,
    maritalStatus: person.maritalStatus || 'Single',
    nationality: person.nationality || 'Nigerian',
    stateOfOrigin: person.stateOfOrigin || '',
    lga: person.homeTown || '',
    religion: person.religion || '',
    ethnicity: person.ethnicGroup || person.tribe || '',
    nin: person.identityNo || '',
    mobile: person.patientPhoneNo || '',
    email: person.email || '',
    nokName: person.nameOfNextOfKin || '',
    nokRelationship: person.relationship || '',
    nokPhone: person.telephoneOfNextOfKin || '',
    nokAddress: person.addressOfNextOfKin || '',
    occupation: person.occupation || '',
    employerName: person.nameOfEmployer || '',
    bloodGroup: person.bloodGroup || 'O+',
    patientType: person.regType || 'Walk-In Patient',
    patientCategory: person.patientType || 'Outpatient',
  };
}

export function isPatientsApiEnabled() {
  return true; // offline demo fixtures via apiRequest stub
}
