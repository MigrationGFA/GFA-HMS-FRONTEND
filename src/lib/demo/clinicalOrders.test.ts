import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveOfflineApiResponse } from './offlineApi';

describe('consultation orders reach the departments', () => {
  beforeEach(() => {
    localStorage.removeItem('gfa_registration_desk_v1');
    localStorage.removeItem('gfa_clinical_orders_v1');
  });

  afterEach(() => {
    localStorage.removeItem('gfa_clinical_orders_v1');
  });

  it('lists dummy catalogs, then lets cashier, pharmacy, lab, and radiology act', () => {
    const created = resolveOfflineApiResponse('/api/records/registrations', 'POST', {
      firstName: 'Tunde',
      lastName: 'Balogun',
      sex: 'Male',
      patientPhoneNo: '08039990001',
    }) as { data: { personId: number } };
    const personId = created.data.personId;

    const drugs = resolveOfflineApiResponse('/api/pharmacy/drugs?limit=20', 'GET') as {
      data: { items: Array<{ drugId: number; name: string }> };
    };
    const paracetamol = drugs.data.items.find((drug) => drug.name === 'Paracetamol');
    expect(paracetamol).toBeTruthy();

    const tests = resolveOfflineApiResponse('/api/laboratory/tests', 'GET') as {
      data: { items: Array<{ labTestId: number; name: string }> };
    };
    const fbc = tests.data.items.find((test) => test.name === 'Full Blood Count');
    expect(fbc).toBeTruthy();

    const studies = resolveOfflineApiResponse('/api/radiology/imaging/studies', 'GET') as {
      data: { items: Array<{ imagingStudyId: number; name: string }> };
    };
    const chest = studies.data.items.find((study) => study.name === 'Chest X-ray');
    expect(chest).toBeTruthy();

    const codes = resolveOfflineApiResponse('/api/diagnoses/catalog?q=malaria', 'GET') as {
      data: { items: Array<{ name: string }> };
    };
    expect(codes.data.items.some((row) => row.name === 'Malaria')).toBe(true);

    const wards = resolveOfflineApiResponse('/api/admissions/wards', 'GET') as {
      data: { items: Array<{ name: string }> };
    };
    expect(wards.data.items.some((ward) => ward.name === 'Male Medical')).toBe(true);

    const rx = resolveOfflineApiResponse('/api/prescriptions', 'POST', {
      personId,
      diagnosis: 'Tension headache',
      items: [{ drugId: paracetamol!.drugId, dose: '1g', frequency: 'TDS', quantity: 12 }],
    }) as { data: { prescriptionId: number; rxNo: string; status: string; paymentStatus: string; person: { lastName: string | null } } };
    expect(rx.data.status).toBe('Sent');
    expect(rx.data.paymentStatus).toBe('Unpaid');
    expect(rx.data.person.lastName).toBe('Balogun');

    const walkIn = resolveOfflineApiResponse('/api/cashier/payments/pharmacy-sales?paymentStatus=Unpaid', 'GET') as {
      data: { items: unknown[] };
    };
    expect(Array.isArray(walkIn.data.items)).toBe(true);

    const bills = resolveOfflineApiResponse('/api/cashier/payments/prescriptions?paymentStatus=Unpaid,Emergency', 'GET') as {
      data: { items: Array<{ rxNo: string }> };
    };
    expect(bills.data.items.some((row) => row.rxNo === rx.data.rxNo)).toBe(true);

    const queue = resolveOfflineApiResponse('/api/prescriptions?status=Sent', 'GET') as {
      data: { items: Array<{ rxNo: string }> };
    };
    expect(queue.data.items.some((row) => row.rxNo === rx.data.rxNo)).toBe(true);

    const paid = resolveOfflineApiResponse(
      `/api/cashier/payments/prescriptions/${rx.data.prescriptionId}/confirm`,
      'POST',
      { paymentChannel: 'Cash' },
    ) as { data: { paymentStatus: string } };
    expect(paid.data.paymentStatus).toBe('Paid');

    const dispensed = resolveOfflineApiResponse(
      `/api/prescriptions/${rx.data.prescriptionId}/dispense`,
      'POST',
      {},
    ) as { data: { status: string } };
    expect(dispensed.data.status).toBe('Dispensed');

    const lab = resolveOfflineApiResponse('/api/laboratory/requests', 'POST', {
      personId,
      clinicalIndication: 'Fever',
      items: [{ testId: fbc!.labTestId }],
    }) as { data: { labRequestId: number; requestNo: string; status: string; processingLocked: boolean } };
    expect(lab.data.status).toBe('Sent');
    expect(lab.data.processingLocked).toBe(true);

    const labPaid = resolveOfflineApiResponse(
      `/api/cashier/payments/lab-requests/${lab.data.labRequestId}/confirm`,
      'POST',
      { paymentChannel: 'Cash' },
    ) as { data: { paymentStatus: string; processingLocked: boolean } };
    expect(labPaid.data.paymentStatus).toBe('Paid');
    expect(labPaid.data.processingLocked).toBe(false);

    const collected = resolveOfflineApiResponse(
      `/api/laboratory/requests/${lab.data.labRequestId}/collect`,
      'POST',
      {},
    ) as { data: { request: { labStatus: string }; samples: unknown[] } };
    expect(collected.data.request.labStatus).toBe('Collected');
    expect(collected.data.samples.length).toBeGreaterThan(0);

    const saved = resolveOfflineApiResponse(
      `/api/laboratory/requests/${lab.data.labRequestId}/results`,
      'POST',
      { action: 'submit', items: [{ requestItemId: lab.data.labRequestId * 10 + 1, values: { result: 'Hb 13.2' } }] },
    ) as { data: { results: Array<{ labResultId: number; status: string }> } };
    const validated = resolveOfflineApiResponse(
      `/api/laboratory/results/${saved.data.results[0].labResultId}/validate`,
      'POST',
      {},
    ) as { data: { status: string } };
    expect(validated.data.status).toBe('Validated');

    const imaging = resolveOfflineApiResponse('/api/radiology/imaging/requests', 'POST', {
      personId,
      clinicalIndication: 'Cough',
      items: [{ studyId: chest!.imagingStudyId }],
    }) as { data: { imagingRequestId: number; status: string; paymentStatus: string } };
    expect(imaging.data.status).toBe('Sent');
    expect(imaging.data.paymentStatus).toBe('Unpaid');

    resolveOfflineApiResponse(
      `/api/cashier/payments/imaging-requests/${imaging.data.imagingRequestId}/confirm`,
      'POST',
      { paymentChannel: 'Cash' },
    );
    const accepted = resolveOfflineApiResponse(
      `/api/radiology/imaging/requests/${imaging.data.imagingRequestId}`,
      'PATCH',
      { status: 'Accepted' },
    ) as { data: { status: string; paymentCleared: boolean } };
    expect(accepted.data.status).toBe('Accepted');
    expect(accepted.data.paymentCleared).toBe(true);

    const report = resolveOfflineApiResponse('/api/radiology/imaging/reports', 'POST', {
      imagingRequestId: imaging.data.imagingRequestId,
      findings: 'Clear lung fields',
      impression: 'No acute finding',
    }) as { data: { findings: string } };
    expect(report.data.findings).toBe('Clear lung fields');

    const listed = resolveOfflineApiResponse(
      '/api/radiology/imaging/requests?status=Sent,Accepted,Completed',
      'GET',
    ) as { data: { items: Array<{ imagingRequestId: number; status: string }> } };
    expect(listed.data.items.some((row) => row.imagingRequestId === imaging.data.imagingRequestId && row.status === 'Completed')).toBe(true);

    const admission = resolveOfflineApiResponse('/api/admission-requests', 'POST', {
      personId,
      wardId: 1,
      provisionalDiagnosis: 'Malaria',
    }) as { data: { status: string; requestNo: string } };
    expect(admission.data.status).toBe('Submitted');
    const admissions = resolveOfflineApiResponse('/api/admission-requests?status=Submitted', 'GET') as {
      data: { items: Array<{ requestNo: string }> };
    };
    expect(admissions.data.items.some((row) => row.requestNo === admission.data.requestNo)).toBe(true);

    const referral = resolveOfflineApiResponse('/api/referrals', 'POST', {
      personId,
      referralKind: 'Internal',
      toDepartment: 'GMPC',
      reason: 'Review',
    }) as { data: { referralId: number; status: string } };
    const acked = resolveOfflineApiResponse(`/api/referrals/${referral.data.referralId}/ack`, 'PATCH', {}) as {
      data: { status: string };
    };
    expect(acked.data.status).toBe('UnderReview');

    const transfer = resolveOfflineApiResponse('/api/transfers', 'POST', {
      personId,
      transferType: 'ClinicToWard',
      toWardId: 1,
      reason: 'Needs a bed',
    }) as { data: { transferId: number; status: string } };
    const prepared = resolveOfflineApiResponse(`/api/transfers/${transfer.data.transferId}/prepare`, 'PATCH', {}) as {
      data: { status: string };
    };
    expect(prepared.data.status).toBe('NursePreparing');
  });
});
