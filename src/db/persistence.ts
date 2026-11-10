const KEY = 'gfa_db_v1';

export const load = <T>(): T | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const saveDebounced = (state: unknown) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // quota exceeded — ignore for demo
    }
  }, 150);
};

export const saveImmediate = (state: unknown) => {
  if (timer) clearTimeout(timer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota exceeded
  }
};

export const clear = () => localStorage.removeItem(KEY);

export const storageKey = KEY;
