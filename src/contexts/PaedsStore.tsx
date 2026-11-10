import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  STORAGE_KEY,
  allergyWarning,
  bedTaken,
  buildPaedsSeed,
  followUpDisplay,
  formatAge,
  isoDate,
  latestWeight,
  nextSerial,
  patientName,
  timesOverlap,
  weightDose,
  type AppointmentStatus,
  type DevelopmentAssessment,
  type EmergencyCase,
  type EquipmentStatus,
  type GrowthRecord,
  type Immunisation,
  type NewbornExam,
  type NursingObs,
  type NutritionNote,
  type PaedsAdmission,
  type PaedsAppointment,
  type PaedsDiagnosis,
  type PaedsEncounter,
  type PaedsEquipment,
  type PaedsFollowUp,
  type PaedsInvestigation,
  type PaedsPatient,
  type PaedsPrescription,
  type PaedsProcedure,
  type PaedsReferral,
  type PaedsService,
  type PaedsState,
  type PlanItemStatus,
  type TreatmentItem,
  type TreatmentPlan,
  type VaccineStatus,
  type VitalSet,
} from '@/data/paedsData';

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

interface PaedsApi {
  state: PaedsState;
  today: string;
  resetDemoData: () => void;
  registerPatient: (input: Omit<PaedsPatient, 'id' | 'createdAt' | 'lastVisit' | 'nextAppointment' | 'status'> & { status?: PaedsPatient['status'] }) => Result<PaedsPatient>;
  saveAppointment: (input: Omit<PaedsAppointment, 'id'> & { id?: string }) => Result<PaedsAppointment>;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  saveVitals: (input: Omit<VitalSet, 'id'> & { id?: string }) => Result<VitalSet>;
  saveGrowth: (input: Omit<GrowthRecord, 'id'> & { id?: string }) => Result<GrowthRecord>;
  saveDevelopment: (input: Omit<DevelopmentAssessment, 'id'> & { id?: string }) => DevelopmentAssessment;
  saveNewborn: (input: Omit<NewbornExam, 'id'> & { id?: string }) => NewbornExam;
  saveImmunisation: (input: Omit<Immunisation, 'id'> & { id?: string }) => Result<Immunisation>;
  saveEncounter: (input: Omit<PaedsEncounter, 'id'> & { id?: string }) => Result<PaedsEncounter>;
  saveDiagnosis: (input: Omit<PaedsDiagnosis, 'id'> & { id?: string }) => PaedsDiagnosis;
  savePrescription: (input: Omit<PaedsPrescription, 'id'> & { id?: string }) => Result<PaedsPrescription>;
  saveInvestigation: (input: Omit<PaedsInvestigation, 'id'> & { id?: string }) => PaedsInvestigation;
  saveAdmission: (input: Omit<PaedsAdmission, 'id' | 'number'> & { id?: string; number?: string }) => Result<PaedsAdmission>;
  saveObservation: (input: Omit<NursingObs, 'id'> & { id?: string }) => NursingObs;
  savePlan: (input: Omit<TreatmentPlan, 'id' | 'items' | 'createdAt'> & { id?: string; items?: TreatmentItem[] }) => TreatmentPlan;
  updatePlanItem: (planId: string, itemId: string, patch: Partial<TreatmentItem>) => Result<TreatmentItem>;
  saveProcedure: (input: Omit<PaedsProcedure, 'id'> & { id?: string }) => Result<PaedsProcedure>;
  saveReferral: (input: Omit<PaedsReferral, 'id'> & { id?: string }) => PaedsReferral;
  saveFollowUp: (input: Omit<PaedsFollowUp, 'id'> & { id?: string }) => PaedsFollowUp;
  saveNutrition: (input: Omit<NutritionNote, 'id'> & { id?: string }) => NutritionNote;
  saveEmergency: (input: Omit<EmergencyCase, 'id'> & { id?: string }) => EmergencyCase;
  saveService: (input: Omit<PaedsService, 'id'> & { id?: string }) => PaedsService;
  setEquipment: (id: string, patch: Partial<Pick<PaedsEquipment, 'quantity' | 'status'>>) => Result<PaedsEquipment>;
  nameOf: (id: string) => string;
  ageOf: (id: string) => string;
  warningsFor: (patientId: string, medication: string) => string;
  previewDose: (weightKg: string, perKg: string) => ReturnType<typeof weightDose>;
}

