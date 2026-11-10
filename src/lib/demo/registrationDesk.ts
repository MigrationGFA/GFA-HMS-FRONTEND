/**
 * Browser-only patient registration desk.
 * Records opens a card at ₦500, Cashier confirms it, then triage is allowed.
 * Nothing leaves this browser.
 */
import { db } from '@/db/database';
import type { CardRecord, CreatePersonPayload, PersonRecord } from '@/lib/api/patients';
import type { PatientQueueRecord } from '@/lib/api/nursing';
import type { TriageRecord } from '@/lib/api/triage';

export const DEMO_REG_FEE = 500;

const STORAGE_KEY = 'gfa_registration_desk_v1';

const PAYERS = [
  { payerId: 1, code: 'HMO-HYG', name: 'Hygeia HMO', status: 'Active', adapterKey: 'demo', integrationStatus: 'Demo', capabilities: { eligibility: true }, checklist: null },
  { payerId: 2, code: 'NHIA', name: 'NHIA', status: 'Active', adapterKey: 'demo', integrationStatus: 'Demo', capabilities: { eligibility: true }, checklist: null },
  { payerId: 3, code: 'HMO-REL', name: 'Reliance HMO', status: 'Active', adapterKey: 'demo', integrationStatus: 'Demo', capabilities: { eligibility: true }, checklist: null },
];

interface DeskState {
  nextPersonId: number;
  nextCardId: number;
  nextTriageId: number;
  nextQueue: number;
  people: PersonRecord[];
  cards: CardRecord[];
  triages: TriageRecord[];
}

const emptyState = (): DeskState => ({
  nextPersonId: 9100,
  nextCardId: 4100,
  nextTriageId: 7100,
  nextQueue: 1,
  people: [],
  cards: [],
  triages: [],
});

function load(): DeskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as DeskState;
    return {
      ...emptyState(),
      ...parsed,
      people: Array.isArray(parsed.people) ? parsed.people : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      triages: Array.isArray(parsed.triages) ? parsed.triages : [],
    };
  } catch {
    return emptyState();
  }
}

function save(state: DeskState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — the in-memory object still serves this session */
  }
}

function cleanPath(path: string) {
  return path.split('?')[0].replace(/\/$/, '');
}

function queryOf(path: string) {
  const q = path.includes('?') ? path.slice(path.indexOf('?') + 1) : '';
  return new URLSearchParams(q);
}

function envelope<T>(data: T) {
  return { data };
}

function itemsEnvelope<T>(items: T[]) {
  return { data: { items, meta: { page: 1, limit: items.length, total: items.length } } };
}

function fee(value: unknown, fallback: number) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function attachCard(person: PersonRecord, cards: CardRecord[]): PersonRecord {
  const card = cards.find((c) => c.personId === person.personId) ?? null;
  return { ...person, card };
}

function cardFor(state: DeskState, personId: number) {
  return state.cards.find((c) => c.personId === personId) ?? null;
}

function paymentView(card: CardRecord | null) {
  return {
    card,
    paymentCleared: card != null && card.paymentStatus !== 'Pending',
  };
}

