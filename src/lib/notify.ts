import { toast } from 'sonner';

/** Consistent toast IDs + copy for STEP-00..09 surfaces. Always dismiss loading toasts. */
export const notify = {
  loading(id: string, message: string) {
    toast.loading(message, { id });
  },
  success(id: string, message: string) {
    toast.success(message, { id });
  },
  error(id: string, message: string) {
    toast.error(message, { id });
  },
  warning(id: string, message: string) {
    toast.warning(message, { id });
  },
  dismiss(id: string) {
    toast.dismiss(id);
  },
};

type ResultLike = { ok?: boolean; message?: string };

export async function withActionFeedback<T extends ResultLike | void>(
  id: string,
  pending: string,
  action: () => T | Promise<T>,
  success: (result: NonNullable<T>) => string,
  fail?: (result: NonNullable<T>) => string,
): Promise<T> {
  notify.loading(id, pending);
  await new Promise(r => setTimeout(r, 60));
  try {
    const result = await Promise.resolve(action()) as T;
    if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
      notify.error(id, fail?.(result as NonNullable<T>) ?? result.message ?? 'Action failed');
      return result;
    }
    if (result !== undefined && result !== null) {
      notify.success(id, success(result as NonNullable<T>));
    } else {
      notify.success(id, 'Done');
    }
    return result;
  } catch (e) {
    notify.error(id, e instanceof Error ? e.message : 'Unexpected error — please try again');
    throw e;
  }
}
