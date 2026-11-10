// Shared utilities for the Laboratory module: drafts, audit, critical alerts.
// Frontend-only persistence via localStorage (per project convention).

const KEY = (ns: string) => `aro.lab.${ns}`;

// ---------- DRAFTS ----------
export interface LabDraft {
  id: string;
  page: string;       // e.g. 'result-entry'
  label: string;      // human label, e.g. patient + test
  data: any;
  savedAt: string;    // ISO
  user?: string;
}

export const draftStore = {
  list(page?: string): LabDraft[] {
    try {
      const all = JSON.parse(localStorage.getItem(KEY('drafts')) || '[]') as LabDraft[];
      return page ? all.filter(d => d.page === page) : all;
    } catch { return []; }
  },
  save(d: LabDraft) {
    const all = draftStore.list();
    const ix = all.findIndex(x => x.id === d.id);
    const entry = { ...d, savedAt: new Date().toISOString() };
    if (ix >= 0) all[ix] = entry; else all.push(entry);
    localStorage.setItem(KEY('drafts'), JSON.stringify(all));
  },
  remove(id: string) {
    const all = draftStore.list().filter(d => d.id !== id);
    localStorage.setItem(KEY('drafts'), JSON.stringify(all));
  },
};

// ---------- AUDIT ----------
export interface AuditEntry {
  id: string;
  ts: string;
  user?: string;
  action: string;
  module: string;
  record: string;
  oldValue?: string;
  newValue?: string;
}

export const auditStore = {
  list(): AuditEntry[] {
    try { return JSON.parse(localStorage.getItem(KEY('audit')) || '[]'); } catch { return []; }
  },
  log(e: Omit<AuditEntry, 'id' | 'ts'> & { user?: string }) {
    const all = auditStore.list();
    const entry: AuditEntry = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 999)}`,
      ts: new Date().toISOString(),
      user: e.user || 'Lab Scientist',
      action: e.action, module: e.module, record: e.record,
      oldValue: e.oldValue, newValue: e.newValue,
    };
    all.unshift(entry);
    // cap at 500 entries
    localStorage.setItem(KEY('audit'), JSON.stringify(all.slice(0, 500)));
  },
  clear() { localStorage.removeItem(KEY('audit')); },
};

// ---------- CRITICAL ALERTS ----------
export interface CriticalAlert {
  id: string;
  ts: string;
  patient: string;
  test: string;
  value: string;
  acknowledged?: boolean;
  notified?: string[];
  action?: string;
}

export const alertStore = {
  list(): CriticalAlert[] {
    try { return JSON.parse(localStorage.getItem(KEY('alerts')) || '[]'); } catch { return []; }
  },
  push(a: Omit<CriticalAlert, 'id' | 'ts'>) {
    const all = alertStore.list();
    const entry: CriticalAlert = { id: `CRT-${Date.now()}`, ts: new Date().toISOString(), ...a };
    all.unshift(entry);
    localStorage.setItem(KEY('alerts'), JSON.stringify(all.slice(0, 200)));
    return entry;
  },
  update(id: string, patch: Partial<CriticalAlert>) {
    const all = alertStore.list().map(a => a.id === id ? { ...a, ...patch } : a);
    localStorage.setItem(KEY('alerts'), JSON.stringify(all));
  },
};

// ---------- TAT helper ----------
export const minutesBetween = (from: string | Date, to: string | Date = new Date()) => {
  const a = new Date(from).getTime(); const b = new Date(to).getTime();
  return Math.max(0, Math.round((b - a) / 60000));
};
export const formatTat = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return `${h}h ${m}m`;
};
