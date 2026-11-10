import { useEffect } from 'react';
import { useApplyDocPatient, type DocPatientContext } from '@/utils/docClinicalPatientContext';
import type { ClinicalEmbeddedProps } from '@/components/doctor/ClinicalEmbeddedFrame';

/** Apply patient context from workspace sheet, or from session navigation when standalone. */
export function useClinicalEmbeddedInit(
  { embedded, patientContext }: ClinicalEmbeddedProps,
  apply: (ctx: DocPatientContext) => void,
) {
  useApplyDocPatient((ctx) => {
    if (embedded && patientContext) return;
    apply(ctx);
  });

  useEffect(() => {
    if (!embedded || !patientContext?.name) return;
    apply(patientContext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, patientContext?.id, patientContext?.hospitalId]);
}
