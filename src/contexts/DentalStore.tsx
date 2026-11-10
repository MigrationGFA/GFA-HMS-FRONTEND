import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  STORAGE_KEY,
  allergyWarning,
  buildDentalSeed,
  followUpDisplayStatus,
  isoDate,
  nextSerial,
  openPlanItems,
  patientName,
  stockStatus,
  syncPatientDates,
  timesOverlap,
  type AppointmentStatus,
  type ChairStatus,
  type DentalAppointment,
  type DentalEncounter,
  type DentalFollowUp,
  type DentalInvestigation,
  type DentalPatient,
  type DentalPrescription,
  type DentalProcedure,
  type DentalReferral,
  type DentalService,
  type DentalState,
  type Dentition,
  type EncounterStatus,
  type InventoryItem,
  type PlanItemStatus,
  type RxMedication,
  type ToothFinding,
  type TreatmentItem,
  type TreatmentPlan,
} from '@/data/dentalData';

export interface DashboardStats {
  todayAppointments: number;
  waiting: number;
  seenToday: number;
  completedProcedures: number;
  pendingPlans: number;
  followUpsDue: number;
  yesterdayAppointments: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

interface DentalApi {
  state: DentalState;
  today: string;
  stats: DashboardStats;
  resetDemoData: () => void;
  registerPatient: (input: Omit<DentalPatient, 'id' | 'createdAt' | 'status' | 'lastVisit' | 'nextAppointment'> & { status?: DentalPatient['status'] }) => Result<DentalPatient>;
  updateChair: (id: string, status: ChairStatus) => void;
  saveAppointment: (input: Omit<DentalAppointment, 'id'> & { id?: string }) => Result<DentalAppointment>;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  ensureChart: (patientId: string) => void;
  setDentition: (patientId: string, dentition: Dentition) => void;
  addFinding: (patientId: string, finding: Omit<ToothFinding, 'id' | 'recordedAt'>) => void;
  updateFinding: (patientId: string, findingId: string, patch: Partial<ToothFinding>) => void;
  removeFinding: (patientId: string, findingId: string) => void;
  saveEncounter: (input: Omit<DentalEncounter, 'id'> & { id?: string }) => DentalEncounter;
  setEncounterStatus: (id: string, status: EncounterStatus) => Result<DentalEncounter>;
  savePlan: (input: Omit<TreatmentPlan, 'id' | 'items' | 'createdAt'> & { id?: string; items?: TreatmentItem[] }) => TreatmentPlan;
  addPlanItem: (planId: string, item: Omit<TreatmentItem, 'id'>) => void;
  updatePlanItem: (planId: string, itemId: string, patch: Partial<TreatmentItem>) => void;
  removePlanItem: (planId: string, itemId: string) => void;
  setPlanConsent: (planId: string, consent: TreatmentPlan['consentStatus']) => void;
  saveProcedure: (input: Omit<DentalProcedure, 'id'> & { id?: string }) => Result<DentalProcedure>;
  savePrescription: (input: Omit<DentalPrescription, 'id'> & { id?: string }) => Result<DentalPrescription>;
  saveInvestigation: (input: Omit<DentalInvestigation, 'id'> & { id?: string }) => DentalInvestigation;
  saveReferral: (input: Omit<DentalReferral, 'id'> & { id?: string }) => DentalReferral;
  saveFollowUp: (input: Omit<DentalFollowUp, 'id'> & { id?: string }) => DentalFollowUp;
  saveService: (input: Omit<DentalService, 'id'> & { id?: string }) => DentalService;
  adjustStock: (id: string, quantity: number) => Result<InventoryItem>;
  addDocument: (patientId: string, name: string, kind: string, note: string) => void;
  patientById: (id: string) => DentalPatient | undefined;
  nameOf: (patientId: string) => string;
  warningsFor: (patientId: string, medicationName: string) => string;
}

const Ctx = createContext<DentalApi | null>(null);

function loadState(): DentalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DentalState;
      if (parsed && Array.isArray(parsed.patients) && parsed.patients.length > 0 && Array.isArray(parsed.appointments)) {
        return parsed;
      }
    }
  } catch {
    /* use seed */
  }
  const seed = buildDentalSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    /* ignore quota */
  }
  return seed;
}

