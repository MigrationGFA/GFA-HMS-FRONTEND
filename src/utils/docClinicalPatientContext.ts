import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export type DocPatientContext = {
  id: string;
  name: string;
  hospitalId: string;
  phone?: string;
  nin?: string;
  nhiaNo?: string;
  age?: number;
  gender?: string;
  clinic?: string;
  allergies?: string;
  diagnosis?: string;
  medications?: string;
  /** Optional note/encounter type when opening documentation */
  entryType?: string;
  noteType?: string;
  encounterId?: string;
  /** Start consultation immediately on workspace */
  autoStartConsult?: boolean;
  /** Open referral dialog pre-filled */
  openReferral?: boolean;
};

const STORAGE_KEY = 'gfa_doc_clinical_patient_v1';

export function setDocPatientContext(ctx: DocPatientContext) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch { /* noop */ }
}

export function getDocPatientContext(): DocPatientContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as DocPatientContext : null;
  } catch {
    return null;
  }
}

export function patientDisplayLabel(ctx: DocPatientContext) {
  return `${ctx.name} · ${ctx.hospitalId}`;
}

/** Match partial names in tables (e.g. "Tope A." vs "Tope Adeyemi") */
export function patientMatches(value: string, ctx: DocPatientContext) {
  const v = value.toLowerCase();
  const first = ctx.name.split(' ')[0]?.toLowerCase() ?? '';
  const lastInitial = ctx.name.split(' ')[1]?.[0]?.toLowerCase() ?? '';
  return (
    v.includes(ctx.name.toLowerCase()) ||
    v.includes(ctx.hospitalId.toLowerCase()) ||
    v.includes(ctx.id.toLowerCase()) ||
    (first && v.includes(first) && (lastInitial ? v.includes(`${first} ${lastInitial}`) || v.startsWith(first) : true))
  );
}

export function entryTypeToNoteType(entryType?: string): string | undefined {
  if (!entryType) return undefined;
  const map: Record<string, string> = {
    'Follow-up note': 'Follow-Up Note',
    'Consultation note': 'Consultation Note',
    'Psychiatric assessment': 'Psychiatric Assessment',
    'Ward round note': 'Ward Round Note',
    'Emergency note': 'Emergency Note',
    'Progress note': 'Progress Note',
    'Discharge draft': 'Discharge Draft',
    'Procedure note': 'Procedure Note',
    'SOAP note': 'SOAP Note',
    'Admission note': 'Admission Note',
  };
  return map[entryType] ?? entryType;
}

export function useDocClinicalPatient() {
  const location = useLocation();
  const ctx = useMemo(() => {
    const fromState = (location.state as { patient?: DocPatientContext } | null)?.patient
      ?? (location.state as DocPatientContext | null)?.name
        ? (location.state as DocPatientContext)
        : null;
    if (fromState?.name) {
      setDocPatientContext(fromState);
      return fromState;
    }
    return getDocPatientContext();
  }, [location.state]);

  return ctx;
}

/** Run once on mount when patient context is present */
export function useApplyDocPatient(onApply: (ctx: DocPatientContext) => void) {
  const ctx = useDocClinicalPatient();
  useEffect(() => {
    if (ctx?.name) onApply(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.id, ctx?.hospitalId]);
}
