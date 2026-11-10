import { cn } from '@/lib/utils';

/** Phone-first worklist card — prefer this over wide tables below `md`. */
export function MobileWorklist({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('space-y-2 md:hidden', className)}>{children}</div>;
}

export function MobileWorklistCard({
  title,
  subtitle,
  meta,
  status,
  actions,
  onClick,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={cn(
        'rounded-xl border bg-card p-3 shadow-sm active:bg-muted/40',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{title}</div>
          {subtitle ? <div className="text-xs text-muted-foreground mt-0.5 break-words">{subtitle}</div> : null}
          {meta ? <div className="text-xs text-muted-foreground mt-1">{meta}</div> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** Hide on small screens; show table from md up. Pair with MobileWorklist. */
export function DesktopOnlyTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('hidden md:block', className)}>{children}</div>;
}
