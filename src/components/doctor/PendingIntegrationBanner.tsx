import { Info } from 'lucide-react';

type Props = {
  /** Short reason shown under the demo label */
  reason: string;
  /** Compact inline chip vs full-width banner */
  compact?: boolean;
  className?: string;
};

/**
 * Soft notice for screens that previously required a live backend.
 * In the GFA Health HMS offline demo this is informational only.
 */
export function PendingIntegrationBanner({ reason, compact = false, className = '' }: Props) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-semibold tracking-wide text-primary ${className}`}
        title={reason}
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Demo data
      </span>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-center ${className}`}
    >
      <div className="flex flex-col items-center gap-2">
        <Info className="h-6 w-6 text-primary" aria-hidden />
        <div className="text-sm font-semibold tracking-wide text-foreground">
          Showing sample demo data
        </div>
        <p className="max-w-lg text-sm text-muted-foreground">{reason.replace(/VITE_USE_API[^.]*/g, 'offline demo fixtures').replace(/Backend API is not configured\.?/gi, 'This module uses local sample data.')}</p>
      </div>
    </div>
  );
}

export default PendingIntegrationBanner;
