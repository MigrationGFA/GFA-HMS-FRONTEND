import { beforeEach, describe, expect, it } from 'vitest';
import { localPatchEncounter, localStartEncounter } from './consultationLocal';
import { resolveOfflineApiResponse } from './offlineApi';

describe('doctor clinical pages use dummy data', () => {
  beforeEach(() => {
    localStorage.removeItem('gfa_registration_desk_v1');
    localStorage.removeItem('gfa_consultation_v1');
    localStorage.removeItem('gfa_doctor_clinical_v1');
  });

  it('prices every imaging modality and fills the doctor pages', () => {
    const studies = resolveOfflineApiResponse('/api/radiology/imaging/studies', 'GET') as {
      data: { items: Array<{ name: string; modality: string; unitPrice: number }> };
    };
    const ct = studies.data.items.find((study) => study.name === 'CT brain');
    expect(ct?.modality).toBe('CT Scan');
    expect(ct?.unitPrice).toBeGreaterThan(0);
    for (const modality of ['X-Ray', 'Ultrasound', 'ECG', 'MRI', 'EEG', 'Echocardiography', 'Fluoroscopy', 'Mammography', 'Portable']) {
      expect(studies.data.items.some((study) => study.modality === modality && study.unitPrice > 0)).toBe(true);
    }

    const created = resolveOfflineApiResponse('/api/records/registrations', 'POST', {
      firstName: 'Tunde',
      lastName: 'Balogun',
      sex: 'Male',
      patientPhoneNo: '08039990001',
    }) as { data: { personId: number; card: { cardId: number } } };
    resolveOfflineApiResponse(`/api/cashier/payments/cards/${created.data.card.cardId}/confirm`, 'POST', { paymentChannel: 'Cash' });
    const triage = resolveOfflineApiResponse('/api/triage', 'POST', {
      personId: created.data.personId,
      clinic: 'General OPD',
      bloodPressure: '118/76',
    }) as { data: { triageId: number } };
    resolveOfflineApiResponse(`/api/nursing/patient-queues/${triage.data.triageId}/send-to-doctor`, 'PATCH', {});
    const started = localStartEncounter({ triageId: triage.data.triageId });
    localPatchEncounter(started.encounterId, {
      chiefComplaint: 'Headache for two days',
      assessment: 'Tension headache',
      plan: 'Rest and review',
    });

    const notes = resolveOfflineApiResponse('/api/clinical-notes?status=drafts', 'GET') as {
      data: { items: Array<{ patientName: string; noteType: string }> };
    };
    expect(notes.data.items.some((note) => note.patientName.includes('Balogun'))).toBe(true);

    const timeline = resolveOfflineApiResponse(`/api/encounters/patients/${created.data.personId}/notes`, 'GET') as {
      data: { items: Array<{ note: { chiefComplaint: string; assessment: string } }> };
    };
    expect(timeline.data.items[0].note.chiefComplaint).toBe('Headache for two days');
    expect(timeline.data.items[0].note.assessment).toBe('Tension headache');

    const templates = resolveOfflineApiResponse('/api/clinical-certificates/templates', 'GET') as {
      data: Array<{ name: string }>;
    };
    expect(templates.data.map((row) => row.name)).toEqual(expect.arrayContaining([
      'Sick Leave', 'Fitness for Work', 'Excuse from Duty', 'Medical Report',
    ]));
    const issued = resolveOfflineApiResponse('/api/clinical-certificates?status=Issued', 'GET') as {
      data: { items: Array<{ docNo: string }> };
    };
    expect(issued.data.items.length).toBeGreaterThan(0);
    const pending = resolveOfflineApiResponse('/api/clinical-certificates?status=PendingSignature', 'GET') as {
      data: { items: Array<{ certificateId: number }> };
    };
    const signed = resolveOfflineApiResponse(
      `/api/clinical-certificates/${pending.data.items[0].certificateId}/sign`,
      'PATCH',
      {},
    ) as { data: { status: string } };
    expect(signed.data.status).toBe('Issued');

    const analytics = resolveOfflineApiResponse('/api/doctor/analytics', 'GET') as {
      data: { charts: { consultationTrend: unknown[] }; tables: { consultations: unknown[] } };
    };
    expect(analytics.data.charts.consultationTrend.length).toBeGreaterThan(0);
    expect(analytics.data.tables.consultations.length).toBeGreaterThan(0);

    const chat = resolveOfflineApiResponse('/api/chat/conversations', 'GET') as {
      data: { items: Array<{ id: string }> };
    };
    const thread = resolveOfflineApiResponse(`/api/chat/conversations/${chat.data.items[0].id}/messages`, 'GET') as {
      data: { items: Array<{ text: string }> };
    };
    expect(thread.data.items.length).toBeGreaterThan(0);

    const board = resolveOfflineApiResponse('/api/emergency-override/board', 'GET') as {
      data: { kpis: { activeSessions: number }; patients: unknown[] };
    };
    expect(board.data.kpis.activeSessions).toBeGreaterThan(0);
    expect(board.data.patients.length).toBeGreaterThan(0);

    const discharge = resolveOfflineApiResponse('/api/discharge-drafts?status=Draft', 'GET') as {
      data: { items: Array<{ draftNo: string }> };
    };
    expect(discharge.data.items.length).toBeGreaterThan(0);
  });
});