const Ctx = createContext<PaedsApi | null>(null);

function loadState(): PaedsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PaedsState;
      if (parsed?.patients?.length) return parsed;
    }
  } catch { /* seed */ }
  const seed = buildPaedsSeed();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

function syncDates(state: PaedsState, today: string): PaedsState {
  const patients = state.patients.map((p) => {
    const future = state.appointments.filter((a) => a.patientId === p.id && a.date >= today && a.status !== 'Cancelled' && a.status !== 'No Show' && a.status !== 'Completed').sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
    const visits = [
      ...state.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').map((a) => a.date),
      ...state.encounters.filter((e) => e.patientId === p.id && e.status === 'Completed').map((e) => e.date),
    ].sort();
    return { ...p, nextAppointment: future[0] ? `${future[0].date} ${future[0].startTime}` : '', lastVisit: visits.at(-1) || p.lastVisit };
  });
  return { ...state, patients };
}

export function PaedsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PaedsState>(() => loadState());
  const today = useMemo(() => isoDate(0), []);
  const commit = useCallback((updater: (prev: PaedsState) => PaedsState) => {
    setState((prev) => {
      const next = syncDates(updater(prev), isoDate(0));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const resetDemoData = useCallback(() => {
    const seed = buildPaedsSeed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
    setState(seed);
  }, []);

  const registerPatient: PaedsApi['registerPatient'] = (input) => {
    const phone = input.guardian.phone.replace(/\s+/g, '');
    const nameKey = patientName(input).toLowerCase();
    const duplicate = state.patients.find((p) => p.guardian.phone.replace(/\s+/g, '') === phone && patientName(p).toLowerCase() === nameKey);
    if (duplicate) return { ok: false, message: `A paediatric record already exists for ${patientName(duplicate)} (${duplicate.id}).` };
    const patient: PaedsPatient = { ...input, id: nextSerial('PAE-P-', state.patients.map((p) => p.id)), status: input.status ?? 'Active', lastVisit: '', nextAppointment: '', createdAt: today, guardian: { ...input.guardian, phone } };
    commit((prev) => ({ ...prev, patients: [patient, ...prev.patients] }));
    return { ok: true, value: patient };
  };

  const saveAppointment: PaedsApi['saveAppointment'] = (input) => {
    if (!input.patientId || !input.date || input.endTime <= input.startTime) return { ok: false, message: 'Patient, date, and a valid time range are required.' };
    const clash = state.appointments.find((a) => {
      if (input.id && a.id === input.id) return false;
      if (a.status === 'Cancelled' || a.status === 'No Show' || input.status === 'Cancelled') return false;
      return a.date === input.date && a.clinician === input.clinician && timesOverlap(a.startTime, a.endTime, input.startTime, input.endTime);
    });
    if (clash) return { ok: false, message: `That clinician is already booked ${clash.startTime}–${clash.endTime}.` };
    let saved: PaedsAppointment | null = null;
    commit((prev) => {
      const id = input.id && prev.appointments.some((a) => a.id === input.id) ? input.id : nextSerial('PAP-', prev.appointments.map((a) => a.id));
      saved = { ...input, id };
      const appointments = prev.appointments.some((a) => a.id === id) ? prev.appointments.map((a) => a.id === id ? saved! : a) : [...prev.appointments, saved];
      return { ...prev, appointments };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the appointment.' };
  };

  const setAppointmentStatus: PaedsApi['setAppointmentStatus'] = (id, status) => {
    commit((prev) => ({ ...prev, appointments: prev.appointments.map((a) => a.id === id ? { ...a, status } : a) }));
  };

  const saveVitals: PaedsApi['saveVitals'] = (input) => {
    if (!input.patientId) return { ok: false, message: 'Select a child.' };
    const numeric = [input.temperatureC, input.heartRate, input.respiratoryRate, input.weightKg].filter(Boolean);
    if (numeric.some((value) => Number.isNaN(Number(value)) || Number(value) < 0)) return { ok: false, message: 'Observations must be numbers when entered.' };
    let saved: VitalSet | null = null;
    commit((prev) => {
      const id = input.id && prev.vitals.some((v) => v.id === input.id) ? input.id : nextSerial('PVT-', prev.vitals.map((v) => v.id));
      saved = { ...input, id };
      const vitals = prev.vitals.some((v) => v.id === id) ? prev.vitals.map((v) => v.id === id ? saved! : v) : [saved, ...prev.vitals];
      return { ...prev, vitals };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save observations.' };
  };

  const saveGrowth: PaedsApi['saveGrowth'] = (input) => {
    if (!input.patientId || !input.date) return { ok: false, message: 'Patient and date are required.' };
    const values = [input.weightKg, input.lengthCm, input.heightCm, input.headCm, input.muacCm].filter(Boolean);
    if (!values.length) return { ok: false, message: 'Enter at least one measurement.' };
    if (values.some((value) => Number.isNaN(Number(value)) || Number(value) <= 0)) return { ok: false, message: 'Measurements must be positive numbers.' };
    let saved: GrowthRecord | null = null;
    commit((prev) => {
      const id = input.id && prev.growth.some((g) => g.id === input.id) ? input.id : nextSerial('PGR-', prev.growth.map((g) => g.id));
      saved = { ...input, id };
      const growth = prev.growth.some((g) => g.id === id) ? prev.growth.map((g) => g.id === id ? saved! : g) : [saved, ...prev.growth];
      return { ...prev, growth };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save growth.' };
  };

  const saveKeyed = <T extends { id: string }>(key: keyof PaedsState, prefix: string, input: Omit<T, 'id'> & { id?: string }): T => {
    let saved: T | null = null;
    commit((prev) => {
      const rows = prev[key] as unknown as T[];
      const id = input.id && rows.some((row) => row.id === input.id) ? input.id : nextSerial(prefix, rows.map((row) => row.id));
      saved = { ...input, id } as T;
      const next = rows.some((row) => row.id === id) ? rows.map((row) => row.id === id ? saved! : row) : [saved, ...rows];
      return { ...prev, [key]: next };
    });
    return saved!;
  };

  const saveImmunisation: PaedsApi['saveImmunisation'] = (input) => {
    if (input.status === 'Administered') {
      if (!input.vaccine.trim() || !input.dateGiven || !input.route.trim() || !input.site.trim() || !input.staff.trim()) {
        return { ok: false, message: 'An administered dose needs the vaccine, date, route, site, and staff member.' };
      }
    }
    if (!input.patientId || !input.vaccine.trim()) return { ok: false, message: 'Select a child and a vaccine name.' };
    return { ok: true, value: saveKeyed<Immunisation>('immunisations', 'PIM-', input) };
  };

  const saveEncounter: PaedsApi['saveEncounter'] = (input) => {
    if (input.status === 'Completed' && (!input.complaint.trim() || !input.diagnosis.trim())) {
      return { ok: false, message: 'A completed consultation needs a complaint and a diagnosis.' };
    }
    if (!input.patientId) return { ok: false, message: 'Select a child.' };
    return { ok: true, value: saveKeyed<PaedsEncounter>('encounters', 'PEN-', input) };
  };

  const savePrescription: PaedsApi['savePrescription'] = (input) => {
    if (!input.items.length) return { ok: false, message: 'Add at least one medication.' };
    for (const item of input.items) {
      if (!item.name.trim() || !item.route.trim() || !item.frequency.trim()) return { ok: false, message: 'Each medication needs a name, route, and frequency.' };
      if (item.weightBased) {
        const calc = weightDose(item.weightKg, item.dosePerKg);
        if (input.status === 'Finalised' && !calc.ok) return calc;
        if (input.status === 'Finalised' && (!item.reviewed || !item.dose.trim())) {
          return { ok: false, message: 'Review the calculation and enter the final prescribed dose before finalising a weight-based item.' };
        }
      }
    }
    const patient = state.patients.find((p) => p.id === input.patientId);
    const warnings = input.items.map((item) => allergyWarning(patient?.allergies ?? '', item.name)).filter(Boolean);
    if (warnings.length && !input.allergyAcknowledged) return { ok: false, message: 'Review the allergy warning before saving.' };
    if (input.status === 'Finalised' && input.items.some((item) => item.weightBased && !item.reviewed)) {
      return { ok: false, message: 'Weight-based items must be reviewed before the prescription is finalised.' };
    }
    return { ok: true, value: saveKeyed<PaedsPrescription>('prescriptions', 'PRX-', input) };
  };

  const saveAdmission: PaedsApi['saveAdmission'] = (input) => {
    if (!input.patientId || !input.date || !input.reason.trim()) return { ok: false, message: 'Patient, date, and reason are required.' };
    if (input.status === 'Discharged' && (!input.dischargeDate || !input.summary.trim() || !input.dischargingClinician.trim())) {
      return { ok: false, message: 'Discharge needs a date, summary, and discharging clinician. This does not declare the child fit for discharge.' };
    }
    if (input.bedId && bedTaken(state.beds, input.bedId, input.patientId)) return { ok: false, message: 'That bed is already occupied.' };
    let saved: PaedsAdmission | null = null;
    commit((prev) => {
      const id = input.id && prev.admissions.some((a) => a.id === input.id) ? input.id : nextSerial('PAD-', prev.admissions.map((a) => a.id));
      const number = input.number || prev.admissions.find((a) => a.id === id)?.number || nextSerial('PADM-', prev.admissions.map((a) => a.number));
      saved = { ...input, id, number };
      const admissions = prev.admissions.some((a) => a.id === id) ? prev.admissions.map((a) => a.id === id ? saved! : a) : [saved, ...prev.admissions];
      const beds = prev.beds.map((bed) => {
        if (bed.patientId === input.patientId && bed.id !== input.bedId) return { ...bed, patientId: '', status: 'Available' as const };
        if (bed.id === input.bedId && input.status !== 'Discharged' && input.status !== 'Transferred') return { ...bed, patientId: input.patientId, status: 'Occupied' as const };
        if (bed.id === input.bedId && (input.status === 'Discharged' || input.status === 'Transferred')) return { ...bed, patientId: '', status: 'Cleaning' as const };
        return bed;
      });
      return { ...prev, admissions, beds };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the admission.' };
  };

  const updatePlanItem: PaedsApi['updatePlanItem'] = (planId, itemId, patch) => {
    if (patch.status === 'Completed') {
      const item = state.plans.find((p) => p.id === planId)?.items.find((row) => row.id === itemId);
      const linked = item?.procedureId || state.procedures.some((proc) => proc.planItemId === itemId && proc.status === 'Completed');
      if (!linked) return { ok: false, message: 'Record a completed procedure before marking this item completed.' };
    }
    commit((prev) => ({ ...prev, plans: prev.plans.map((p) => p.id !== planId ? p : { ...p, items: p.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }) }));
    const item = state.plans.find((p) => p.id === planId)?.items.find((row) => row.id === itemId);
    return item ? { ok: true, value: { ...item, ...patch } } : { ok: false, message: 'Item not found.' };
  };

  const saveProcedure: PaedsApi['saveProcedure'] = (input) => {
    if (!input.patientId || !input.name.trim() || !input.date) return { ok: false, message: 'Patient, procedure, and date are required.' };
    let saved: PaedsProcedure | null = null;
    commit((prev) => {
      const id = input.id && prev.procedures.some((p) => p.id === input.id) ? input.id : nextSerial('PPR-', prev.procedures.map((p) => p.id));
      saved = { ...input, id };
      const procedures = prev.procedures.some((p) => p.id === id) ? prev.procedures.map((p) => p.id === id ? saved! : p) : [saved, ...prev.procedures];
      let plans = prev.plans;
      if (saved.status === 'Completed' && saved.planId && saved.planItemId) {
        plans = plans.map((plan) => plan.id !== saved!.planId ? plan : { ...plan, items: plan.items.map((item) => item.id === saved!.planItemId ? { ...item, status: 'Completed' as PlanItemStatus, procedureId: saved!.id } : item) });
      }
      return { ...prev, procedures, plans };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not record the procedure.' };
  };

  const setEquipment: PaedsApi['setEquipment'] = (id, patch) => {
    const item = state.equipment.find((row) => row.id === id);
    if (!item) return { ok: false, message: 'Item not found.' };
    if (patch.quantity !== undefined && patch.quantity < 0) return { ok: false, message: 'Quantity cannot be negative.' };
    const next = { ...item, ...patch };
    commit((prev) => ({ ...prev, equipment: prev.equipment.map((row) => row.id === id ? next : row) }));
    return { ok: true, value: next };
  };

  const api: PaedsApi = {
    state, today, resetDemoData, registerPatient, saveAppointment, setAppointmentStatus, saveVitals, saveGrowth,
    saveDevelopment: (input) => saveKeyed<DevelopmentAssessment>('development', 'PDV-', input),
    saveNewborn: (input) => saveKeyed<NewbornExam>('newborn', 'PNB-', input),
    saveImmunisation, saveEncounter,
    saveDiagnosis: (input) => saveKeyed<PaedsDiagnosis>('diagnoses', 'PDX-', input),
    savePrescription,
    saveInvestigation: (input) => saveKeyed<PaedsInvestigation>('investigations', 'PIN-', input),
    saveAdmission,
    saveObservation: (input) => saveKeyed<NursingObs>('observations', 'POB-', input),
    savePlan: (input) => {
      let saved: TreatmentPlan | null = null;
      commit((prev) => {
        if (input.id && prev.plans.some((p) => p.id === input.id)) {
          const existing = prev.plans.find((p) => p.id === input.id)!;
          saved = { ...existing, ...input, id: input.id, items: input.items ?? existing.items };
          return { ...prev, plans: prev.plans.map((p) => p.id === input.id ? saved! : p) };
        }
        saved = { id: nextSerial('PPL-', prev.plans.map((p) => p.id)), patientId: input.patientId, encounterId: input.encounterId, title: input.title, createdAt: today, clinician: input.clinician, status: input.status, items: input.items ?? [] };
        return { ...prev, plans: [saved, ...prev.plans] };
      });
      return saved!;
    },
    updatePlanItem, saveProcedure,
    saveReferral: (input) => saveKeyed<PaedsReferral>('referrals', 'PRF-', input),
    saveFollowUp: (input) => saveKeyed<PaedsFollowUp>('followUps', 'PFU-', input),
    saveNutrition: (input) => saveKeyed<NutritionNote>('nutrition', 'PNU-', input),
    saveEmergency: (input) => saveKeyed<EmergencyCase>('emergencies', 'PEM-', input),
    saveService: (input) => saveKeyed<PaedsService>('services', 'PSV-', input),
    setEquipment,
    nameOf: (id) => { const p = state.patients.find((row) => row.id === id); return p ? patientName(p) : id; },
    ageOf: (id) => { const p = state.patients.find((row) => row.id === id); return p ? formatAge(p.dateOfBirth, today) : ''; },
    warningsFor: (patientId, medication) => allergyWarning(state.patients.find((p) => p.id === patientId)?.allergies ?? '', medication),
    previewDose: weightDose,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePaeds(): PaedsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePaeds must be used within PaedsProvider');
  return ctx;
}

export { followUpDisplay, latestWeight };
export type { VaccineStatus };
