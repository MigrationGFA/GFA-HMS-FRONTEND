import DashboardLayout from '@/components/DashboardLayout';
import { labCenterNav, labBase } from './labCenterNav';

export { labBase, labCenterNav };
/** @deprecated Prefer labCenterNav — alias kept for existing imports. */
export const labNav = labCenterNav;

export const LabShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <DashboardLayout navItems={labCenterNav} title={title}>{children}</DashboardLayout>
);

export const LabCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-card rounded-xl border shadow-sm p-4 md:p-5 ${className}`}>{children}</div>
);

export const LabSection = ({
  icon, title, desc, action,
}: {
  icon: React.ReactNode; title: string; desc?: string; action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const labTone = (t: string) => {
  switch (t) {
    case 'green': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'blue': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'sky': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-muted text-foreground border-border';
  }
};

/** Badge tone for LIS workflow status. */
export const labStatusTone = (s?: string | null) => {
  switch (s) {
    case 'AwaitingCollection': return labTone('amber');
    case 'Collected': return labTone('sky');
    case 'ResultDraft': return labTone('blue');
    case 'AwaitingValidation': return labTone('purple');
    case 'Validated': return labTone('green');
    case 'PendingRevalidation': return labTone('rose');
    default: return labTone('');
  }
};

export const labStatusLabel = (s?: string | null) => {
  switch (s) {
    case 'AwaitingCollection': return 'Awaiting Collection';
    case 'ResultDraft': return 'Result Draft';
    case 'AwaitingValidation': return 'Awaiting Validation';
    case 'PendingRevalidation': return 'Pending Revalidation';
    default: return s || '—';
  }
};
