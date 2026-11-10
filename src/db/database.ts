import { load, saveDebounced, saveImmediate, clear as clearStorage } from './persistence';
import { emit, on, clearHandlers, type DbEvent } from './events';
import { nextId, nowIso, nowHuman, seedCounter, resetCounters } from './ids';
import { hospitalId } from '@/lib/brand';
import { buildSeed } from './seed';
import { seedLabOrders } from './lab-seed';
import {
  seedWards, seedBeds, seedAdmissions, seedMar, seedNursingTasks, seedFormTemplates,
} from './nursing-seed';
import { seedWallets, seedWalletTxns, seedCashierShifts } from './cashier-seed';
import { seedOpcVisits, seedPsychDiagnoses, seedOpcAppointments } from './opc-seed';
import { seedImagingRequests, seedEcgStudies, seedRadEquipment, seedRadConsumables } from './radiology-seed';
import type {
  Patient,
  PatientCreate,
  Visit,
  Invoice,
  Payment,
  Order,
  Referral,
  AuditEntry,
  SyncEvent,
  Ward,
  Bed,
  Admission,
  Vital,
  MarEntry,
  NursingNote,
  CarePlanEntry,
  NursingTask,
  Observation,
  IntakeOutputEntry,
  Handover,
  Incident,
  PatientEducationRecord,
  NursingFormTemplate,
  NursingFormInstance,
  WalletAccount,
  WalletTxn,
  RefundRequest,
  DiscountRequest,
  CashierShift,
  ImagingRequest,
  RadiologyReport,
  EcgStudy,
  RadEquipment,
  RadConsumable,
  RadFormInstance,
  OpcVisit,
  PsychAssessment,
  PsychDiagnosis,
  PsychNote,
  OpcTreatmentPlan,
  OpcRiskAssessment,
  OpcAdmissionRequest,
  OpcReferral,
  OpcAppointment,
} from '@/data-access/types';

export interface DbState {
  patients: Patient[];
  visits: Visit[];
  invoices: Invoice[];
  payments: Payment[];
  orders: Order[];
  referrals: Referral[];
  audit: AuditEntry[];
  syncEvents: SyncEvent[];
  // ward / bed / admission (shared with Admission module)
  wards: Ward[];
  beds: Bed[];
  admissions: Admission[];
  // nursing clinical records
  vitals: Vital[];
  mar: MarEntry[];
  nursingNotes: NursingNote[];
  carePlans: CarePlanEntry[];
  nursingTasks: NursingTask[];
  observations: Observation[];
  intakeOutput: IntakeOutputEntry[];
  handovers: Handover[];
  incidents: Incident[];
  patientEducation: PatientEducationRecord[];
  formTemplates: NursingFormTemplate[];
  formInstances: NursingFormInstance[];
  // cashier module
  wallets: WalletAccount[];
  walletTxns: WalletTxn[];
  refundRequests: RefundRequest[];
  discountRequests: DiscountRequest[];
  cashierShifts: CashierShift[];
  // radiology & ecg module
  imagingRequests: ImagingRequest[];
  radiologyReports: RadiologyReport[];
  ecgStudies: EcgStudy[];
  radEquipment: RadEquipment[];
  radConsumables: RadConsumable[];
  radForms: RadFormInstance[];
  // psychiatric OPC module
  opcVisits: OpcVisit[];
  psychAssessments: PsychAssessment[];
  psychDiagnoses: PsychDiagnosis[];
  psychNotes: PsychNote[];
  opcTreatmentPlans: OpcTreatmentPlan[];
  opcRiskAssessments: OpcRiskAssessment[];
  opcAdmissionRequests: OpcAdmissionRequest[];
  opcReferrals: OpcReferral[];
  opcAppointments: OpcAppointment[];
}

