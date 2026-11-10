// Monotonic, prefix-based ids. Backend will own ids later; LocalRepo mimics that.
const counters: Record<string, number> = {};

export const nextId = (prefix: string, start = 1000): string => {
  counters[prefix] = (counters[prefix] ?? start) + 1;
  return `${prefix}-${counters[prefix]}`;
};

export const seedCounter = (prefix: string, value: number) => {
  counters[prefix] = Math.max(counters[prefix] ?? 0, value);
};

export const resetCounters = () => {
  Object.keys(counters).forEach(k => delete counters[k]);
};

export const nowIso = () => new Date().toISOString();
export const nowHuman = () => new Date().toISOString().replace('T', ' ').slice(0, 16);
