import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  STORAGE_KEY,
  allergyWarning,
  buildEyeSeed,
  canGenerateSpectacle,
  followUpDisplayStatus,
  isoDate,
  latestAcuity,
  nextSerial,
  patientName,
  primaryDiagnosis,
  stockStatus,
  syncPatientDates,
  timesOverlap,
  validateEyeRefraction,
  type AppointmentStatus,
  type ContactLensRecord,
  type EducationNote,
  type EyeAppointment,
  type EyeDiagnosis,
  type EyeEncounter,
  type EyeExam,
  type EyeFollowUp,
  type EyeInvestigation,
  type EyePatient,
  type EyePrescription,
  type EyeProcedure,
  type EyeReferral,
  type EyeRoom,
  type EyeState,
  type EquipmentStatus,
  type PlanItemStatus,
  type Refraction,
  type RoomStatus,
  type SpectacleRx,
  type TreatmentItem,
  type TreatmentPlan,
  type VisualAcuity,
} from '@/data/eyeData';

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

export interface EyeStats {
  todayAppointments: number;
  waiting: number;
  inConsultation: number;
  seenToday: number;
  pendingInvestigations: number;
  followUpsDue: number;
}

interface EyeApi {
  state: EyeState;
  today: string;
  stats: EyeStats;
  resetDemoData: () => void;
  registerPatient: (input: Omit<EyePatient, 'id' | 'createdAt' | 'status' | 'lastVisit' | 'nextAppointment'> & { status?: EyePatient['status'] }) => Result<EyePatient>;
  setRoomStatus: (id: string, status: RoomStatus, clinician?: string) => void;
  setEquipmentStatus: (id: string, status: EquipmentStatus) => void;
  saveAppointment: (input: Omit<EyeAppointment, 'id'> & { id?: string }) => Result<EyeAppointment>;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  saveAcuity: (input: Omit<VisualAcuity, 'id'> & { id?: string }) => Result<VisualAcuity>;
  saveRefraction: (input: Omit<Refraction, 'id'> & { id?: string }) => Result<Refraction>;
  saveExam: (input: Omit<EyeExam, 'id'> & { id?: string }) => EyeExam;
  saveEncounter: (input: Omit<EyeEncounter, 'id'> & { id?: string }) => EyeEncounter;
  saveDiagnosis: (input: Omit<EyeDiagnosis, 'id'> & { id?: string }) => EyeDiagnosis;
  removeDiagnosis: (id: string) => void;
  saveInvestigation: (input: Omit<EyeInvestigation, 'id'> & { id?: string }) => EyeInvestigation;
  savePrescription: (input: Omit<EyePrescription, 'id'> & { id?: string }) => Result<EyePrescription>;
  saveSpectacle: (input: Omit<SpectacleRx, 'id'> & { id?: string }) => Result<SpectacleRx>;
  spectacleFromRefraction: (refractionId: string) => Result<SpectacleRx>;
  saveContactLens: (input: Omit<ContactLensRecord, 'id'> & { id?: string }) => ContactLensRecord;
  savePlan: (input: Omit<TreatmentPlan, 'id' | 'items' | 'createdAt'> & { id?: string; items?: TreatmentItem[] }) => TreatmentPlan;
  addPlanItem: (planId: string, item: Omit<TreatmentItem, 'id'>) => void;
  updatePlanItem: (planId: string, itemId: string, patch: Partial<TreatmentItem>) => Result<TreatmentItem>;
  removePlanItem: (planId: string, itemId: string) => void;
  saveProcedure: (input: Omit<EyeProcedure, 'id'> & { id?: string }) => Result<EyeProcedure>;
  saveReferral: (input: Omit<EyeReferral, 'id'> & { id?: string }) => EyeReferral;
  saveFollowUp: (input: Omit<EyeFollowUp, 'id'> & { id?: string }) => EyeFollowUp;
  saveEducation: (input: Omit<EducationNote, 'id'> & { id?: string }) => EducationNote;
  adjustStock: (id: string, quantity: number) => Result<EyeState['inventory'][number]>;
  addDocument: (patientId: string, name: string, kind: string, note: string) => void;
  nameOf: (patientId: string) => string;
  warningsFor: (patientId: string, medicationName: string) => string;
  latestAcuityFor: (patientId: string) => VisualAcuity | undefined;
  primaryDx: (patientId: string) => string;
}