const freshState = (): DbState => {
  const seed = buildSeed();
  return {
    patients: [...seed.patients],
    visits: [...seed.visits],
    invoices: [...seed.invoices],
    payments: [...seed.payments],
    orders: [...seedLabOrders],
    referrals: [],
    audit: [...seed.audit],
    syncEvents: [],
    wards: [...seedWards],
    beds: seedBeds.map(b => ({ ...b })),
    admissions: seedAdmissions.map(a => ({ ...a })),
    vitals: [],
    mar: [...seedMar],
    nursingNotes: [],
    carePlans: [],
    nursingTasks: [...seedNursingTasks],
    observations: [],
    intakeOutput: [],
    handovers: [],
    incidents: [],
    patientEducation: [],
    formTemplates: [...seedFormTemplates],
    formInstances: [],
    wallets: seedWallets.map(w => ({ ...w })),
    walletTxns: [...seedWalletTxns],
    refundRequests: [],
    discountRequests: [],
    cashierShifts: seedCashierShifts.map(s => ({ ...s, totals: { ...s.totals } })),
    imagingRequests: seedImagingRequests.map(r => ({ ...r })),
    radiologyReports: [],
    ecgStudies: seedEcgStudies.map(e => ({ ...e })),
    radEquipment: seedRadEquipment.map(e => ({ ...e })),
    radConsumables: seedRadConsumables.map(c => ({ ...c })),
    radForms: [],
    opcVisits: seedOpcVisits.map(v => ({ ...v })),
    psychAssessments: [],
    psychDiagnoses: seedPsychDiagnoses.map(d => ({ ...d })),
    psychNotes: [],
    opcTreatmentPlans: [],
    opcRiskAssessments: [],
    opcAdmissionRequests: [],
    opcReferrals: [],
    opcAppointments: seedOpcAppointments.map(a => ({ ...a })),
  };
};

let state: DbState = freshState();

/** Keep new hospital numbers above both the seed floor and rows already saved in this browser. */
function storedSeqFloor(
  rows: Array<{ id?: string; hospitalId?: string }> | undefined,
  prefix: string,
  floor: number,
) {
  let max = floor;
  for (const row of rows ?? []) {
    const fromId = Number(String(row.id ?? '').slice(prefix.length + 1));
    const fromHospital = Number(String(row.hospitalId ?? '').split('/').pop());
    if (Number.isFinite(fromId)) max = Math.max(max, fromId);
    if (Number.isFinite(fromHospital) && fromHospital < 100000) max = Math.max(max, fromHospital);
  }
  return max;
}

const initFromStorage = () => {
  const stored = load<DbState>();
  if (stored?.patients?.length) {
    // Backfill collections added after this store was first persisted (nursing spine, etc.).
    const fresh = freshState();
    state = { ...fresh, ...stored } as DbState;
    (Object.keys(fresh) as (keyof DbState)[]).forEach(key => {
      if (!Array.isArray((state as Record<string, unknown>)[key])) {
        (state as Record<string, unknown>)[key] = fresh[key];
      }
    });
  } else {
    state = freshState();
    saveImmediate(state);
  }
  seedCounter('PT', storedSeqFloor(state.patients, 'PT', 1008));
  seedCounter('INV', 2000);
  seedCounter('VST', 30032);
  seedCounter('BTX', 7);
  seedCounter('RCP', 91007);
  seedCounter('LAB', 3207);
  seedCounter('SMP', 4100);
  seedCounter('AUD', 6);
  seedCounter('EV', 0);
  seedCounter('ADM', 2003);
  seedCounter('VIT', 7000);
  seedCounter('MAR', 5002);
  seedCounter('NNOTE', 8000);
  seedCounter('CPL', 9000);
  seedCounter('NTK', 6002);
  seedCounter('OBS', 10000);
  seedCounter('IO', 11000);
  seedCounter('HOV', 12000);
  seedCounter('INC', 13000);
  seedCounter('EDU', 14000);
  seedCounter('FRM', 15000);
  seedCounter('WAL', 3002);
  seedCounter('WTX', 4002);
  seedCounter('REF', 16000);
  seedCounter('DSC', 17000);
  seedCounter('SHF', 5001);
  seedCounter('RAD', 4205);
  seedCounter('ECG', 5202);
  seedCounter('RRP', 6000);
  seedCounter('RFM', 7000);
  seedCounter('OPC', 8204);
  seedCounter('PDX', 9202);
  seedCounter('PSA', 18000);
  seedCounter('PSN', 19000);
  seedCounter('PTP', 20000);
  seedCounter('PRK', 21000);
  seedCounter('OAR', 22000);
  seedCounter('ORF', 23000);
  seedCounter('OAP', 9602);
};

initFromStorage();

const commit = () => {
  saveDebounced(state);
  saveImmediate(state);
  emit('CHANGED');
};

const all = <K extends keyof DbState>(key: K): DbState[K] => state[key];

