import { Button } from '@/components/ui/button';

export const RECORDS_PAGE_SIZE = 50;

type Props = {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  /** Alias for loading — disables Previous/Next while fetching. */
  disabled?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
};

/** Simple Previous / Next pager for Records list screens. */
export default function RecordsListPagination({
  page,
  pageSize,
  total,
  loading = false,
  disabled = false,
  onPageChange,
  label = 'rows',
}: Props) {
  const busy = loading || disabled;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
      <span>
        Showing {from}–{to} of {total} {label}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasPrev || busy}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-2 py-1">Page {page}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasNext || busy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