const Ctx = createContext<EyeApi | null>(null);

function loadState(): EyeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EyeState;
      if (parsed?.patients?.length && Array.isArray(parsed.appointments)) return parsed;
    }
  } catch { /* seed */ }
  const seed = buildEyeSeed();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

function activeAppt(status: AppointmentStatus) {
  return status !== 'Cancelled' && status !== 'No Show';
}

export function EyeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EyeState>(() => loadState());
  const today = useMemo(() => isoDate(0), []);

  const commit = useCallback((updater: (prev: EyeState) => EyeState) => {
    setState((prev) => {
      const next = syncPatientDates(updater(prev), isoDate(0));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const seed = buildEyeSeed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
    setState(seed);
  }, []);

  const registerPatient: EyeApi['registerPatient'] = (input) => {
    const phone = input.phone.replace(/\s+/g, '');
    const nameKey = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
    const duplicate = state.patients.find((p) => {
      const same = p.phone.replace(/\s+/g, '') === phone && patientName(p).toLowerCase() === nameKey;
      const hospital = input.hospitalId.trim() && p.hospitalId.toLowerCase() === input.hospitalId.trim().toLowerCase();
      return same || hospital;
    });
    if (duplicate) return { ok: false, message: `An eye clinic record already exists for ${patientName(duplicate)} (${duplicate.id}).` };
    const patient: EyePatient = { ...input, id: nextSerial('EYE-P-', state.patients.map((p) => p.id)), status: input.status ?? 'Active', lastVisit: '', nextAppointment: '', createdAt: today, phone, hospitalId: input.hospitalId.trim() };
    commit((prev) => ({ ...prev, patients: [patient, ...prev.patients] }));
    return { ok: true, value: patient };
  };

  const setRoomStatus: EyeApi['setRoomStatus'] = (id, status, clinician) => {
    commit((prev) => ({ ...prev, rooms: prev.rooms.map((room) => room.id === id ? { ...room, status, clinician: clinician ?? room.clinician } : room) }));
  };

  const setEquipmentStatus: EyeApi['setEquipmentStatus'] = (id, status) => {
    commit((prev) => ({ ...prev, equipment: prev.equipment.map((item) => item.id === id ? { ...item, status } : item) }));
  };

  const saveAppointment: EyeApi['saveAppointment'] = (input) => {
    if (!input.patientId || !input.date || !input.startTime || !input.endTime) return { ok: false, message: 'Patient, date, start, and end time are required.' };
    if (input.endTime <= input.startTime) return { ok: false, message: 'End time must be after the start time.' };
    const clash = state.appointments.find((a) => {
      if (input.id && a.id === input.id) return false;
      if (!activeAppt(a.status) || !activeAppt(input.status) || a.date !== input.date) return false;
      if (!timesOverlap(a.startTime, a.endTime, input.startTime, input.endTime)) return false;
      return a.clinician === input.clinician || a.roomId === input.roomId;
    });
    if (clash) return { ok: false, message: `That time overlaps another booking (${clash.startTime}–${clash.endTime}).` };
    let saved: EyeAppointment | null = null;
    commit((prev) => {
      const id = input.id && prev.appointments.some((a) => a.id === input.id) ? input.id : nextSerial('EAP-', prev.appointments.map((a) => a.id));
      saved = { ...input, id };
      const appointments = prev.appointments.some((a) => a.id === id) ? prev.appointments.map((a) => a.id === id ? saved! : a) : [...prev.appointments, saved];
      return { ...prev, appointments };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the appointment.' };
  };

  const setAppointmentStatus: EyeApi['setAppointmentStatus'] = (id, status) => {
    commit((prev) => ({ ...prev, appointments: prev.appointments.map((a) => a.id === id ? { ...a, status } : a) }));
  };

  const saveAcuity: EyeApi['saveAcuity'] = (input) => {
    if (!input.patientId || !input.date || !input.clinician) return { ok: false, message: 'Patient, date, and clinician are required.' };
    const hasValue = [input.od, input.os, input.ou].some((eye) => Object.values(eye).some(Boolean));
    if (input.status === 'Saved' && !hasValue) return { ok: false, message: 'Enter at least one acuity value before saving.' };
    let saved: VisualAcuity | null = null;
    commit((prev) => {
      const id = input.id && prev.acuity.some((a) => a.id === input.id) ? input.id : nextSerial('VAC-', prev.acuity.map((a) => a.id));
      saved = { ...input, id };
      const acuity = prev.acuity.some((a) => a.id === id) ? prev.acuity.map((a) => a.id === id ? saved! : a) : [saved, ...prev.acuity];
      return { ...prev, acuity };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save acuity.' };
  };

  const saveRefraction: EyeApi['saveRefraction'] = (input) => {
    if (!input.patientId || !input.date) return { ok: false, message: 'Patient and date are required.' };
    const odError = validateEyeRefraction(input.od, 'OD');
    const osError = validateEyeRefraction(input.os, 'OS');
    if (odError || osError) return { ok: false, message: odError || osError };
    let saved: Refraction | null = null;
    commit((prev) => {
      const id = input.id && prev.refractions.some((r) => r.id === input.id) ? input.id : nextSerial('REF-', prev.refractions.map((r) => r.id));
      saved = { ...input, id };
      const refractions = prev.refractions.some((r) => r.id === id) ? prev.refractions.map((r) => r.id === id ? saved! : r) : [saved, ...prev.refractions];
      return { ...prev, refractions };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save refraction.' };
  };

  const saveExam: EyeApi['saveExam'] = (input) => {
    let saved: EyeExam | null = null;
    commit((prev) => {
      const id = input.id && prev.exams.some((e) => e.id === input.id) ? input.id : nextSerial('EXM-', prev.exams.map((e) => e.id));
      saved = { ...input, id };
      const exams = prev.exams.some((e) => e.id === id) ? prev.exams.map((e) => e.id === id ? saved! : e) : [saved, ...prev.exams];
      return { ...prev, exams };
    });
    return saved!;
  };

  const saveEncounter: EyeApi['saveEncounter'] = (input) => {
    let saved: EyeEncounter | null = null;
    commit((prev) => {
      const id = input.id && prev.encounters.some((e) => e.id === input.id) ? input.id : nextSerial('EEN-', prev.encounters.map((e) => e.id));
      saved = { ...input, id };
      const encounters = prev.encounters.some((e) => e.id === id) ? prev.encounters.map((e) => e.id === id ? saved! : e) : [saved, ...prev.encounters];
      return { ...prev, encounters };
    });
    return saved!;
  };

  const saveDiagnosis: EyeApi['saveDiagnosis'] = (input) => {
    let saved: EyeDiagnosis | null = null;
    commit((prev) => {
      const id = input.id && prev.diagnoses.some((d) => d.id === input.id) ? input.id : nextSerial('DGX-', prev.diagnoses.map((d) => d.id));
      saved = { ...input, id };
      const diagnoses = prev.diagnoses.some((d) => d.id === id) ? prev.diagnoses.map((d) => d.id === id ? saved! : d) : [saved, ...prev.diagnoses];
      return { ...prev, diagnoses };
    });
    return saved!;
  };

  const removeDiagnosis: EyeApi['removeDiagnosis'] = (id) => {
    commit((prev) => ({ ...prev, diagnoses: prev.diagnoses.filter((d) => d.id !== id) }));
  };

  const saveInvestigation: EyeApi['saveInvestigation'] = (input) => {
    let saved: EyeInvestigation | null = null;
    commit((prev) => {
      const id = input.id && prev.investigations.some((i) => i.id === input.id) ? input.id : nextSerial('EIN-', prev.investigations.map((i) => i.id));
      saved = { ...input, id };
      const investigations = prev.investigations.some((i) => i.id === id) ? prev.investigations.map((i) => i.id === id ? saved! : i) : [saved, ...prev.investigations];
      return { ...prev, investigations };
    });
    return saved!;
  };

  const savePrescription: EyeApi['savePrescription'] = (input) => {
    if (!input.patientId) return { ok: false, message: 'Select a patient.' };
    if (!input.items.length) return { ok: false, message: 'Add at least one medication.' };
    const missing = input.items.find((item) => !item.name.trim() || !item.dosage.trim() || !item.frequency.trim());
    if (missing) return { ok: false, message: 'Each medication needs a name, dosage, and frequency.' };
    const patient = state.patients.find((p) => p.id === input.patientId);
    const warnings = input.items.map((item) => allergyWarning(patient?.drugAllergies ?? '', item.name)).filter(Boolean);
    if (warnings.length && !input.allergyAcknowledged) return { ok: false, message: 'Review the allergy warning and confirm before saving.' };
    let saved: EyePrescription | null = null;
    commit((prev) => {
      const id = input.id && prev.prescriptions.some((p) => p.id === input.id) ? input.id : nextSerial('ERX-', prev.prescriptions.map((p) => p.id));
      saved = { ...input, id };
      const prescriptions = prev.prescriptions.some((p) => p.id === id) ? prev.prescriptions.map((p) => p.id === id ? saved! : p) : [saved, ...prev.prescriptions];
      return { ...prev, prescriptions };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the prescription.' };
  };

  const saveSpectacle: EyeApi['saveSpectacle'] = (input) => {
    const odError = validateEyeRefraction(input.od, 'OD');
    const osError = validateEyeRefraction(input.os, 'OS');
    if (odError || osError) return { ok: false, message: odError || osError };
    if (input.status === 'Final' && !input.od.sphere.trim() && !input.os.sphere.trim()) {
      return { ok: false, message: 'A final spectacle prescription needs a sphere for at least one eye.' };
    }
    let saved: SpectacleRx | null = null;
    commit((prev) => {
      const id = input.id && prev.spectacles.some((s) => s.id === input.id) ? input.id : nextSerial('SPX-', prev.spectacles.map((s) => s.id));
      saved = { ...input, id };
      const spectacles = prev.spectacles.some((s) => s.id === id) ? prev.spectacles.map((s) => s.id === id ? saved! : s) : [saved, ...prev.spectacles];
      return { ...prev, spectacles };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not save the spectacle prescription.' };
  };

  const spectacleFromRefraction: EyeApi['spectacleFromRefraction'] = (refractionId) => {
    const ref = state.refractions.find((row) => row.id === refractionId);
    if (!ref) return { ok: false, message: 'Refraction not found.' };
    const message = canGenerateSpectacle(ref);
    if (message) return { ok: false, message };
    const copy = (eye: Refraction['od']) => eye.sphere.trim() ? { ...eye } : { sphere: '', cylinder: '', axis: '', prism: '', base: '', add: '', distanceAcuity: '', nearAcuity: '', bestCorrected: '' };
    return saveSpectacle({
      patientId: ref.patientId, refractionId: ref.id, date: today, clinician: ref.clinician, reviewDate: isoDate(365),
      distanceOrNear: 'Both', pd: ref.pd, lensType: 'Single vision', material: '', coating: '',
      notes: `Copied from saved ${ref.type.toLowerCase()} ${ref.id}. Empty eyes were not filled in.`,
      instructions: 'Demonstration prescription. Not legally authorised. Verify before any dispensing.',
      od: copy(ref.od), os: copy(ref.os), status: 'Draft',
    });
  };

  const saveContactLens: EyeApi['saveContactLens'] = (input) => {
    let saved: ContactLensRecord | null = null;
    commit((prev) => {
      const id = input.id && prev.contactLenses.some((c) => c.id === input.id) ? input.id : nextSerial('CTL-', prev.contactLenses.map((c) => c.id));
      saved = { ...input, id };
      const contactLenses = prev.contactLenses.some((c) => c.id === id) ? prev.contactLenses.map((c) => c.id === id ? saved! : c) : [saved, ...prev.contactLenses];
      return { ...prev, contactLenses };
    });
    return saved!;
  };

  const savePlan: EyeApi['savePlan'] = (input) => {
    let saved: TreatmentPlan | null = null;
    commit((prev) => {
      if (input.id && prev.plans.some((p) => p.id === input.id)) {
        const existing = prev.plans.find((p) => p.id === input.id)!;
        saved = { ...existing, ...input, id: input.id, items: input.items ?? existing.items };
        return { ...prev, plans: prev.plans.map((p) => p.id === input.id ? saved! : p) };
      }
      saved = { id: nextSerial('EPL-', prev.plans.map((p) => p.id)), patientId: input.patientId, title: input.title, createdAt: today, clinician: input.clinician, status: input.status, items: input.items ?? [] };
      return { ...prev, plans: [saved, ...prev.plans] };
    });
    return saved!;
  };

  const addPlanItem: EyeApi['addPlanItem'] = (planId, item) => {
    const id = nextSerial('ETI-', state.plans.flatMap((p) => p.items.map((i) => i.id)));
    commit((prev) => ({ ...prev, plans: prev.plans.map((p) => p.id === planId ? { ...p, items: [...p.items, { ...item, id }] } : p) }));
  };

  const updatePlanItem: EyeApi['updatePlanItem'] = (planId, itemId, patch) => {
    if (patch.status === 'Completed') {
      const plan = state.plans.find((p) => p.id === planId);
      const item = plan?.items.find((row) => row.id === itemId);
      const linked = item?.procedureId || state.procedures.some((proc) => proc.planItemId === itemId && proc.status === 'Completed');
      if (!linked) return { ok: false, message: 'Record a completed procedure before marking this treatment item completed.' };
    }
    commit((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => p.id !== planId ? p : { ...p, items: p.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) }),
    }));
    const item = state.plans.find((p) => p.id === planId)?.items.find((row) => row.id === itemId);
    return item ? { ok: true, value: { ...item, ...patch } } : { ok: false, message: 'Item not found.' };
  };

  const removePlanItem: EyeApi['removePlanItem'] = (planId, itemId) => {
    commit((prev) => ({ ...prev, plans: prev.plans.map((p) => p.id === planId ? { ...p, items: p.items.filter((item) => item.id !== itemId) } : p) }));
  };

  const saveProcedure: EyeApi['saveProcedure'] = (input) => {
    if (!input.patientId || !input.name.trim() || !input.date) return { ok: false, message: 'Patient, procedure, and date are required.' };
    let saved: EyeProcedure | null = null;
    commit((prev) => {
      const id = input.id && prev.procedures.some((p) => p.id === input.id) ? input.id : nextSerial('EPR-', prev.procedures.map((p) => p.id));
      saved = { ...input, id };
      const procedures = prev.procedures.some((p) => p.id === id) ? prev.procedures.map((p) => p.id === id ? saved! : p) : [saved, ...prev.procedures];
      let plans = prev.plans;
      if (saved.status === 'Completed' && saved.planId && saved.planItemId) {
        plans = plans.map((plan) => plan.id !== saved!.planId ? plan : {
          ...plan,
          items: plan.items.map((item) => item.id === saved!.planItemId ? { ...item, status: 'Completed' as PlanItemStatus, procedureId: saved!.id } : item),
        });
      }
      return { ...prev, procedures, plans };
    });
    return saved ? { ok: true, value: saved } : { ok: false, message: 'Could not record the procedure.' };
  };

  const saveReferral: EyeApi['saveReferral'] = (input) => {
    let saved: EyeReferral | null = null;
    commit((prev) => {
      const id = input.id && prev.referrals.some((r) => r.id === input.id) ? input.id : nextSerial('ERF-', prev.referrals.map((r) => r.id));
      saved = { ...input, id };
      const referrals = prev.referrals.some((r) => r.id === id) ? prev.referrals.map((r) => r.id === id ? saved! : r) : [saved, ...prev.referrals];
      return { ...prev, referrals };
    });
    return saved!;
  };

  const saveFollowUp: EyeApi['saveFollowUp'] = (input) => {
    let saved: EyeFollowUp | null = null;
    commit((prev) => {
      const id = input.id && prev.followUps.some((f) => f.id === input.id) ? input.id : nextSerial('EFU-', prev.followUps.map((f) => f.id));
      saved = { ...input, id };
      const followUps = prev.followUps.some((f) => f.id === id) ? prev.followUps.map((f) => f.id === id ? saved! : f) : [saved, ...prev.followUps];
      return { ...prev, followUps };
    });
    return saved!;
  };

  const saveEducation: EyeApi['saveEducation'] = (input) => {
    let saved: EducationNote | null = null;
    commit((prev) => {
      const id = input.id && prev.education.some((e) => e.id === input.id) ? input.id : nextSerial('EDU-', prev.education.map((e) => e.id));
      saved = { ...input, id };
      const education = prev.education.some((e) => e.id === id) ? prev.education.map((e) => e.id === id ? saved! : e) : [saved, ...prev.education];
      return { ...prev, education };
    });
    return saved!;
  };

  const adjustStock: EyeApi['adjustStock'] = (id, quantity) => {
    const item = state.inventory.find((row) => row.id === id);
    if (!item) return { ok: false, message: 'Item not found.' };
    if (quantity < 0) return { ok: false, message: 'Quantity cannot be negative.' };
    const next = { ...item, quantity };
    commit((prev) => ({ ...prev, inventory: prev.inventory.map((row) => row.id === id ? next : row) }));
    return { ok: true, value: next };
  };

  const addDocument: EyeApi['addDocument'] = (patientId, name, kind, note) => {
    commit((prev) => ({
      ...prev,
      documents: [{ id: nextSerial('EDC-', prev.documents.map((d) => d.id)), patientId, name, kind, date: today, note }, ...prev.documents],
    }));
  };

  const stats = useMemo<EyeStats>(() => {
    const seen = new Set(state.appointments.filter((a) => a.date === today && a.status === 'Completed').map((a) => a.patientId));
    state.encounters.filter((e) => e.date === today && e.status === 'Completed').forEach((e) => seen.add(e.patientId));
    return {
      todayAppointments: state.appointments.filter((a) => a.date === today && a.status !== 'Cancelled').length,
      waiting: state.appointments.filter((a) => a.date === today && (a.status === 'Waiting' || a.status === 'Checked In')).length,
      inConsultation: state.appointments.filter((a) => a.date === today && a.status === 'In Consultation').length,
      seenToday: seen.size,
      pendingInvestigations: state.investigations.filter((i) => i.status === 'Requested' || i.status === 'Scheduled' || i.status === 'In Progress').length,
      followUpsDue: state.followUps.filter((f) => {
        const status = followUpDisplayStatus(f, today);
        return status === 'Overdue' || (status === 'Upcoming' && f.dueDate <= today);
      }).length,
    };
  }, [state, today]);

  const api: EyeApi = {
    state, today, stats, resetDemoData, registerPatient, setRoomStatus, setEquipmentStatus, saveAppointment, setAppointmentStatus,
    saveAcuity, saveRefraction, saveExam, saveEncounter, saveDiagnosis, removeDiagnosis, saveInvestigation, savePrescription,
    saveSpectacle, spectacleFromRefraction, saveContactLens, savePlan, addPlanItem, updatePlanItem, removePlanItem, saveProcedure,
    saveReferral, saveFollowUp, saveEducation, adjustStock, addDocument,
    nameOf: (patientId) => {
      const p = state.patients.find((row) => row.id === patientId);
      return p ? patientName(p) : patientId;
    },
    warningsFor: (patientId, medicationName) => allergyWarning(state.patients.find((p) => p.id === patientId)?.drugAllergies ?? '', medicationName),
    latestAcuityFor: (patientId) => latestAcuity(state.acuity, patientId),
    primaryDx: (patientId) => primaryDiagnosis(state.diagnoses, patientId),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useEye(): EyeApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEye must be used within EyeProvider');
  return ctx;
}

export type { EyeRoom };