function searchPeople(q: string): PersonRecord[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const state = load();
  const fromDesk = state.people.filter((p) => {
    const blob = [p.firstName, p.lastName, p.hospitalNo, p.patientPhoneNo, p.email, p.identityNo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(needle);
  });
  const seen = new Set(fromDesk.map((p) => p.personId));
  let fromDb: PersonRecord[] = [];
  try {
    fromDb = db.patients.list()
      .filter((p) => {
        const blob = [p.name, p.firstName, p.lastName, p.hospitalId, p.phone, p.nin, p.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(needle);
      })
      .map((p) => {
        const personId = p.personId ?? 800000 + (Number(String(p.id).replace(/\D/g, '')) || 1);
        return {
          personId,
          hospitalNo: p.hospitalId,
          firstName: p.firstName ?? p.name.split(' ')[0] ?? '',
          lastName: p.lastName ?? p.name.split(' ').slice(1).join(' '),
          middleName: p.middleName ?? null,
          sex: p.sex,
          dateOfBirth: p.dob ?? null,
          patientPhoneNo: p.phone,
          email: p.email ?? null,
          bloodGroup: p.bloodGroup ?? null,
          status: 'Active',
          dateOfRegistration: p.createdAt,
          card: cardFor(state, personId),
        } satisfies PersonRecord;
      })
      .filter((p) => !seen.has(p.personId));
  } catch {
    fromDb = [];
  }
  return [...fromDesk.map((p) => attachCard(p, state.cards)), ...fromDb].slice(0, 20);
}

function createRegistration(body: unknown) {
  const payload = (body ?? {}) as CreatePersonPayload;
  const phone = String(payload.patientPhoneNo ?? '').trim();
  const state = load();
  const existing = phone
    ? state.people.find((p) => p.patientPhoneNo === phone)
    : undefined;
  if (existing) return envelope(attachCard(existing, state.cards));

  const personId = state.nextPersonId++;
  const cardId = state.nextCardId++;
  const regFee = fee(payload.regFee, DEMO_REG_FEE);
  const consultFee = fee(payload.consultFee, 0);
  const cardFee = fee(payload.cardFee, 0);
  const now = new Date().toISOString();
  let hospitalNo = `GFA/HMS/${new Date().getFullYear()}/${String(personId).padStart(6, '0')}`;

  try {
    const sex = payload.sex === 'Female' ? 'Female' : 'Male';
    const name = [payload.firstName, payload.middleName, payload.lastName].filter(Boolean).join(' ').trim() || 'New Patient';
    const created = db.patients.create({
      name,
      firstName: payload.firstName,
      lastName: payload.lastName,
      middleName: payload.middleName,
      personId,
      phone: phone.length >= 7 ? phone : '08000000000',
      sex,
      dob: payload.dateOfBirth,
      nin: payload.identityNo,
      address: payload.residentialAddress,
      email: payload.email,
      occupation: payload.occupation,
      maritalStatus: payload.maritalStatus,
      religion: payload.religion,
      stateOfOrigin: payload.stateOfOrigin,
      nationality: payload.nationality,
      bloodGroup: payload.bloodGroup,
      insurance: payload.nhisNo ? 'NHIS' : 'None',
      source: 'Walk-in',
      nextOfKin: payload.nameOfNextOfKin
        ? {
            name: payload.nameOfNextOfKin,
            phone: payload.telephoneOfNextOfKin || phone || '08000000000',
            relationship: payload.relationship || 'Next of Kin',
          }
        : undefined,
    });
    hospitalNo = created.hospitalId;
  } catch {
    /* desk record still opens so the cashier queue can be demonstrated */
  }

  const card: CardRecord = {
    cardId,
    personId,
    cardNo: `PC-${String(cardId).padStart(6, '0')}`,
    cardType: 'Standard',
    paymentStatus: 'Pending',
    cardFee,
    regFee,
    consultFee,
    totalAmount: regFee + consultFee + cardFee,
    paymentChannel: null,
    paymentRef: null,
    paidAt: null,
    confirmedBy: null,
    status: 'Pending Payment',
    createdBy: 'Records Officer',
    createdAt: now,
    person: {
      personId,
      hospitalNo,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      patientPhoneNo: phone || null,
    },
  };
  const person: PersonRecord = {
    personId,
    hospitalNo,
    firstName: payload.firstName ?? null,
    lastName: payload.lastName ?? null,
    middleName: payload.middleName ?? null,
    sex: payload.sex ?? null,
    dateOfBirth: payload.dateOfBirth ?? null,
    maritalStatus: payload.maritalStatus ?? null,
    religion: payload.religion ?? null,
    residentialAddress: payload.residentialAddress ?? null,
    stateOfOrigin: payload.stateOfOrigin ?? null,
    nationality: payload.nationality ?? null,
    patientPhoneNo: phone || null,
    email: payload.email ?? null,
    occupation: payload.occupation ?? null,
    nameOfNextOfKin: payload.nameOfNextOfKin ?? null,
    relationship: payload.relationship ?? null,
    telephoneOfNextOfKin: payload.telephoneOfNextOfKin ?? null,
    identityNo: payload.identityNo ?? null,
    nhisNo: payload.nhisNo ?? null,
    bloodGroup: payload.bloodGroup ?? null,
    patientType: payload.patientType ?? null,
    status: 'Pending Payment',
    dateOfRegistration: now,
    card,
  };
  state.people.unshift(person);
  state.cards.unshift(card);
  save(state);
  return envelope(person);
}

function listCards(path: string) {
  const status = queryOf(path).get('paymentStatus');
  const q = (queryOf(path).get('q') ?? '').trim().toLowerCase();
  const state = load();
  const rows = state.cards.filter((c) => {
    if (status && c.paymentStatus !== status) return false;
    if (!q) return true;
    const blob = [c.cardNo, c.person?.hospitalNo, c.person?.firstName, c.person?.lastName, c.person?.patientPhoneNo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
  });
  return itemsEnvelope(rows);
}

function confirmCard(path: string, body: unknown) {
  const match = cleanPath(path).match(/\/cards\/(\d+)\/confirm$/);
  const cardId = match ? Number(match[1]) : NaN;
  const state = load();
  const card = state.cards.find((c) => c.cardId === cardId);
  if (!card) return envelope({ ok: false });
  const payload = (body ?? {}) as { paymentChannel?: string; paymentRef?: string };
  card.paymentStatus = 'Paid';
  card.status = 'Active';
  card.paymentChannel = payload.paymentChannel ?? 'Cash';
  card.paymentRef = payload.paymentRef ?? null;
  card.paidAt = new Date().toISOString();
  card.confirmedBy = 'Cashier';
  const person = state.people.find((p) => p.personId === card.personId);
  if (person) {
    person.status = 'Active';
    person.card = card;
  }
  save(state);
  return envelope(card);
}

function createTriage(body: unknown) {
  const payload = (body ?? {}) as Partial<TriageRecord> & { personId?: number };
  const state = load();
  const person = state.people.find((p) => p.personId === payload.personId);
  const triageId = state.nextTriageId++;
  const queueNo = `TQ-${String(state.nextQueue++).padStart(4, '0')}`;
  const now = new Date().toISOString();
  const row: TriageRecord = {
    triageId,
    personId: payload.personId ?? 0,
    queueNo,
    clinic: payload.clinic ?? 'General OPD',
    status: payload.status ?? 'Sent to Consultation',
    priority: payload.priority ?? 'Routine',
    priorityReason: null,
    patientType: payload.patientType ?? 'New',
    arrivalAt: now,
    weightKg: payload.weightKg ?? null,
    heightCm: payload.heightCm ?? null,
    bmi: null,
    bloodPressure: payload.bloodPressure ?? null,
    temperatureC: payload.temperatureC ?? null,
    pulseBpm: payload.pulseBpm ?? null,
    respiratoryRate: payload.respiratoryRate ?? null,
    spo2Pct: payload.spo2Pct ?? null,
    notes: payload.notes ?? null,
    createdAt: now,
    person: person
      ? {
          personId: person.personId,
          hospitalNo: person.hospitalNo,
          firstName: person.firstName,
          lastName: person.lastName,
          middleName: person.middleName ?? null,
          sex: person.sex,
          dateOfBirth: person.dateOfBirth,
          age: null,
          phone: person.patientPhoneNo,
          nextOfKinName: person.nameOfNextOfKin ?? null,
          nextOfKinRelationship: person.relationship ?? null,
          nextOfKinPhone: person.telephoneOfNextOfKin ?? null,
          bloodGroup: person.bloodGroup,
        }
      : null,
  };
  state.triages.unshift(row);
  save(state);
  return envelope(row);
}

const DEMO_QUEUE: PatientQueueRecord[] = [
  {
    triageId: 1,
    personId: 101,
    queueNo: 'T-DEMO-0001',
    clinic: 'Psychiatric OPC',
    status: 'Waiting',
    priority: 'Routine',
    priorityReason: null,
    patientType: 'New',
    arrivalAt: new Date().toISOString(),
    weightKg: null,
    heightCm: null,
    bmi: null,
    bloodPressure: null,
    temperatureC: null,
    pulseBpm: null,
    respiratoryRate: null,
    spo2Pct: null,
    notes: 'Anxiety follow-up',
    createdAt: new Date().toISOString(),
    person: {
      personId: 101,
      hospitalNo: 'GFA/HMS/2026/000101',
      firstName: 'Ada',
      lastName: 'Okoro',
      middleName: null,
      sex: 'Female',
      dateOfBirth: '1990-04-12',
      age: 36,
      phone: '08030000001',
      nextOfKinName: null,
      nextOfKinRelationship: null,
      nextOfKinPhone: null,
      bloodGroup: 'O+',
    },
    paymentStatus: 'Paid',
    cardId: 1,
    cardNo: 'CARD-001',
    totalAmount: 500,
    paymentCleared: true,
    hasVitals: false,
    reasonForVisit: 'Psychiatric OPC · New visit · Anxiety follow-up',
  },
  {
    triageId: 2,
    personId: 102,
    queueNo: 'T-DEMO-0002',
    clinic: 'General OPD',
    status: 'In Triage',
    priority: 'Urgent',
    priorityReason: 'Agitation',
    patientType: 'Returning',
    arrivalAt: new Date().toISOString(),
    weightKg: 70,
    heightCm: 170,
    bmi: 24.2,
    bloodPressure: '128/84',
    temperatureC: 36.9,
    pulseBpm: 88,
    respiratoryRate: 18,
    spo2Pct: 98,
    notes: 'Review meds',
    createdAt: new Date().toISOString(),
    person: {
      personId: 102,
      hospitalNo: 'GFA/HMS/2026/000442',
      firstName: 'Chidi',
      lastName: 'Eze',
      middleName: 'N.',
      sex: 'Male',
      dateOfBirth: '1985-01-20',
      age: 41,
      phone: '08030000002',
      nextOfKinName: null,
      nextOfKinRelationship: null,
      nextOfKinPhone: null,
      bloodGroup: 'A+',
    },
    paymentStatus: 'Pending',
    cardId: 2,
    cardNo: 'CARD-002',
    totalAmount: 500,
    paymentCleared: false,
    hasVitals: true,
    reasonForVisit: 'General OPD · Returning visit · Urgent · Review meds',
  },
];

const demoQueuePatches = new Map<number, Partial<PatientQueueRecord>>();

function toQueueRecord(row: TriageRecord, state: DeskState): PatientQueueRecord {
  const card = state.cards.find((c) => c.personId === row.personId) ?? null;
  const cleared = card != null && card.paymentStatus !== 'Pending';
  const hasVitals = [row.bloodPressure, row.temperatureC, row.pulseBpm, row.respiratoryRate, row.spo2Pct, row.weightKg, row.heightCm]
    .some((value) => value != null && value !== '');
  return {
    triageId: row.triageId,
    personId: row.personId,
    queueNo: row.queueNo,
    clinic: row.clinic,
    status: row.status,
    priority: row.priority,
    priorityReason: row.priorityReason,
    patientType: row.patientType,
    arrivalAt: row.arrivalAt,
    weightKg: row.weightKg,
    heightCm: row.heightCm,
    bmi: row.bmi,
    bloodPressure: row.bloodPressure,
    temperatureC: row.temperatureC,
    pulseBpm: row.pulseBpm,
    respiratoryRate: row.respiratoryRate,
    spo2Pct: row.spo2Pct,
    notes: row.notes,
    createdAt: row.createdAt,
    person: row.person,
    paymentStatus: card?.paymentStatus ?? 'Pending',
    cardId: card?.cardId ?? null,
    cardNo: card?.cardNo ?? null,
    totalAmount: card?.totalAmount ?? null,
    paymentCleared: cleared,
    hasVitals,
    reasonForVisit: [row.clinic, row.patientType ? `${row.patientType} visit` : null, row.notes].filter(Boolean).join(' · ') || 'Walk-in',
  };
}

export function listStoredPatientQueues(): PatientQueueRecord[] {
  return queueCatalog();
}

function queueCatalog(): PatientQueueRecord[] {
  const state = load();
  const live = state.triages.map((row) => toQueueRecord(row, state));
  const liveIds = new Set(live.map((row) => row.triageId));
  const samples = DEMO_QUEUE
    .filter((row) => !liveIds.has(row.triageId))
    .map((row) => ({ ...row, ...(demoQueuePatches.get(row.triageId) ?? {}) }));
  return [...live, ...samples];
}

function filterQueues(rows: PatientQueueRecord[], path: string) {
  const q = queryOf(path);
  const status = q.get('status');
  const priority = q.get('priority');
  const clinic = q.get('clinic');
  const payment = q.get('paymentStatus');
  const term = (q.get('q') ?? '').trim().toLowerCase();
  return rows.filter((row) => {
    const blob = [row.queueNo, row.person?.firstName, row.person?.lastName, row.person?.hospitalNo, row.person?.phone]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (
      (!status || row.status === status) &&
      (!priority || row.priority === priority) &&
      (!clinic || row.clinic === clinic) &&
      (!payment || row.paymentStatus === payment) &&
      (!term || blob.includes(term))
    );
  });
}

function queueStats(rows: PatientQueueRecord[]) {
  return {
    asOf: new Date().toISOString(),
    timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
    waiting: rows.filter((row) => row.status === 'Waiting').length,
    inTriage: rows.filter((row) => row.status === 'In Triage').length,
    triageCompleted: rows.filter((row) => row.status === 'Triage Completed').length,
    vitalsDone: rows.filter((row) => row.hasVitals).length,
    sentToDoctor: rows.filter((row) => row.status === 'Sent to Consultation').length,
    unpaid: rows.filter((row) => !row.paymentCleared).length,
    paid: rows.filter((row) => row.paymentCleared).length,
    total: rows.length,
  };
}

function findQueue(triageId: number) {
  return queueCatalog().find((row) => row.triageId === triageId) ?? null;
}

function patchQueue(triageId: number, patch: Partial<TriageRecord> & Partial<PatientQueueRecord>) {
  const state = load();
  const stored = state.triages.find((row) => row.triageId === triageId);
  if (stored) {
    Object.assign(stored, patch);
    save(state);
    return toQueueRecord(stored, state);
  }
  const current = findQueue(triageId);
  if (!current) return null;
  const next = { ...current, ...patch };
  demoQueuePatches.set(triageId, { ...(demoQueuePatches.get(triageId) ?? {}), ...patch });
  return next;
}

function payerById(id: number) {
  return PAYERS.find((p) => p.payerId === id) ?? PAYERS[0];
}

/** Returns a response for registration, HMO, and triage paths, or null to fall through. */
export function resolveRegistrationDesk(path: string, method: string, body?: unknown): unknown | null {
  const m = method.toUpperCase();
  const clean = cleanPath(path);
  const q = queryOf(path);

  if (clean === '/api/records/registration-charges' && m === 'GET') {
    return envelope({
      regFee: DEMO_REG_FEE,
      consultFee: 0,
      cardFee: 0,
      total: DEMO_REG_FEE,
      items: [{ code: 'REG-DEMO', label: 'Registration fee', amount: DEMO_REG_FEE, serviceId: 1, source: 'demo' }],
    });
  }

  if (clean === '/api/records/dashboard-stats' && m === 'GET') {
    const state = load();
    const today = new Date().toISOString().slice(0, 10);
    const todayPeople = state.people.filter((p) => (p.dateOfRegistration ?? '').slice(0, 10) === today);
    const pending = state.cards.filter((c) => c.paymentStatus === 'Pending').length;
    return envelope({
      asOf: new Date().toISOString(),
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      totalToday: todayPeople.length,
      newToday: todayPeople.length,
      returningToday: 0,
      walkInToday: todayPeople.length,
      emergencyToday: 0,
      pendingRegistration: pending,
      awaitingTriage: state.cards.filter((c) => c.paymentStatus === 'Paid').length,
      awaitingConsultation: state.triages.length,
    });
  }

  if (clean === '/api/records/registrations' && m === 'POST') return createRegistration(body);
  if (clean === '/api/records/registrations' && m === 'GET') return listCards(path);

  if (clean === '/api/records/registrations/resume' && m === 'GET') {
    const state = load();
    const personId = Number(q.get('personId'));
    const person = state.people.find((p) => p.personId === personId) ?? null;
    const card = person ? cardFor(state, person.personId) : null;
    return envelope({
      person: person ? attachCard(person, state.cards) : null,
      card,
      paymentCleared: card != null && card.paymentStatus !== 'Pending',
      suggestedStep: card && card.paymentStatus !== 'Pending' ? 5 : 4,
      registrationComplete: false,
    });
  }

  const completeMatch = clean.match(/^\/api\/records\/registrations\/(\d+)\/complete$/);
  if (completeMatch && m === 'PATCH') {
    const state = load();
    const person = state.people.find((p) => p.personId === Number(completeMatch[1]));
    if (!person) return envelope(null);
    person.status = 'Active';
    save(state);
    return envelope(attachCard(person, state.cards));
  }

  const regMatch = clean.match(/^\/api\/records\/registrations\/(\d+)$/);
  if (regMatch && m === 'GET') {
    const state = load();
    const person = state.people.find((p) => p.personId === Number(regMatch[1])) ?? null;
    const card = person ? cardFor(state, person.personId) : null;
    return envelope({
      person: person ? attachCard(person, state.cards) : null,
      card,
      paymentCleared: card != null && card.paymentStatus !== 'Pending',
    });
  }

  const payMatch = clean.match(/^\/api\/records\/persons\/(\d+)\/payment-status$/);
  if (payMatch && m === 'GET') {
    const state = load();
    return envelope(paymentView(cardFor(state, Number(payMatch[1]))));
  }

  if (clean === '/api/cards' && m === 'GET') return listCards(path);
  if (clean === '/api/cashier/payments/cards' && m === 'GET') return listCards(path);
  if (/\/api\/cashier\/payments\/cards\/\d+\/confirm$/.test(clean) && m === 'POST') return confirmCard(path, body);

  const cardPerson = clean.match(/^\/api\/cards\/person\/(\d+)$/);
  if (cardPerson && m === 'GET') {
    const state = load();
    return envelope(paymentView(cardFor(state, Number(cardPerson[1]))));
  }
  const cardIdMatch = clean.match(/^\/api\/cards\/(\d+)$/);
  if (cardIdMatch && m === 'GET') {
    const state = load();
    const card = state.cards.find((c) => c.cardId === Number(cardIdMatch[1])) ?? null;
    return envelope(paymentView(card));
  }

  if (clean === '/api/patients' && m === 'GET' && q.get('q')) {
    return itemsEnvelope(searchPeople(q.get('q') ?? ''));
  }

  if (clean === '/api/insurance/hmo/payers' && m === 'GET') return itemsEnvelope(PAYERS);
  if (clean === '/api/insurance/hmo/coverage' && m === 'POST') {
    return envelope({ coverageId: Date.now(), memberNo: String((body as { memberNo?: string } | undefined)?.memberNo ?? ''), status: 'ACTIVE' });
  }
  if (clean === '/api/insurance/hmo/eligibility' && m === 'GET') {
    const payer = payerById(Number(q.get('payerId')));
    const memberNo = q.get('memberNo') ?? '';
    const active = memberNo.trim().length >= 3;
    return envelope({
      checkId: Date.now(),
      status: active ? 'ACTIVE' : 'INACTIVE',
      member: { fullName: memberNo ? `Enrollee ${memberNo}` : undefined },
      plan: { code: 'OPD-DEMO', name: active ? 'Outpatient Demo Plan' : null },
      verifiedAt: new Date().toISOString(),
      sourceAdapter: 'demo',
      payer: { payerId: payer.payerId, code: payer.code, name: payer.name },
    });
  }
  if (clean === '/api/insurance/hmo/benefits' && m === 'GET') {
    const payer = payerById(Number(q.get('payerId')));
    return envelope({
      snapshotId: Date.now(),
      planName: 'Outpatient Demo Plan',
      benefits: [
        { category: 'Registration', name: 'Registration', coveragePercent: 100, covered: true, limitAmount: 500 },
        { category: 'OPD', name: 'General consultation', coveragePercent: 80, covered: true, limitAmount: 10000 },
        { category: 'Lab', name: 'Basic laboratory', coveragePercent: 70, covered: true, limitAmount: 15000 },
      ],
      exclusions: [],
      sourceAdapter: 'demo',
      fetchedAt: new Date().toISOString(),
      payer: { payerId: payer.payerId, code: payer.code, name: payer.name },
    });
  }

  if (clean === '/api/nursing/patient-queues' && m === 'GET') {
    return itemsEnvelope(filterQueues(queueCatalog(), path));
  }
  if (clean === '/api/nursing/patient-queues/stats' && m === 'GET') {
    return envelope(queueStats(queueCatalog()));
  }
  const queueAction = clean.match(/^\/api\/nursing\/patient-queues\/(\d+)(?:\/(start|vitals|send-to-doctor))?$/);
  if (queueAction) {
    const triageId = Number(queueAction[1]);
    const action = queueAction[2];
    if (!action && m === 'GET') return envelope(findQueue(triageId));
    if (action === 'start' && (m === 'PATCH' || m === 'POST')) {
      return envelope(patchQueue(triageId, { status: 'In Triage' }));
    }
    if (action === 'vitals' && (m === 'PATCH' || m === 'POST')) {
      const payload = (body ?? {}) as Partial<TriageRecord>;
      const current = findQueue(triageId);
      return envelope(patchQueue(triageId, {
        ...payload,
        status: current?.status === 'Waiting' ? 'In Triage' : current?.status,
      }));
    }
    if (action === 'send-to-doctor' && (m === 'PATCH' || m === 'POST')) {
      const payload = (body ?? {}) as { clinic?: string; notes?: string };
      const current = findQueue(triageId);
      if (current && !current.paymentCleared) return envelope(current);
      return envelope(patchQueue(triageId, {
        status: 'Sent to Consultation',
        clinic: payload.clinic ?? current?.clinic ?? null,
        notes: payload.notes ?? current?.notes ?? null,
      }));
    }
  }

  if (clean === '/api/triage' && m === 'POST') return createTriage(body);
  if (clean === '/api/triage' && m === 'GET') return itemsEnvelope(load().triages);

  return null;
}
