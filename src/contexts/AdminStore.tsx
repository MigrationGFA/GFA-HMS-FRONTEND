import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  ADMIN_STORAGE_KEY, buildAdminSeed, changeServicePrice, localToday, openedReport, transitionReport,
  type AdminDepartment, type AdminIssue, type AdminSettings, type AdminStaffMember, type AdminState,
  type CatalogueService, type DeptReport, type IssueStatus, type ReportComment, type ReportStatus,
} from '@/data/adminData';

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

interface AdminApi {
  state: AdminState;
  today: string;
  resetDemoData: () => void;
  saveDepartment: (id: string, patch: Partial<Pick<AdminDepartment, 'head' | 'phone' | 'email' | 'location' | 'status'>>) => Result<AdminDepartment>;
  saveService: (input: Omit<CatalogueService, 'updatedAt' | 'updatedBy'> & { updatedBy: string }) => Result<CatalogueService>;
  setServiceStatus: (id: string, status: CatalogueService['status'], by: string) => Result<CatalogueService>;
  changePrice: (id: string, price: number, reason: string, effectiveDate: string, by: string) => Result<CatalogueService>;
  assignStaff: (id: string, department: string, shift: string) => Result<AdminStaffMember>;
  saveStaff: (input: AdminStaffMember) => AdminStaffMember;
  saveReport: (input: Omit<DeptReport, 'id' | 'comments' | 'status' | 'submittedAt'> & { id?: string; status?: ReportStatus }) => DeptReport;
  openReport: (id: string) => DeptReport | undefined;
  setReportStatus: (id: string, status: ReportStatus, comment?: ReportComment) => Result<DeptReport>;
  setIssueStatus: (id: string, status: IssueStatus) => void;
  saveSettings: (settings: AdminSettings) => void;
}

const Ctx = createContext<AdminApi | null>(null);

function load(today: string): AdminState {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AdminState;
      if (parsed?.departments && parsed?.services && parsed?.reports) return parsed;
    }
  } catch { /* seed */ }
  const seed = buildAdminSeed(today);
  try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(seed)); } catch { /* ignore */ }
  return seed;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const today = localToday();
  const [state, setState] = useState<AdminState>(() => load(today));

  const commit = (next: AdminState) => {
    setState(next);
    try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const api = useMemo<AdminApi>(() => ({
    state,
    today,
    resetDemoData: () => commit(buildAdminSeed(today)),
    saveDepartment: (id, patch) => {
      const current = state.departments.find((row) => row.id === id);
      if (!current) return { ok: false, message: 'Department not found.' };
      const next = { ...current, ...patch };
      commit({ ...state, departments: state.departments.map((row) => row.id === id ? next : row) });
      return { ok: true, value: next };
    },
    saveService: (input) => {
      if (!input.name.trim() || !input.code.trim()) return { ok: false, message: 'Name and code are required.' };
      const codeTaken = state.services.some((row) => row.code.toLowerCase() === input.code.trim().toLowerCase() && row.id !== input.id);
      if (codeTaken) return { ok: false, message: 'That service code is already used.' };
      const row: CatalogueService = { ...input, code: input.code.trim(), name: input.name.trim(), updatedAt: today, updatedBy: input.updatedBy };
      const exists = state.services.some((item) => item.id === row.id);
      commit({ ...state, services: exists ? state.services.map((item) => item.id === row.id ? row : item) : [row, ...state.services] });
      return { ok: true, value: row };
    },
    setServiceStatus: (id, status, by) => {
      const current = state.services.find((row) => row.id === id);
      if (!current) return { ok: false, message: 'Service not found.' };
      const next = { ...current, status, updatedAt: today, updatedBy: by };
      commit({ ...state, services: state.services.map((row) => row.id === id ? next : row) });
      return { ok: true, value: next };
    },
    changePrice: (id, price, reason, effectiveDate, by) => {
      const current = state.services.find((row) => row.id === id);
      if (!current) return { ok: false, message: 'Service not found.' };
      if (!Number.isFinite(price) || price < 0) return { ok: false, message: 'Enter a price of zero or more.' };
      if (!reason.trim()) return { ok: false, message: 'A reason is required.' };
      const changed = changeServicePrice(current, state.priceHistory, { price, reason, effectiveDate, by, at: today });
      commit({
        ...state,
        services: state.services.map((row) => row.id === id ? changed.service : row),
        priceHistory: changed.history,
      });
      return { ok: true, value: changed.service };
    },
    assignStaff: (id, department, shift) => {
      const current = state.staff.find((row) => row.id === id);
      if (!current) return { ok: false, message: 'Staff member not found.' };
      const next = { ...current, department, shift };
      commit({ ...state, staff: state.staff.map((row) => row.id === id ? next : row) });
      return { ok: true, value: next };
    },
    saveStaff: (input) => {
      const exists = state.staff.some((row) => row.id === input.id);
      const id = exists ? input.id : `S${String(state.staff.length + 1).padStart(3, '0')}`;
      const row = { ...input, id };
      commit({ ...state, staff: exists ? state.staff.map((item) => item.id === id ? row : item) : [row, ...state.staff] });
      return row;
    },
    saveReport: (input) => {
      const id = input.id && state.reports.some((row) => row.id === input.id) ? input.id : `RPT-${Date.now()}`;
      const existing = state.reports.find((row) => row.id === id);
      const row: DeptReport = {
        ...input,
        id,
        status: input.status ?? 'Submitted',
        submittedAt: existing?.submittedAt ?? today,
        comments: existing?.comments ?? [],
      };
      commit({ ...state, reports: existing ? state.reports.map((item) => item.id === id ? row : item) : [row, ...state.reports] });
      return row;
    },
    openReport: (id) => {
      const row = state.reports.find((item) => item.id === id);
      return row ? openedReport(row) : undefined;
    },
    setReportStatus: (id, status, comment) => {
      const current = state.reports.find((row) => row.id === id);
      if (!current) return { ok: false, message: 'Report not found.' };
      const result = transitionReport(current, status, comment);
      if (!result.ok) return result;
      commit({ ...state, reports: state.reports.map((row) => row.id === id ? result.report : row) });
      return { ok: true, value: result.report };
    },
    setIssueStatus: (id, status) => {
      commit({ ...state, issues: state.issues.map((row) => row.id === id ? { ...row, status } : row) });
    },
    saveSettings: (settings) => commit({ ...state, settings }),
  }), [state, today]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminApi {
  const value = useContext(Ctx);
  if (!value) throw new Error('useAdmin must be used within AdminProvider');
  return value;
}
