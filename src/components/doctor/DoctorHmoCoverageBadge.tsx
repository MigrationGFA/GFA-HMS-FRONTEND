import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import {
  getPersonHmoCoverage,
  type PersonHmoCoverageSummary,
} from '@/lib/api/insurance-hmo';
import { env } from '@/lib/env';

type Props = {
  personId: number | null | undefined;
  className?: string;
};

/**
 * Compact HMO coverage badge for OPD / consultation encounter headers.
 * Loads stored coverage + last eligibility snapshot (does not re-verify live).
 */
export default function DoctorHmoCoverageBadge({ personId, className = '' }: Props) {
  const apiOn = Boolean(env.apiBaseUrl);
  const [data, setData] = useState<PersonHmoCoverageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn || personId == null) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getPersonHmoCoverage(personId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof ApiError ? err.message : 'HMO lookup failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, personId]);

  if (!apiOn || personId == null) return null;

  if (loading) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground ${className}`}
      >
        <Shield className="h-3 w-3 animate-pulse" />
        HMO…
      </span>
    );
  }

  if (error || !data?.coverage) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground ${className}`}
        title={error ?? 'No HMO coverage on file'}
      >
        <Shield className="h-3 w-3" />
        Cash / no HMO
      </span>
    );
  }

  const elig = data.latestEligibility?.status?.toUpperCase();
  const tone =
    elig === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : elig === 'INACTIVE' || elig === 'ERROR'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : 'bg-amber-100 text-amber-900 border-amber-200';

  const label = [
    data.coverage.payerName,
    data.coverage.planName || data.latestEligibility?.planName,
    elig ? elig : data.coverage.status,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${tone} ${className}`}
      title={
        data.latestEligibility
          ? `Verified ${new Date(data.latestEligibility.verifiedAt).toLocaleString()} via ${data.latestEligibility.sourceAdapter}`
          : `Member ${data.coverage.memberNo}`
      }
    >
      <Shield className="h-3 w-3" />
      {label}
    </span>
  );
}
