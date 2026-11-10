import { beforeEach, describe, expect, it } from 'vitest';
import { resolveOfflineApiResponse } from './offlineApi';
import {
  localClinicalSummary,
  localCompleteEncounter,
  localConsultationQueue,
  localPatchEncounter,
  localStartEncounter,
} from './consultationLocal';

describe('local doctor consultation', () => {
  beforeEach(() => {
    localStorage.removeItem('gfa_registration_desk_v1');
    localStorage.removeItem('gfa_consultation_v1');
  });

  it('shows a paid patient after Records or Nursing sends them to consultation', () => {
    const created = resolveOfflineApiResponse('/api/records/registrations', 'POST', {
      firstName: 'Tunde',
      lastName: 'Balogun',
      sex: 'Male',
      patientPhoneNo: '08039990001',
      regFee: 500,
      consultFee: 0,
      cardFee: 0,
    }) as { data: { personId: number; card: { cardId: number } } };

    resolveOfflineApiResponse(
      `/api/cashier/payments/cards/${created.data.card.cardId}/confirm`,
      'POST',
      { paymentChannel: 'Cash' },
    );

    const triage = resolveOfflineApiResponse('/api/triage', 'POST', {
      personId: created.data.personId,
      clinic: 'General OPD',
      status: 'Waiting',
      bloodPressure: '118/76',
      temperatureC: 36.6,
      pulseBpm: 78,
    }) as { data: { triageId: number; queueNo: string } };

    const before = localConsultationQueue();
    expect(before.items.some((row) => row.name.includes('Balogun'))).toBe(false);

    resolveOfflineApiResponse(
      `/api/nursing/patient-queues/${triage.data.triageId}/send-to-doctor`,
      'PATCH',
      { clinic: 'General OPD' },
    );

    const waiting = localConsultationQueue();
    const patient = waiting.items.find((row) => row.name.includes('Balogun'));
    expect(patient).toBeTruthy();
    expect(patient?.canStart).toBe(true);
    expect(patient?.paymentCleared).toBe(true);
    expect(patient?.vitalsStatus).toBe('Captured');
    expect(patient?.queueNo).toBe(triage.data.queueNo);

    const started = localStartEncounter({ triageId: patient!.triageId });
    expect(localConsultationQueue().items.some((row) => row.name.includes('Balogun'))).toBe(false);

    const noted = localPatchEncounter(started.encounterId, {
      chiefComplaint: 'Headache',
      assessment: 'Tension headache',
      plan: 'Rest and review',
    });
    expect(noted.note.assessment).toBe('Tension headache');
    expect(noted.version).toBe(2);

    const summary = localClinicalSummary(created.data.personId, patient!.triageId);
    expect(summary.demographics.name).toContain('Balogun');
    expect(summary.vitals.bloodPressure).toBe('118/76');
    expect(summary.payment.cleared).toBe(true);

    const done = localCompleteEncounter(started.encounterId, {
      outcome: 'Discharged',
      followUpDate: '2026-11-11',
      followUpClinic: 'General OPD',
    });
    expect(done.status).toBe('Completed');
    expect(done.outcome).toBe('Discharged');
  });

  it('keeps an unpaid patient off the startable queue', () => {
    const created = resolveOfflineApiResponse('/api/records/registrations', 'POST', {
      firstName: 'Chidi',
      lastName: 'Eze',
      sex: 'Male',
      patientPhoneNo: '08030000009',
    }) as { data: { personId: number } };

    const triage = resolveOfflineApiResponse('/api/triage', 'POST', {
      personId: created.data.personId,
      status: 'Waiting',
    }) as { data: { triageId: number } };

    resolveOfflineApiResponse(
      `/api/nursing/patient-queues/${triage.data.triageId}/send-to-doctor`,
      'PATCH',
      {},
    );

    expect(localConsultationQueue().items.some((row) => row.name.includes('Eze') && row.canStart)).toBe(false);
  });
});