const findIn = <K extends keyof DbState>(key: K, id: string) => {
  const rows = state[key] as Array<Record<string, unknown>>;
  return rows.find(r =>
    r.id === id || r.invoiceId === id || r.visitCode === id || r.hospitalId === id,
  );
};

const insert = <K extends keyof DbState>(key: K, row: DbState[K][number]) => {
  (state[key] as DbState[K][number][]).unshift(row);
  commit();
  return row;
};

const updateIn = <K extends keyof DbState>(
  key: K,
  id: string,
  patch: Partial<DbState[K][number]>,
) => {
  state[key] = (state[key] as DbState[K][number][]).map(row => {
    const r = row as Record<string, unknown>;
    const match = r.id === id || r.invoiceId === id || r.visitCode === id;
    return match ? { ...row, ...patch } : row;
  }) as DbState[K];
  commit();
  return findIn(key, id);
};

function logAudit(entry: Omit<AuditEntry, 'id' | 'at'>) {
  insert('audit', { ...entry, id: nextId('AUD'), at: nowHuman() });
}

function enqueueSync(type: string, module: string, hmsRef: string, patientId?: string) {
  insert('syncEvents', {
    id: nextId('EV'),
    type,
    module,
    target: 'EMR',
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 5,
    hmsRef,
    patientId,
    createdAt: nowIso(),
  });
}

