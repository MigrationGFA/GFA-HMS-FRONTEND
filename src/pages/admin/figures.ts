import { useMemo } from 'react';
import { useAdmin } from '@/contexts/AdminStore';
import { useBillingStore } from '@/contexts/BillingStore';
import { useDental } from '@/contexts/DentalStore';
import { useEye } from '@/contexts/EyeStore';
import { usePaeds } from '@/contexts/PaedsStore';
import {
  billingSpan, filterByDay, refundsFromAudit, summariseMoney,
  type AdminDepartment, type MoneyInvoice,
} from '@/data/adminData';

export function useLiveDepartments(): AdminDepartment[] {
  const admin = useAdmin();
  const dental = useDental();
  const eye = useEye();
  const paeds = usePaeds();
  return useMemo(() => admin.state.departments.map((dept) => {
    if (dept.liveKey === 'dental') {
      return { ...dept, patientsToday: dental.stats.todayAppointments, waiting: dental.stats.waiting, completed: dental.stats.seenToday };
    }
    if (dept.liveKey === 'eye') {
      return { ...dept, patientsToday: eye.stats.todayAppointments, waiting: eye.stats.waiting, completed: eye.stats.seenToday };
    }
    if (dept.liveKey === 'paeds') {
      const rows = paeds.state.appointments.filter((row) => row.date === paeds.today && row.status !== 'Cancelled');
      return {
        ...dept,
        patientsToday: rows.length,
        waiting: rows.filter((row) => row.status === 'Waiting' || row.status === 'Checked In').length,
        completed: rows.filter((row) => row.status === 'Completed').length,
        bedsOccupied: paeds.state.beds.filter((bed) => bed.status === 'Occupied').length,
        bedsTotal: paeds.state.beds.length,
      };
    }
    return dept;
  }), [admin.state.departments, dental.stats, eye.stats, paeds.state.appointments, paeds.state.beds, paeds.today]);
}

export function useMoney(from: string, to: string) {
  const billing = useBillingStore();
  return useMemo(() => {
    const invoices = filterByDay(billing.invoices as MoneyInvoice[], from, to);
    const refundActions = billing.audit
      .filter((row) => row.timestamp.slice(0, 10) >= from && row.timestamp.slice(0, 10) <= to)
      .map((row) => row.action);
    return { invoices, summary: summariseMoney(invoices, refundsFromAudit(refundActions)), all: billing.invoices };
  }, [billing.invoices, billing.audit, from, to]);
}

export function useBillingRange() {
  const billing = useBillingStore();
  const admin = useAdmin();
  return billingSpan(billing.invoices, admin.today);
}
