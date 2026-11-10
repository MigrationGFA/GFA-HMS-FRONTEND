/**
 * Doctor consultation stored in this browser.
 * Records and Nursing send a paid patient here. The doctor reads this store only.
 */
import type {
  ClinicalSummary,
  ConsultationQueueItem,
  ConsultationQueueResult,
  EncounterNote,
  EncounterRecord,
  FollowUpItem,
} from '@/lib/api/encounters';
import type { DoctorOverviewPayload } from '@/lib/api/doctorOverview';
import { emptyDoctorOverviewKpis, emptyDoctorOverviewTabHints } from '@/lib/api/doctorOverview';
import { listStoredPatientQueues } from '@/lib/demo/registrationDesk';

const KEY = 'gfa_consultation_v1';

interface Store {
  nextEncounterId: number;
  nextFollowUpId: number;
  encounters: EncounterRecord[];
  followUps: FollowUpItem[];
}

const emptyNote = (): EncounterNote => ({
  chiefComplaint: '',
  history: '',
  examination: '',
  assessment: '',
  plan: '',
  pastMedicalHistory: '',
  drugHistory: '',
  allergyHistory: '',
  familyHistory: '',
  socialHistory: '',
  followUpPlan: '',
});

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { nextEncounterId: 1, nextFollowUpId: 1, encounters: [], followUps: [] };
    const parsed = JSON.parse(raw) as Store;
    return {
      nextEncounterId: parsed.nextEncounterId || 1,
      nextFollowUpId: parsed.nextFollowUpId || 1,
      encounters: Array.isArray(parsed.encounters) ? parsed.encounters : [],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
    };
  } catch {
    return { nextEncounterId: 1, nextFollowUpId: 1, encounters: [], followUps: [] };
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function ageOf(dob: string | null | undefined, fallback: number | null | undefined) {
  if (fallback != null) return fallback;
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function waitLabel(arrivalAt: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(arrivalAt).getTime()) / 60000));
  if (!Number.isFinite(mins)) return { minutes: 0, label: '0m' };
  return { minutes: mins, label: mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m` };
}

function queueItems(): ConsultationQueueItem[] {
  const store = load();
  const taken = new Set(
    store.encounters.filter((row) => row.status !== 'Cancelled').map((row) => row.triageId),
  );
  return listStoredPatientQueues()
    .filter((row) => row.status === 'Sent to Consultation' && !taken.has(row.triageId))
    .map((row) => {
      const wait = waitLabel(row.arrivalAt);
      const name = [row.person?.firstName, row.person?.lastName].filter(Boolean).join(' ') || 'Patient';
      return {
        triageId: row.triageId,
        personId: row.personId,
        queueNo: row.queueNo,
        name,
        mrn: row.person?.hospitalNo || row.queueNo,
        age: ageOf(row.person?.dateOfBirth, row.person?.age),
        sex: row.person?.sex || '—',
        clinic: row.clinic || 'General OPD',
        visit: row.patientType || 'New',
        arrival: new Date(row.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        arrivalAt: row.arrivalAt,
        waitMinutes: wait.minutes,
        wait: wait.label,
        priority: row.priority || 'Routine',
        paymentStatus: row.paymentCleared ? 'Paid' : 'Pending',
        paymentCleared: row.paymentCleared,
        vitalsStatus: row.hasVitals ? 'Captured' : 'Pending',
        vitals: {
          status: row.hasVitals ? 'Captured' : 'Pending',
          bloodPressure: row.bloodPressure,
          temperatureC: row.temperatureC,
          pulseBpm: row.pulseBpm,
          respiratoryRate: row.respiratoryRate,
          spo2Pct: row.spo2Pct,
          weightKg: row.weightKg,
          heightCm: row.heightCm,
          bmi: row.bmi,
          notes: row.notes,
        },
        lastVisit: null,
        canStart: row.paymentCleared,
        triageStatus: row.status,
      };
    });
}

export function localConsultationQueue(params?: {
  q?: string;
  clinic?: string;
  priority?: string;
}): ConsultationQueueResult {
  const term = (params?.q ?? '').trim().toLowerCase();
  const items = queueItems().filter((row) => {
    const blob = `${row.name} ${row.mrn} ${row.queueNo}`.toLowerCase();
    const clinicOk = !params?.clinic || params.clinic === 'all' || row.clinic === params.clinic;
    const priorityOk = !params?.priority || params.priority === 'all' || row.priority === params.priority;
    return clinicOk && priorityOk && (!term || blob.includes(term));
  });
  return {
    asOf: new Date().toISOString(),
    summary: {
      waiting: items.length,
      paymentBlocked: items.filter((row) => !row.paymentCleared).length,
      canStart: items.filter((row) => row.canStart).length,
    },
    items,
    meta: { page: 1, limit: items.length, total: items.length },
  };
}

function toEncounter(row: ConsultationQueueItem, encounterId: number): EncounterRecord {
  return {
    encounterId,
    personId: row.personId,
    triageId: row.triageId,
    doctorId: 8,
    doctorName: 'Dr. Ngozi Ikedife',
    status: 'In Consultation',
    version: 1,
    startedAt: new Date().toISOString(),
    completedAt: null,
    outcome: null,
    note: emptyNote(),
    patient: {
      name: row.name,
      mrn: row.mrn,
      age: row.age,
      sex: row.sex,
      clinic: row.clinic,
      visit: row.visit,
      priority: row.priority,
      queueNo: row.queueNo,
      arrival: row.arrival,
      paymentStatus: row.paymentStatus,
      vitalsStatus: row.vitalsStatus,
      vitals: row.vitals,
      lastVisit: row.lastVisit,
    },
  };
}

export function localAllEncounters(): EncounterRecord[] {
  return load().encounters;
}

export function localActiveEncounters() {
  const items = load().encounters.filter((row) => row.status !== 'Completed' && row.status !== 'Cancelled');
  return { items, meta: { page: 1, limit: items.length, total: items.length } };
}

export function localCompletedEncounters() {
  const items = load().encounters.filter((row) => row.status === 'Completed');
  return { items, meta: { page: 1, limit: items.length, total: items.length }, asOf: new Date().toISOString() };
}

export function localStartEncounter(payload: { triageId: number; clinic?: string }) {
  const store = load();
  const existing = store.encounters.find((row) => row.triageId === payload.triageId && row.status !== 'Cancelled');
  if (existing) return existing;
  const item = queueItems().find((row) => row.triageId === payload.triageId);
  if (!item) throw new Error('Patient is not in the consultation queue');
  if (!item.paymentCleared) throw new Error('Payment is still pending at Cashier');
  const encounter = toEncounter(item, store.nextEncounterId++);
  if (payload.clinic) encounter.patient.clinic = payload.clinic;
  store.encounters.unshift(encounter);
  save(store);
  return encounter;
}

export function localPatchEncounter(
  encounterId: number,
  payload: Partial<EncounterNote> & { version?: number },
) {
  const store = load();
  const row = store.encounters.find((item) => item.encounterId === encounterId);
  if (!row) throw new Error('Consultation was not found');
  row.note = {
    ...row.note,
    chiefComplaint: payload.chiefComplaint ?? row.note.chiefComplaint,
    history: payload.history ?? row.note.history,
    examination: payload.examination ?? row.note.examination,
    assessment: payload.assessment ?? row.note.assessment,
    plan: payload.plan ?? row.note.plan,
    pastMedicalHistory: payload.pastMedicalHistory ?? row.note.pastMedicalHistory,
    drugHistory: payload.drugHistory ?? row.note.drugHistory,
    allergyHistory: payload.allergyHistory ?? row.note.allergyHistory,
    familyHistory: payload.familyHistory ?? row.note.familyHistory,
    socialHistory: payload.socialHistory ?? row.note.socialHistory,
    followUpPlan: payload.followUpPlan ?? row.note.followUpPlan,
  };
  row.version += 1;
  row.status = 'In Consultation';
  save(store);
  return row;
}

export function localCompleteEncounter(
  encounterId: number,
  payload: {
    outcome: string;
    followUpDate?: string;
    followUpClinic?: string;
    followUpTime?: string;
    followUpPriority?: string;
    followUpReason?: string;
  },
) {
  const store = load();
  const row = store.encounters.find((item) => item.encounterId === encounterId);
  if (!row) throw new Error('Consultation was not found');
  row.status = 'Completed';
  row.outcome = payload.outcome;
  row.completedAt = new Date().toISOString();
  row.version += 1;
  if (payload.followUpDate) {
    store.followUps.unshift({
      id: store.nextFollowUpId++,
      personId: row.personId,
      encounterId: row.encounterId,
      name: row.patient.name,
      mrn: row.patient.mrn,
      clinic: payload.followUpClinic || row.patient.clinic,
      prevDx: row.note.assessment || '—',
      lastVisit: row.completedAt,
      date: payload.followUpDate,
      time: payload.followUpTime || null,
      priority: row.patient.priority,
      status: 'Scheduled',
      storedStatus: 'Scheduled',
      reason: payload.followUpReason || row.note.followUpPlan || 'Follow-up',
      reminder: null,
      doctorId: row.doctorId,
      doctorName: row.doctorName,
    });
  }
  save(store);
  return row;
}

export function localFollowUps() {
  const items = load().followUps;
  const today = new Date().toISOString().slice(0, 10);
  return {
    asOf: new Date().toISOString(),
    items,
    summary: {
      thisWeek: items.length,
      dueToday: items.filter((row) => row.date === today).length,
      missed: items.filter((row) => row.status === 'Missed').length,
      scheduled: items.filter((row) => row.status === 'Scheduled').length,
      attended: items.filter((row) => row.status === 'Attended').length,
    },
    meta: { page: 1, limit: items.length, total: items.length },
  };
}

export function localCreateFollowUp(payload: {
  personId: number;
  clinic: string;
  date: string;
  time?: string;
  priority?: string;
  reason?: string;
}) {
  const store = load();
  const queued = queueItems().find((row) => row.personId === payload.personId);
  const seen = store.encounters.find((row) => row.personId === payload.personId);
  const row: FollowUpItem = {
    id: store.nextFollowUpId++,
    personId: payload.personId,
    encounterId: seen?.encounterId ?? null,
    name: queued?.name || seen?.patient.name || 'Patient',
    mrn: queued?.mrn || seen?.patient.mrn || '',
    clinic: payload.clinic,
    prevDx: seen?.note.assessment || '—',
    lastVisit: seen?.completedAt ?? null,
    date: payload.date,
    time: payload.time || null,
    priority: payload.priority || 'Routine',
    status: 'Scheduled',
    storedStatus: 'Scheduled',
    reason: payload.reason || 'Follow-up',
    reminder: null,
    doctorId: 8,
    doctorName: 'Dr. Ngozi Ikedife',
  };
  store.followUps.unshift(row);
  save(store);
  return row;
}

export function localUpdateFollowUp(id: number, patch: { status?: string }) {
  const store = load();
  const row = store.followUps.find((item) => item.id === id);
  if (!row) throw new Error('Follow-up was not found');
  if (patch.status) row.status = patch.status;
  save(store);
  return row;
}

export function localClinicalSummary(personId: number, triageId?: number): ClinicalSummary {
  const queues = listStoredPatientQueues();
  const row = queues.find((item) => item.triageId === triageId) ?? queues.find((item) => item.personId === personId);
  const name = [row?.person?.firstName, row?.person?.lastName].filter(Boolean).join(' ') || 'Patient';
  return {
    personId,
    demographics: {
      name,
      mrn: row?.person?.hospitalNo || '—',
      age: ageOf(row?.person?.dateOfBirth, row?.person?.age),
      sex: row?.person?.sex ?? null,
      dateOfBirth: row?.person?.dateOfBirth ?? null,
      phone: row?.person?.phone ?? null,
      email: null,
      bloodGroup: row?.person?.bloodGroup ?? null,
      nhisNo: null,
      address: null,
      nextOfKin: {
        name: row?.person?.nextOfKinName ?? null,
        relationship: row?.person?.nextOfKinRelationship ?? null,
        phone: row?.person?.nextOfKinPhone ?? null,
      },
    },
    payment: {
      status: row?.paymentStatus ?? null,
      cardNo: row?.cardNo ?? null,
      display: row?.paymentCleared ? 'Paid at Cashier' : 'Pending at Cashier',
      cleared: Boolean(row?.paymentCleared),
    },
    currentVisit: row
      ? {
          triageId: row.triageId,
          queueNo: row.queueNo,
          clinic: row.clinic,
          status: row.status,
          priority: row.priority,
          patientType: row.patientType,
          arrivalAt: row.arrivalAt,
          notes: row.notes,
        }
      : null,
    vitals: {
      status: row?.hasVitals ? 'Captured' : 'Pending',
      bloodPressure: row?.bloodPressure ?? null,
      temperatureC: row?.temperatureC ?? null,
      pulseBpm: row?.pulseBpm ?? null,
      respiratoryRate: row?.respiratoryRate ?? null,
      spo2Pct: row?.spo2Pct ?? null,
      weightKg: row?.weightKg ?? null,
      heightCm: row?.heightCm ?? null,
      bmi: row?.bmi ?? null,
      notes: row?.notes ?? null,
    },
    allergies: [],
    activeMeds: [],
    previousDiagnoses: [],
    historySnippets: {
      pastMedicalHistory: '',
      drugHistory: '',
      allergyHistory: '',
      familyHistory: '',
      socialHistory: '',
    },
    recentNotes: load().encounters.filter((item) => item.personId === personId).map((item) => ({
      encounterId: item.encounterId,
      status: item.status,
      doctorName: item.doctorName,
      clinic: item.patient.clinic,
      startedAt: item.startedAt,
      completedAt: item.completedAt,
      outcome: item.outcome,
      summary: item.note.assessment || item.note.chiefComplaint || 'Consultation',
      note: item.note,
    })),
    lastVisit: null,
  };
}

export function localSearchPatients(query: string) {
  const term = query.trim().toLowerCase();
  const seen = new Set<number>();
  return listStoredPatientQueues()
    .filter((row) => {
      const blob = [row.person?.firstName, row.person?.lastName, row.person?.hospitalNo, row.queueNo].filter(Boolean).join(' ').toLowerCase();
      if (!blob.includes(term) || seen.has(row.personId)) return false;
      seen.add(row.personId);
      return true;
    })
    .map((row) => ({
      personId: row.personId,
      name: [row.person?.firstName, row.person?.lastName].filter(Boolean).join(' ') || 'Patient',
      mrn: row.person?.hospitalNo || row.queueNo,
    }));
}

export function localDoctorOverview(): DoctorOverviewPayload {
  const queue = localConsultationQueue();
  const active = localActiveEncounters().items.length;
  const kpis = emptyDoctorOverviewKpis();
  kpis.patientsWaiting = queue.summary.waiting;
  kpis.patientsWaitingSubtitle = queue.summary.paymentBlocked > 0
    ? `${queue.summary.canStart} ready · ${queue.summary.paymentBlocked} unpaid`
    : queue.summary.waiting === 0
      ? 'No patients waiting'
      : `${queue.summary.canStart} ready for consultation`;
  kpis.activeConsultations = active;
  const hints = emptyDoctorOverviewTabHints();
  hints.activeCount = active;
  hints.followUpCount = localFollowUps().summary.scheduled;
  return {
    asOf: new Date().toISOString(),
    doctorUserId: 8,
    kpis,
    queue: queue.items.map((row) => ({
      triageId: row.triageId,
      personId: row.personId,
      name: row.name,
      patientName: row.name,
      hospitalNo: row.mrn,
      sex: row.sex,
      age: row.age,
      status: row.paymentCleared ? 'Ready' : 'Unpaid',
      statusTone: row.paymentCleared ? 'green' : 'amber',
      mode: `${row.clinic} · ${row.priority}`,
      clinic: row.clinic,
      priority: row.priority,
      canStart: row.canStart,
      arrivalAt: row.arrivalAt,
    })),
    tabHints: hints,
  };
}