export const db = {
  on,
  emit,

  reset() {
    state = freshState();
    saveImmediate(state);
    emit('CHANGED');
  },

  /** Test-only: wipe storage and re-init counters/handlers. */
  _testReset() {
    clearStorage();
    resetCounters();
    clearHandlers();
    state = freshState();
    seedCounter('PT', storedSeqFloor(state.patients, 'PT', 1008));
    seedCounter('INV', 2000);
    seedCounter('VST', 30032);
    seedCounter('BTX', 7);
    seedCounter('RCP', 91007);
    seedCounter('LAB', 3207);
    seedCounter('SMP', 4100);
    seedCounter('AUD', 6);
    seedCounter('EV', 0);
    seedCounter('ADM', 2003);
    seedCounter('VIT', 7000);
    seedCounter('MAR', 5002);
    seedCounter('NNOTE', 8000);
    seedCounter('CPL', 9000);
    seedCounter('NTK', 6002);
    seedCounter('OBS', 10000);
    seedCounter('IO', 11000);
    seedCounter('HOV', 12000);
    seedCounter('INC', 13000);
    seedCounter('EDU', 14000);
    seedCounter('FRM', 15000);
    seedCounter('WAL', 3002);
    seedCounter('WTX', 4002);
    seedCounter('REF', 16000);
    seedCounter('DSC', 17000);
    seedCounter('SHF', 5001);
    seedCounter('RAD', 4205);
    seedCounter('ECG', 5202);
    seedCounter('RRP', 6000);
    seedCounter('RFM', 7000);
    seedCounter('OPC', 8204);
    seedCounter('PDX', 9202);
    seedCounter('PSA', 18000);
    seedCounter('PSN', 19000);
    seedCounter('PTP', 20000);
    seedCounter('PRK', 21000);
    seedCounter('OAR', 22000);
    seedCounter('ORF', 23000);
    seedCounter('OAP', 9602);
  },

  snapshot: (): Readonly<DbState> => state,

  /** Remove matching rows from one collection. Used by the local inpatient demo reset. */
  drop<K extends keyof DbState>(key: K, predicate: (row: DbState[K][number]) => boolean) {
    const rows = state[key];
    const next = rows.filter(row => !predicate(row));
    if (next.length === rows.length) return;
    state[key] = next as DbState[K];
    commit();
  },

  patients: {
    list: () => all('patients'),
    get: (id: string) => findIn('patients', id) as Patient | undefined,
    getByHospitalId: (hospitalIdValue: string) =>
      all('patients').find(p => p.hospitalId === hospitalIdValue || p.id === hospitalIdValue),
    update: (id: string, patch: Partial<Patient>) => updateIn('patients', id, patch) as Patient,
    create(input: PatientCreate): Patient {
      const id = nextId('PT');
      const seq = Number(id.split('-')[1]);
      const row: Patient = {
        ...input,
        allergies: input.allergies ?? [],
        id,
        hospitalId: hospitalId(seq, new Date().getFullYear()),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      insert('patients', row);
      emit('PATIENT_REGISTERED', row);
      logAudit({
        actor: input.source ?? 'Front Desk',
        role: 'records',
        action: `Registered patient ${row.name}`,
        entity: 'patient',
        entityId: row.id,
      });
      enqueueSync('PATIENT_REGISTERED', 'Records', row.id, row.id);
      return row;
    },
  },

  visits: {
    list: () => all('visits'),
    get: (id: string) => findIn('visits', id) as Visit | undefined,
    insert: (row: Visit) => insert('visits', row) as Visit,
    update: (id: string, patch: Partial<Visit>) => updateIn('visits', id, patch) as Visit,
  },

  invoices: {
    list: () => all('invoices'),
    get: (id: string) => findIn('invoices', id) as Invoice | undefined,
    insert: (row: Invoice) => insert('invoices', row),
    update: (id: string, patch: Partial<Invoice>) => updateIn('invoices', id, patch) as Invoice,
  },

  payments: {
    list: () => all('payments'),
    get: (id: string) => findIn('payments', id) as Payment | undefined,
    insert: (row: Payment) => insert('payments', row),
    update: (id: string, patch: Partial<Payment>) => updateIn('payments', id, patch) as Payment,
  },

  orders: {
    list: () => all('orders'),
    get: (id: string) => findIn('orders', id) as Order | undefined,
    insert: (row: Order) => insert('orders', row),
    update: (id: string, patch: Partial<Order>) => updateIn('orders', id, patch) as Order,
  },

  referrals: {
    list: () => all('referrals'),
    get: (id: string) => findIn('referrals', id) as Referral | undefined,
    insert: (row: Referral) => insert('referrals', row),
    update: (id: string, patch: Partial<Referral>) => updateIn('referrals', id, patch) as Referral,
  },

  audit: {
    list: () => all('audit'),
    add: logAudit,
  },

  syncEvents: {
    list: () => all('syncEvents'),
  },

  // ---- ward / bed / admission (shared with Admission module) ----
  wards: {
    list: () => all('wards'),
    get: (id: string) => findIn('wards', id) as Ward | undefined,
  },

  beds: {
    list: () => all('beds'),
    get: (id: string) => findIn('beds', id) as Bed | undefined,
    update: (id: string, patch: Partial<Bed>) => updateIn('beds', id, patch) as Bed,
  },

  admissions: {
    list: () => all('admissions'),
    get: (id: string) => findIn('admissions', id) as Admission | undefined,
    insert: (row: Admission) => insert('admissions', row) as Admission,
    update: (id: string, patch: Partial<Admission>) => updateIn('admissions', id, patch) as Admission,
  },

  // ---- nursing clinical records ----
  vitals: {
    list: () => all('vitals'),
    insert: (row: Vital) => insert('vitals', row) as Vital,
  },
  mar: {
    list: () => all('mar'),
    get: (id: string) => findIn('mar', id) as MarEntry | undefined,
    insert: (row: MarEntry) => insert('mar', row) as MarEntry,
    update: (id: string, patch: Partial<MarEntry>) => updateIn('mar', id, patch) as MarEntry,
  },
  nursingNotes: {
    list: () => all('nursingNotes'),
    insert: (row: NursingNote) => insert('nursingNotes', row) as NursingNote,
    update: (id: string, patch: Partial<NursingNote>) => updateIn('nursingNotes', id, patch) as NursingNote,
  },
  carePlans: {
    list: () => all('carePlans'),
    insert: (row: CarePlanEntry) => insert('carePlans', row) as CarePlanEntry,
    update: (id: string, patch: Partial<CarePlanEntry>) => updateIn('carePlans', id, patch) as CarePlanEntry,
  },
  nursingTasks: {
    list: () => all('nursingTasks'),
    insert: (row: NursingTask) => insert('nursingTasks', row) as NursingTask,
    update: (id: string, patch: Partial<NursingTask>) => updateIn('nursingTasks', id, patch) as NursingTask,
  },
  observations: {
    list: () => all('observations'),
    insert: (row: Observation) => insert('observations', row) as Observation,
  },
  intakeOutput: {
    list: () => all('intakeOutput'),
    insert: (row: IntakeOutputEntry) => insert('intakeOutput', row) as IntakeOutputEntry,
  },
  handovers: {
    list: () => all('handovers'),
    insert: (row: Handover) => insert('handovers', row) as Handover,
    update: (id: string, patch: Partial<Handover>) => updateIn('handovers', id, patch) as Handover,
  },
  incidents: {
    list: () => all('incidents'),
    insert: (row: Incident) => insert('incidents', row) as Incident,
    update: (id: string, patch: Partial<Incident>) => updateIn('incidents', id, patch) as Incident,
  },
  patientEducation: {
    list: () => all('patientEducation'),
    insert: (row: PatientEducationRecord) => insert('patientEducation', row) as PatientEducationRecord,
  },
  formTemplates: {
    list: () => all('formTemplates'),
    get: (id: string) => findIn('formTemplates', id) as NursingFormTemplate | undefined,
    insert: (row: NursingFormTemplate) => insert('formTemplates', row) as NursingFormTemplate,
    update: (id: string, patch: Partial<NursingFormTemplate>) => updateIn('formTemplates', id, patch) as NursingFormTemplate,
  },
  formInstances: {
    list: () => all('formInstances'),
    get: (id: string) => findIn('formInstances', id) as NursingFormInstance | undefined,
    insert: (row: NursingFormInstance) => insert('formInstances', row) as NursingFormInstance,
    update: (id: string, patch: Partial<NursingFormInstance>) => updateIn('formInstances', id, patch) as NursingFormInstance,
  },

  // ---- cashier module ----
  wallets: {
    list: () => all('wallets'),
    get: (id: string) => findIn('wallets', id) as WalletAccount | undefined,
    getByPatient: (patientId: string) => all('wallets').find(w => w.patientId === patientId),
    insert: (row: WalletAccount) => insert('wallets', row) as WalletAccount,
    update: (id: string, patch: Partial<WalletAccount>) => updateIn('wallets', id, patch) as WalletAccount,
  },
  walletTxns: {
    list: () => all('walletTxns'),
    insert: (row: WalletTxn) => insert('walletTxns', row) as WalletTxn,
  },
  refundRequests: {
    list: () => all('refundRequests'),
    get: (id: string) => findIn('refundRequests', id) as RefundRequest | undefined,
    insert: (row: RefundRequest) => insert('refundRequests', row) as RefundRequest,
    update: (id: string, patch: Partial<RefundRequest>) => updateIn('refundRequests', id, patch) as RefundRequest,
  },
  discountRequests: {
    list: () => all('discountRequests'),
    get: (id: string) => findIn('discountRequests', id) as DiscountRequest | undefined,
    insert: (row: DiscountRequest) => insert('discountRequests', row) as DiscountRequest,
    update: (id: string, patch: Partial<DiscountRequest>) => updateIn('discountRequests', id, patch) as DiscountRequest,
  },
  cashierShifts: {
    list: () => all('cashierShifts'),
    get: (id: string) => findIn('cashierShifts', id) as CashierShift | undefined,
    insert: (row: CashierShift) => insert('cashierShifts', row) as CashierShift,
    update: (id: string, patch: Partial<CashierShift>) => updateIn('cashierShifts', id, patch) as CashierShift,
  },

  // ---- radiology & ecg module ----
  imagingRequests: {
    list: () => all('imagingRequests'),
    get: (id: string) => findIn('imagingRequests', id) as ImagingRequest | undefined,
    insert: (row: ImagingRequest) => insert('imagingRequests', row) as ImagingRequest,
    update: (id: string, patch: Partial<ImagingRequest>) => updateIn('imagingRequests', id, patch) as ImagingRequest,
  },
  radiologyReports: {
    list: () => all('radiologyReports'),
    get: (id: string) => findIn('radiologyReports', id) as RadiologyReport | undefined,
    insert: (row: RadiologyReport) => insert('radiologyReports', row) as RadiologyReport,
    update: (id: string, patch: Partial<RadiologyReport>) => updateIn('radiologyReports', id, patch) as RadiologyReport,
  },
  ecgStudies: {
    list: () => all('ecgStudies'),
    get: (id: string) => findIn('ecgStudies', id) as EcgStudy | undefined,
    insert: (row: EcgStudy) => insert('ecgStudies', row) as EcgStudy,
    update: (id: string, patch: Partial<EcgStudy>) => updateIn('ecgStudies', id, patch) as EcgStudy,
  },
  radEquipment: {
    list: () => all('radEquipment'),
    get: (id: string) => findIn('radEquipment', id) as RadEquipment | undefined,
    insert: (row: RadEquipment) => insert('radEquipment', row) as RadEquipment,
    update: (id: string, patch: Partial<RadEquipment>) => updateIn('radEquipment', id, patch) as RadEquipment,
  },
  radConsumables: {
    list: () => all('radConsumables'),
    get: (id: string) => findIn('radConsumables', id) as RadConsumable | undefined,
    insert: (row: RadConsumable) => insert('radConsumables', row) as RadConsumable,
    update: (id: string, patch: Partial<RadConsumable>) => updateIn('radConsumables', id, patch) as RadConsumable,
  },
  radForms: {
    list: () => all('radForms'),
    get: (id: string) => findIn('radForms', id) as RadFormInstance | undefined,
    insert: (row: RadFormInstance) => insert('radForms', row) as RadFormInstance,
  },

  // ---- psychiatric OPC module ----
  opcVisits: {
    list: () => all('opcVisits'),
    get: (id: string) => findIn('opcVisits', id) as OpcVisit | undefined,
    insert: (row: OpcVisit) => insert('opcVisits', row) as OpcVisit,
    update: (id: string, patch: Partial<OpcVisit>) => updateIn('opcVisits', id, patch) as OpcVisit,
  },
  psychAssessments: {
    list: () => all('psychAssessments'),
    get: (id: string) => findIn('psychAssessments', id) as PsychAssessment | undefined,
    insert: (row: PsychAssessment) => insert('psychAssessments', row) as PsychAssessment,
  },
  psychDiagnoses: {
    list: () => all('psychDiagnoses'),
    get: (id: string) => findIn('psychDiagnoses', id) as PsychDiagnosis | undefined,
    insert: (row: PsychDiagnosis) => insert('psychDiagnoses', row) as PsychDiagnosis,
    update: (id: string, patch: Partial<PsychDiagnosis>) => updateIn('psychDiagnoses', id, patch) as PsychDiagnosis,
  },
  psychNotes: {
    list: () => all('psychNotes'),
    get: (id: string) => findIn('psychNotes', id) as PsychNote | undefined,
    insert: (row: PsychNote) => insert('psychNotes', row) as PsychNote,
    update: (id: string, patch: Partial<PsychNote>) => updateIn('psychNotes', id, patch) as PsychNote,
  },
  opcTreatmentPlans: {
    list: () => all('opcTreatmentPlans'),
    get: (id: string) => findIn('opcTreatmentPlans', id) as OpcTreatmentPlan | undefined,
    insert: (row: OpcTreatmentPlan) => insert('opcTreatmentPlans', row) as OpcTreatmentPlan,
  },
  opcRiskAssessments: {
    list: () => all('opcRiskAssessments'),
    get: (id: string) => findIn('opcRiskAssessments', id) as OpcRiskAssessment | undefined,
    insert: (row: OpcRiskAssessment) => insert('opcRiskAssessments', row) as OpcRiskAssessment,
  },
  opcAdmissionRequests: {
    list: () => all('opcAdmissionRequests'),
    get: (id: string) => findIn('opcAdmissionRequests', id) as OpcAdmissionRequest | undefined,
    insert: (row: OpcAdmissionRequest) => insert('opcAdmissionRequests', row) as OpcAdmissionRequest,
    update: (id: string, patch: Partial<OpcAdmissionRequest>) => updateIn('opcAdmissionRequests', id, patch) as OpcAdmissionRequest,
  },
  opcReferrals: {
    list: () => all('opcReferrals'),
    get: (id: string) => findIn('opcReferrals', id) as OpcReferral | undefined,
    insert: (row: OpcReferral) => insert('opcReferrals', row) as OpcReferral,
    update: (id: string, patch: Partial<OpcReferral>) => updateIn('opcReferrals', id, patch) as OpcReferral,
  },
  opcAppointments: {
    list: () => all('opcAppointments'),
    get: (id: string) => findIn('opcAppointments', id) as OpcAppointment | undefined,
    insert: (row: OpcAppointment) => insert('opcAppointments', row) as OpcAppointment,
    update: (id: string, patch: Partial<OpcAppointment>) => updateIn('opcAppointments', id, patch) as OpcAppointment,
  },
};

export type { DbEvent };
