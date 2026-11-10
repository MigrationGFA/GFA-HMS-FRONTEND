import { useCallback, useState } from 'react';
import { withActionFeedback } from '@/lib/notify';

type ResultLike = { ok?: boolean; message?: string };

export function useAsyncAction() {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = useCallback(async <T extends ResultLike | void>(
    key: string,
    pending: string,
    action: () => T | Promise<T>,
    success: (result: NonNullable<T>) => string,
    fail?: (result: NonNullable<T>) => string,
  ): Promise<T | undefined> => {
    if (busyKey) return undefined;
    setBusyKey(key);
    try {
      return await withActionFeedback(key, pending, action, success, fail);
    } finally {
      setBusyKey(null);
    }
  }, [busyKey]);

  const isBusy = useCallback((key?: string) => (key ? busyKey === key : !!busyKey), [busyKey]);

  return { run, isBusy, busyKey };
}
