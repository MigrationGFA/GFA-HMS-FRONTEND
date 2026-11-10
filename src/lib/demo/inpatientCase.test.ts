import { describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { resolveOfflineApiResponse } from '@/lib/demo/offlineApi';
import {
  INPATIENT_RESULT,
  captureInpatientDeposit,
  demoNumber,
  listUnpaidDeposits,
  registerInpatient,
  resetInpatientDemo,
  resolveInpatientApi,
  sendWardOrders,
} from '@/lib/demo/inpatientCase';

describe('inpatient local case', () => {
  it('registers, admits on payment, and keeps one chart for lab, imaging, and pharmacy', () => {
    resetInpatientDemo();
    expect(listUnpaidDeposits().some(row => row.patientName === 'Chinedu Okeke')).toBe(true);

    const created = registerInpatient({
      name: 'Amina Bello Test',
      sex: 'Female',
      phone: '08099887766',
      wardId: 'WRD-2',
      diagnosis: 'Observation after collapse',
    });
    expect(db.admissions.get(created.admissionId)?.status).toBe('PENDING');
    expect(listUnpaidDeposits().some(row => row.invoiceId === created.invoiceId)).toBe(true);

    const reports = resolveOfflineApiResponse('/api/cashier/reports', 'GET') as { data: { kpis: { outstanding: number } } };
    expect(typeof reports.data.kpis.outstanding).toBe('number');

    const payment = captureInpatientDeposit(created.invoiceId, 'Test cashier');
    expect(payment.ok).toBe(true);
    const admitted = db.admissions.get(created.admissionId);
    expect(admitted?.status).toBe('ADMITTED');
    expect(admitted?.bedLabel).toBeTruthy();

    const orders = sendWardOrders(created.admissionId);
    expect(orders.ok).toBe(true);
    if (!orders.ok) return;

    const labList = resolveInpatientApi('/api/laboratory/requests?status=Sent', 'GET') as { data: { items: { requestNo: string }[] } };
    expect(labList.data.items.some(row => row.requestNo === orders.labOrderId)).toBe(true);

    const overview = resolveOfflineApiResponse('/api/records/overview', 'GET') as { data: { kpis: { totalToday: number } } };
    expect(typeof overview.data.kpis.totalToday).toBe('number');

    const result = resolveInpatientApi(`/api/laboratory/requests/${demoNumber(orders.labOrderId)}/results`, 'POST') as {
      data: { request: { status: string } };
    };
    expect(result.data.request.status).toBe('Validated');
    expect(db.orders.get(orders.labOrderId)?.labMeta?.clinicalNote).toBe(INPATIENT_RESULT);

    const rx = resolveInpatientApi(`/api/prescriptions/by-rx/${orders.drugOrderId}`, 'GET') as { data: { status: string; prescriptionId: number } };
    expect(rx.data.status).toBe('Sent');
    const dispensed = resolveInpatientApi(`/api/prescriptions/${rx.data.prescriptionId}/dispense`, 'POST') as { data: { status: string } };
    expect(dispensed.data.status).toBe('Dispensed');

    const imaging = resolveInpatientApi('/api/radiology/imaging/requests', 'GET') as {
      data: { items: { clinicalNotes: string | null; person: { firstName: string } | null }[] };
    };
    expect(imaging.data.items.some(row => row.person?.firstName === 'Amina' && row.clinicalNotes?.includes('inpatient-demo'))).toBe(true);

    const ward = resolveInpatientApi('/api/admissions', 'GET') as { data: { person: { firstName: string; lastName: string } | null }[] };
    expect(ward.data.some(row => row.person?.firstName === 'Amina' && row.person.lastName === 'Bello Test')).toBe(true);

    resetInpatientDemo();
  });
});
