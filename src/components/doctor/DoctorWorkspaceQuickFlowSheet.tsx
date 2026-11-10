import { DocPrescriptions } from '@/pages/DoctorPrescriptionEngine';
import { DocLab } from '@/pages/DoctorLabRequestEngine';
import { DocImaging } from '@/pages/DoctorImagingRequestEngine';
import { DocAdmission } from '@/pages/DoctorAdmissionRequestEngine';
import { DocReferrals } from '@/pages/DoctorReferralWorkflowEngine';
import { DocTransfers } from '@/pages/DoctorPatientTransferEngine';
import { DocDiagnosis } from '@/pages/DoctorDiagnosisEngine';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { setDocPatientContext, type DocPatientContext } from '@/utils/docClinicalPatientContext';

const base = '/dashboard/doctor/clinical';

export type WorkspaceQuickAction =
  | 'Diagnosis'
  | 'Prescription'
  | 'Lab Request'
  | 'Imaging Request'
  | 'Admission'
  | 'Referral'
  | 'Transfer';

const FLOW_META: Record<
  WorkspaceQuickAction,
  { path: string; title: string; subtitle: string; Component: React.ComponentType<import('@/components/doctor/ClinicalEmbeddedFrame').ClinicalEmbeddedProps> }
> = {
  Diagnosis: {
    path: '/diagnosis',
    title: 'Diagnosis Engine',
    subtitle: 'ICD-11 / DSM coding, problem list & clinical certainty',
    Component: DocDiagnosis,
  },
  Prescription: {
    path: '/prescriptions',
    title: 'Prescription Engine',
    subtitle: 'Formulary search, safety checks & send to pharmacy',
    Component: DocPrescriptions,
  },
  'Lab Request': {
    path: '/lab',
    title: 'Lab Request Engine',
    subtitle: 'Test catalog, clinical indication & send to laboratory',
    Component: DocLab,
  },
  'Imaging Request': {
    path: '/imaging',
    title: 'Imaging Request Engine',
    subtitle: 'Modality selection, indication & radiology submission',
    Component: DocImaging,
  },
  Admission: {
    path: '/admission',
    title: 'Admission Request Engine',
    subtitle: 'Ward selection, clinical summary & bed request',
    Component: DocAdmission,
  },
  Referral: {
    path: '/referrals',
    title: 'Referral Workflow',
    subtitle: 'Internal / external referrals with tracking',
    Component: DocReferrals,
  },
  Transfer: {
    path: '/transfers',
    title: 'Patient Transfer Engine',
    subtitle: 'Inter-ward / clinic transfer with handover',
    Component: DocTransfers,
  },
};

type Props = {
  action: WorkspaceQuickAction | null;
  patientContext: DocPatientContext | null;
  onClose: () => void;
  onOpenFull: (path: string, ctx: DocPatientContext) => void;
};

export function DoctorWorkspaceQuickFlowSheet({ action, patientContext, onClose, onOpenFull }: Props) {
  if (!action || !patientContext) return null;
  const meta = FLOW_META[action];
  const { Component } = meta;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[min(1280px,98vw)] p-0 gap-0 overflow-hidden">
        <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background">
          <Component
            embedded
            patientContext={patientContext}
            onClose={onClose}
            onOpenFull={() => {
              setDocPatientContext(patientContext);
              onOpenFull(`${base}${meta.path}`, patientContext);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