function activeAppt(status: AppointmentStatus): boolean {
  return status !== 'Cancelled' && status !== 'No Show';
}

export function DentalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DentalState>(() => loadState());
  const today = useMemo(() => isoDate(0), []);

  const commit = useCallback((updater: (prev: DentalState) => DentalState) => {
    setState((prev) => {
      const next = syncPatientDates(updater(prev), isoDate(0));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const seed = buildDentalSeed();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch {
      /* ignore */
    }
    setState(seed);
  }, []);

  const registerPatient: DentalApi['registerPatient'] = (input) => {
    const phone = input.phone.replace(/\s+/g, '');
    const nameKey = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
    const duplicate = state.patients.find((p) => {
      const samePhoneName = p.phone.replace(/\s+/g, '') === phone && patientName(p).toLowerCase() === nameKey;
      const sameHospital = input.hospitalId.trim() && p.hospitalId.toLowerCase() === input.hospitalId.trim().toLowerCase();
      return samePhoneName || sameHospital;
    });
    if (duplicate) {
      return { ok: false, message: `A dental record already exists for ${patientName(duplicate)} (${duplicate.id}).` };
    }
    const patient: DentalPatient = {
      ...input,
      id: nextSerial('DEN-P-', state.patients.map((p) => p.id)),
      status: input.status ?? 'Active',
      lastVisit: '',
      nextAppointment: '',
      createdAt: today,
      hospitalId: input.hospitalId.trim(),
      phone,
    };
    commit((prev) => ({
      ...prev,
      patients: [patient, ...prev.patients],
      charts: [...prev.charts, { patientId: patient.id, dentition: 'permanent', findings: [] }],
    }));
    return { ok: true, value: patient };
  };

  const updateChair: DentalApi['updateChair'] = (id, status) => {
    commit((prev) => ({
      ...prev,
      chairs: prev.chairs.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  };

  const saveAppointment: DentalApi['saveAppointment'] = (input) => {
    if (!input.patientId || !input.date || !input.startTime || !input.endTime) {
      return { ok: false, message: 'Patient, date, start time, and end time are required.' };
    }
    if (input.endTime <= input.startTime) {
      return { ok: false, message: 'End time must be after the start time.' };
    }
    const clash = state.appointments.find((a) => {
      if (input.id && a.id === input.id) return false;
      if (!activeAppt(a.status) || !activeAppt(input.status)) return false;
      if (a.date !== input.date) return false;
      if (!timesOverlap(a.startTime, a.endTime, input.startTime, input.endTime)) return false;
      return a.dentist === input.dentist || a.chairId === input.chairId;
    });
    if (clash) {
      const who = clash.dentist === input.dentist ? clash.dentist : clash.chairId;
      return { ok: false, message: `That time overlaps another appointment for ${who} (${clash.startTime}–${clash.endTime}).` };
    }
    let saved: DentalAppointment | null = null;
    commit((prev) => {
      if (input.id && prev.appointments.some((a) => a.id === input.id)) {
        saved = { ...input, id: input.id };
        return { ...prev, appointments: prev.appointments.map((a) => (a.id === input.id ? saved! : a)) };
      }
      saved = { ...input, id: nextSerial('APT-', prev.appointments.map((a) => a.id)) };
      return { ...prev, appointments: [...prev.appointments, saved] };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the appointment.' };
  };

  const setAppointmentStatus: DentalApi['setAppointmentStatus'] = (id, status) => {
    commit((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }));
  };

  const ensureChart: DentalApi['ensureChart'] = (patientId) => {
    if (state.charts.some((c) => c.patientId === patientId)) return;
    commit((prev) => ({
      ...prev,
      charts: [...prev.charts, { patientId, dentition: 'permanent', findings: [] }],
    }));
  };

  const setDentition: DentalApi['setDentition'] = (patientId, dentition) => {
    commit((prev) => ({
      ...prev,
      charts: prev.charts.some((c) => c.patientId === patientId)
        ? prev.charts.map((c) => (c.patientId === patientId ? { ...c, dentition } : c))
        : [...prev.charts, { patientId, dentition, findings: [] }],
    }));
  };

  const addFinding: DentalApi['addFinding'] = (patientId, finding) => {
    const row: ToothFinding = {
      ...finding,
      id: nextSerial('FND-', state.charts.flatMap((c) => c.findings.map((f) => f.id))),
      recordedAt: today,
    };
    commit((prev) => ({
      ...prev,
      charts: prev.charts.some((c) => c.patientId === patientId)
        ? prev.charts.map((c) => (c.patientId === patientId ? { ...c, findings: [...c.findings, row] } : c))
        : [...prev.charts, { patientId, dentition: 'permanent', findings: [row] }],
    }));
  };

  const updateFinding: DentalApi['updateFinding'] = (patientId, findingId, patch) => {
    commit((prev) => ({
      ...prev,
      charts: prev.charts.map((c) => c.patientId !== patientId ? c : {
        ...c,
        findings: c.findings.map((f) => (f.id === findingId ? { ...f, ...patch } : f)),
      }),
    }));
  };

  const removeFinding: DentalApi['removeFinding'] = (patientId, findingId) => {
    commit((prev) => ({
      ...prev,
      charts: prev.charts.map((c) => c.patientId !== patientId ? c : {
        ...c,
        findings: c.findings.filter((f) => f.id !== findingId),
      }),
    }));
  };

  const saveEncounter: DentalApi['saveEncounter'] = (input) => {
    let saved: DentalEncounter | null = null;
    commit((prev) => {
      if (input.id && prev.encounters.some((e) => e.id === input.id)) {
        saved = { ...input, id: input.id };
        return { ...prev, encounters: prev.encounters.map((e) => (e.id === input.id ? saved! : e)) };
      }
      saved = { ...input, id: nextSerial('ENC-', prev.encounters.map((e) => e.id)) };
      return { ...prev, encounters: [saved, ...prev.encounters] };
    });
    return saved!;
  };

  const setEncounterStatus: DentalApi['setEncounterStatus'] = (id, status) => {
    const current = state.encounters.find((e) => e.id === id);
    if (!current) return { ok: false, message: 'Encounter not found.' };
    if (status === 'Completed') {
      if (!current.patientId) return { ok: false, message: 'Select a patient before completing the consultation.' };
      if (!current.chiefComplaint.trim()) return { ok: false, message: 'Chief complaint is required before completing the consultation.' };
      if (!current.diagnosis.trim()) return { ok: false, message: 'A diagnosis is required before completing the consultation.' };
    }
    commit((prev) => ({
      ...prev,
      encounters: prev.encounters.map((e) => (e.id === id ? { ...e, status } : e)),
    }));
    return { ok: true, value: { ...current, status } };
  };

  const savePlan: DentalApi['savePlan'] = (input) => {
    let saved: TreatmentPlan | null = null;
    commit((prev) => {
      if (input.id && prev.plans.some((p) => p.id === input.id)) {
        const existing = prev.plans.find((p) => p.id === input.id)!;
        saved = { ...existing, ...input, id: input.id, items: input.items ?? existing.items };
        return { ...prev, plans: prev.plans.map((p) => (p.id === input.id ? saved! : p)) };
      }
      saved = {
        id: nextSerial('PLN-', prev.plans.map((p) => p.id)),
        patientId: input.patientId,
        title: input.title,
        createdAt: today,
        dentist: input.dentist,
        status: input.status,
        consentStatus: input.consentStatus,
        nextSessionDate: input.nextSessionDate,
        items: input.items ?? [],
      };
      return { ...prev, plans: [saved, ...prev.plans] };
    });
    return saved!;
  };

  const addPlanItem: DentalApi['addPlanItem'] = (planId, item) => {
    const id = nextSerial('ITM-', state.plans.flatMap((p) => p.items.map((i) => i.id)));
    commit((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => p.id === planId ? { ...p, status: 'Open', items: [...p.items, { ...item, id }] } : p),
    }));
  };

  const updatePlanItem: DentalApi['updatePlanItem'] = (planId, itemId, patch) => {
    commit((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => {
        if (p.id !== planId) return p;
        const items = p.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item));
        const allDone = items.length > 0 && items.every((item) => item.status === 'Completed' || item.status === 'Cancelled');
        return { ...p, items, status: allDone ? 'Completed' : p.status === 'Completed' ? 'Open' : p.status };
      }),
    }));
  };

  const removePlanItem: DentalApi['removePlanItem'] = (planId, itemId) => {
    commit((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => p.id === planId ? { ...p, items: p.items.filter((item) => item.id !== itemId) } : p),
    }));
  };

  const setPlanConsent: DentalApi['setPlanConsent'] = (planId, consent) => {
    commit((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => p.id === planId ? {
        ...p,
        consentStatus: consent,
        items: p.items.map((item) => item.consent === 'Pending' && consent !== 'Pending' ? { ...item, consent, status: consent === 'Given' && item.status === 'Awaiting Patient Consent' ? 'Approved' : item.status } : item),
      } : p),
    }));
  };

  const saveProcedure: DentalApi['saveProcedure'] = (input) => {
    if (!input.patientId || !input.procedure.trim() || !input.date) {
      return { ok: false, message: 'Patient, procedure, and date are required.' };
    }
    let saved: DentalProcedure | null = null;
    commit((prev) => {
      const id = input.id && prev.procedures.some((p) => p.id === input.id)
        ? input.id
        : nextSerial('PRC-', prev.procedures.map((p) => p.id));
      saved = { ...input, id };
      const procedures = prev.procedures.some((p) => p.id === id)
        ? prev.procedures.map((p) => (p.id === id ? saved! : p))
        : [saved, ...prev.procedures];
      let plans = prev.plans;
      if (saved.status === 'Completed' && saved.planId && saved.planItemId) {
        plans = plans.map((plan) => {
          if (plan.id !== saved!.planId) return plan;
          const items = plan.items.map((item) => item.id === saved!.planItemId ? { ...item, status: 'Completed' as PlanItemStatus } : item);
          const allDone = items.every((item) => item.status === 'Completed' || item.status === 'Cancelled');
          return { ...plan, items, status: allDone ? 'Completed' as const : plan.status };
        });
      }
      return { ...prev, procedures, plans };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not record the procedure.' };
  };

  const savePrescription: DentalApi['savePrescription'] = (input) => {
    if (!input.patientId) return { ok: false, message: 'Select a patient.' };
    if (input.medications.length === 0) return { ok: false, message: 'Add at least one medication.' };
    const missing = input.medications.find((m) => !m.name.trim() || !m.dosage.trim() || !m.frequency.trim() || !m.duration.trim());
    if (missing) return { ok: false, message: 'Each medication needs a name, dosage, frequency, and duration.' };
    const patient = state.patients.find((p) => p.id === input.patientId);
    const warnings = input.medications
      .map((m) => allergyWarning(patient?.drugAllergies ?? '', m.name))
      .filter(Boolean);
    if (warnings.length > 0 && !input.allergyAcknowledged) {
      return { ok: false, message: 'An allergy warning is present. Review it and confirm before saving.' };
    }
    let saved: DentalPrescription | null = null;
    commit((prev) => {
      const id = input.id && prev.prescriptions.some((p) => p.id === input.id)
        ? input.id
        : nextSerial('RX-', prev.prescriptions.map((p) => p.id));
      saved = { ...input, id };
      const prescriptions = prev.prescriptions.some((p) => p.id === id)
        ? prev.prescriptions.map((p) => (p.id === id ? saved! : p))
        : [saved, ...prev.prescriptions];
      return { ...prev, prescriptions };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the prescription.' };
  };

  const saveInvestigation: DentalApi['saveInvestigation'] = (input) => {
    let saved: DentalInvestigation | null = null;
    commit((prev) => {
      const id = input.id && prev.investigations.some((i) => i.id === input.id)
        ? input.id
        : nextSerial('INV-', prev.investigations.map((i) => i.id));
      saved = { ...input, id };
      const investigations = prev.investigations.some((i) => i.id === id)
        ? prev.investigations.map((i) => (i.id === id ? saved! : i))
        : [saved, ...prev.investigations];
      return { ...prev, investigations };
    });
    return saved!;
  };

  const saveReferral: DentalApi['saveReferral'] = (input) => {
    let saved: DentalReferral | null = null;
    commit((prev) => {
      const id = input.id && prev.referrals.some((r) => r.id === input.id)
        ? input.id
        : nextSerial('REF-', prev.referrals.map((r) => r.id));
      saved = { ...input, id };
      const referrals = prev.referrals.some((r) => r.id === id)
        ? prev.referrals.map((r) => (r.id === id ? saved! : r))
        : [saved, ...prev.referrals];
      return { ...prev, referrals };
    });
    return saved!;
  };

  const saveFollowUp: DentalApi['saveFollowUp'] = (input) => {
    let saved: DentalFollowUp | null = null;
    commit((prev) => {
      const id = input.id && prev.followUps.some((f) => f.id === input.id)
        ? input.id
        : nextSerial('FU-', prev.followUps.map((f) => f.id));
      saved = { ...input, id };
      const followUps = prev.followUps.some((f) => f.id === id)
        ? prev.followUps.map((f) => (f.id === id ? saved! : f))
        : [saved, ...prev.followUps];
      return { ...prev, followUps };
    });
    return saved!;
  };

  const saveService: DentalApi['saveService'] = (input) => {
    let saved: DentalService | null = null;
    commit((prev) => {
      const id = input.id && prev.services.some((s) => s.id === input.id)
        ? input.id
        : nextSerial('SRV-', prev.services.map((s) => s.id));
      saved = { ...input, id };
      const services = prev.services.some((s) => s.id === id)
        ? prev.services.map((s) => (s.id === id ? saved! : s))
        : [...prev.services, saved];
      return { ...prev, services };
    });
    return saved!;
  };

  const adjustStock: DentalApi['adjustStock'] = (id, quantity) => {
    const item = state.inventory.find((i) => i.id === id);
    if (!item) return { ok: false, message: 'Item not found.' };
    if (quantity < 0) return { ok: false, message: 'Quantity cannot be negative.' };
    const next = { ...item, quantity };
    commit((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) => (i.id === id ? next : i)),
    }));
    return { ok: true, value: next };
  };

  const addDocument: DentalApi['addDocument'] = (patientId, name, kind, note) => {
    commit((prev) => ({
      ...prev,
      documents: [{
        id: nextSerial('DOC-', prev.documents.map((d) => d.id)),
        patientId,
        name,
        kind,
        date: today,
        note,
      }, ...prev.documents],
    }));
  };

  const stats = useMemo<DashboardStats>(() => {
    const todayAppts = state.appointments.filter((a) => a.date === today && a.status !== 'Cancelled');
    const yesterday = isoDate(-1);
    const seen = new Set(
      state.appointments.filter((a) => a.date === today && a.status === 'Completed').map((a) => a.patientId),
    );
    state.encounters.filter((e) => e.date === today && e.status === 'Completed').forEach((e) => seen.add(e.patientId));
    return {
      todayAppointments: todayAppts.length,
      waiting: state.appointments.filter((a) => a.date === today && (a.status === 'Waiting' || a.status === 'Checked In')).length,
      seenToday: seen.size,
      completedProcedures: state.procedures.filter((p) => p.date === today && p.status === 'Completed').length,
      pendingPlans: state.plans.reduce((sum, plan) => sum + openPlanItems(plan).length, 0),
      followUpsDue: state.followUps.filter((f) => {
        const status = followUpDisplayStatus(f, today);
        return status === 'Overdue' || (status === 'Upcoming' && f.dueDate <= today);
      }).length,
      yesterdayAppointments: state.appointments.filter((a) => a.date === yesterday && a.status !== 'Cancelled').length,
    };
  }, [state, today]);

  const api: DentalApi = {
    state,
    today,
    stats,
    resetDemoData,
    registerPatient,
    updateChair,
    saveAppointment,
    setAppointmentStatus,
    ensureChart,
    setDentition,
    addFinding,
    updateFinding,
    removeFinding,
    saveEncounter,
    setEncounterStatus,
    savePlan,
    addPlanItem,
    updatePlanItem,
    removePlanItem,
    setPlanConsent,
    saveProcedure,
    savePrescription,
    saveInvestigation,
    saveReferral,
    saveFollowUp,
    saveService,
    adjustStock,
    addDocument,
    patientById: (id) => state.patients.find((p) => p.id === id),
    nameOf: (patientId) => {
      const p = state.patients.find((row) => row.id === patientId);
      return p ? patientName(p) : patientId;
    },
    warningsFor: (patientId, medicationName) => {
      const p = state.patients.find((row) => row.id === patientId);
      return allergyWarning(p?.drugAllergies ?? '', medicationName);
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useDental(): DentalApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDental must be used within DentalProvider');
  return ctx;
}

export type { RxMedication };
