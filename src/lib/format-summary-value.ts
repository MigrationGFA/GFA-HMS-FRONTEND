/** Format KPI values for dashboard cards — full commas or compact (30K) when large. */
export function formatSummaryValue(
  value: string | number | null | undefined,
  opts?: { compact?: boolean; loading?: boolean },
): string {
  if (opts?.loading) return '…';
  if (value == null || value === '') return '—';
  const raw = String(value).trim();
  if (raw === '…' || raw === '—') return raw;

  const normalized = raw.replace(/,/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return raw;

  if (opts?.compact && Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  }

  return new Intl.NumberFormat('en-US').format(n);
}
