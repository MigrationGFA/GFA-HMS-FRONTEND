import type { ReactNode } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { doctorClinicalNav } from '@/pages/DoctorClinicalCenter';
import type { DocPatientContext } from '@/utils/docClinicalPatientContext';
import { ExternalLink, X } from 'lucide-react';

export type ClinicalEmbeddedProps = {
  embedded?: boolean;
  patientContext?: DocPatientContext;
  onClose?: () => void;
  onOpenFull?: () => void;
};

export function ClinicalEmbeddedFrame({
  embedded,
  title,
  subtitle,
  patientContext,
  onClose,
  onOpenFull,
  children,
}: ClinicalEmbeddedProps & {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!embedded) return <>{children}</>;
  return (
    <div className="min-h-0">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-bold truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {patientContext && (
            <p className="text-sm font-medium mt-0.5 truncate">
              {patientContext.name} · {patientContext.hospitalId}
              {patientContext.clinic ? ` · ${patientContext.clinic}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {onOpenFull && (
            <Button size="sm" variant="outline" onClick={onOpenFull}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open full page
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-3.5 w-3.5 mr-1" /> Close
            </Button>
          )}
        </div>
      </div>
      <div className="p-4 md:p-6">{children}</div>
    </div>
  );
}

export function ClinicalPageShell({
  embedded,
  shellTitle,
  flowTitle,
  flowSubtitle,
  patientContext,
  onClose,
  onOpenFull,
  children,
}: ClinicalEmbeddedProps & {
  shellTitle: string;
  flowTitle: string;
  flowSubtitle?: string;
  children: ReactNode;
}) {
  const body = (
    <ClinicalEmbeddedFrame
      embedded={embedded}
      title={flowTitle}
      subtitle={flowSubtitle}
      patientContext={patientContext}
      onClose={onClose}
      onOpenFull={onOpenFull}
    >
      {children}
    </ClinicalEmbeddedFrame>
  );
  if (embedded) return body;
  return (
    <DashboardLayout navItems={doctorClinicalNav} title={shellTitle}>
      {children}
    </DashboardLayout>
  );
}
