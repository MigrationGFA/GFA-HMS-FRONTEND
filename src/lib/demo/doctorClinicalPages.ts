/**
 * Doctor clinical pages stored in this browser.
 * Documentation, timeline, emergency, messages, certificates, notifications,
 * analytics, discharge, research, audit, and the doctor profile.
 */
import type { ApiCertificate, CertificateSummary, CertificateTemplate } from '@/lib/api/certificates';
import type { ChatBroadcast, ChatConversation, ChatDirectoryUser, ChatMessage } from '@/lib/api/chat';
import type { ClinicalNoteDetail, ClinicalNoteFields, ClinicalNoteListItem, ClinicalNoteSummary } from '@/lib/api/clinicalNotes';
import type { ApiDischargeDraft } from '@/lib/api/discharge';
import type { DoctorAnalyticsPayload } from '@/lib/api/doctorAnalytics';
import type { AuditProject, RegistryEntry, ResearchDiagnosisRow, ResearchDrugRow, ResearchSummary, ResearchWardRow, TrialEntry } from '@/lib/api/doctorResearch';
import type {
  EmergencyAlert,
  EmergencyBoardPatient,
  EmergencyKpis,
  EmergencySession,
} from '@/lib/api/emergencyOverride';
import type { EncounterNote, PatientEncounterNoteItem } from '@/lib/api/encounters';
import type { ApiAuditLog, ApiAuditStats } from '@/lib/api/audit';
import type { ApiNotification } from '@/lib/api/notifications';
import type { UserProfile } from '@/lib/api/users';
import {
  localActiveEncounters,
  localAllEncounters,
  localClinicalSummary,
  localCompletedEncounters,
  localConsultationQueue,
  localPatchEncounter,
} from '@/lib/demo/consultationLocal';

const KEY = 'gfa_doctor_clinical_v1';

const DEMO = {
  personId: 9201,
  hospitalNo: 'GFA/HMS/2026/001201',
  firstName: 'Adaeze',
  lastName: 'Nwosu',
  sex: 'Female',
};

interface Store {
  nextId: number;
  notes: ClinicalNoteDetail[];
  signedEncounters: number[];
  certificates: ApiCertificate[];
  conversations: ChatConversation[];
  messages: ChatMessage[];
  broadcasts: ChatBroadcast[];
  notifications: ApiNotification[];
  sessions: EmergencySession[];
  alerts: EmergencyAlert[];
  discharges: ApiDischargeDraft[];
  registry: RegistryEntry[];
  trials: TrialEntry[];
  audits: AuditProject[];
  auditLogs: ApiAuditLog[];
  profile: UserProfile;
}

function nowIso() {
  return new Date().toISOString();
}

function envelope<T>(data: T) {
  return { data };
}

function paged<T>(items: T[]) {
  return { data: { items, meta: { page: 1, limit: Math.max(items.length, 1), total: items.length } } };
}

function cleanPath(path: string) {
  const raw = path.startsWith('/') ? path : `/${path}`;
  return raw.split('?')[0].replace(/\/$/, '');
}

function queryOf(path: string) {
  return new URLSearchParams(path.includes('?') ? path.split('?')[1] : '');
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? body as Record<string, unknown> : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function listed(filter: string | null, value: string) {
  if (!filter) return true;
  return filter.split(',').map((part) => part.trim()).filter(Boolean).includes(value);
}

function noteBucket(filter: string | null, status: string) {
  if (!filter) return true;
  const groups: Record<string, string[]> = {
    drafts: ['Draft', 'In Progress', 'Returned for Correction'],
    completed: ['Signed'],
    reviews: ['Awaiting Review', 'Under Review'],
  };
  return (groups[filter] ?? filter.split(',').map((part) => part.trim())).includes(status);
}

const TEMPLATES: CertificateTemplate[] = [
  ['SICK', 'Sick Leave', 'Time off work for an acute illness', 'Clinical', false, 'sick-leave', ['diagnosis', 'Diagnosis'], ['days', 'Days off'], ['from', 'Start date'], ['advice', 'Advice']],
  ['FIT', 'Fitness for Work', 'Confirms the patient is fit to resume duty', 'Occupational', false, 'fitness', ['fitness', 'Fitness statement'], ['restrictions', 'Restrictions'], ['review', 'Review date']],
  ['EXC', 'Excuse from Duty', 'Short excuse from duty pending review', 'Occupational', true, 'excuse', ['reason', 'Reason'], ['until', 'Excused until']],
  ['REP', 'Medical Report', 'Narrative clinical report for the patient', 'Clinical', false, 'report', ['history', 'History'], ['findings', 'Findings'], ['opinion', 'Opinion']],
  ['REF', 'Referral Letter', 'Letter to another clinician or facility', 'Clinical', false, 'referral', ['destination', 'Destination'], ['reason', 'Reason'], ['summary', 'Summary']],
  ['ADM', 'Admission Recommendation', 'Recommends inpatient care', 'Clinical', true, 'admission', ['ward', 'Suggested ward'], ['reason', 'Reason'], ['urgency', 'Urgency']],
  ['CONF', 'Confidential Clinical Report', 'Restricted report for an authorised recipient', 'Confidential', true, 'confidential', ['recipient', 'Recipient'], ['summary', 'Summary']],
  ['FU', 'Follow-up Certificate', 'Confirms the follow-up plan', 'Clinical', false, 'follow-up', ['plan', 'Follow-up plan'], ['date', 'Next visit']],
].map(([code, name, description, category, approval, layout, ...fields], index) => ({
  templateId: index + 1,
  code: String(code),
  name: String(name),
  description: String(description),
  category: String(category),
  fieldSchema: (fields as string[][]).map(([key, label]) => ({ key, label })),
  approvalRequired: Boolean(approval),
  layout: String(layout),
  status: 'Active',
}));

function personOf(personId = DEMO.personId) {
  return {
    personId,
    hospitalNo: personId === DEMO.personId ? DEMO.hospitalNo : `GFA/HMS/2026/${String(personId).padStart(6, '0')}`,
    firstName: personId === DEMO.personId ? DEMO.firstName : 'Patient',
    middleName: null,
    lastName: personId === DEMO.personId ? DEMO.lastName : String(personId),
  };
}

function cert(id: number, templateId: number, status: string, fields: Record<string, string>): ApiCertificate {
  const template = TEMPLATES.find((item) => item.templateId === templateId) ?? null;
  return {
    certificateId: id,
    docNo: `CERT-2026-${id}`,
    personId: DEMO.personId,
    templateId,
    status,
    fields,
    layout: template?.layout ?? 'clinical',
    validityUntil: '2026-12-31',
    locked: status === 'Issued',
    qrCode: `GFA-CERT-${id}`,
    signedAt: status === 'Issued' || status === 'PendingApproval' ? '2026-11-04T09:00:00.000Z' : null,
    signedBy: status === 'Issued' || status === 'PendingApproval' ? 'Dr. Ngozi Ikedife' : null,
    issuedAt: status === 'Issued' ? '2026-11-04T09:10:00.000Z' : null,
    issuedBy: status === 'Issued' ? 'Dr. Ngozi Ikedife' : null,
    approvedAt: status === 'Issued' && template?.approvalRequired ? '2026-11-04T09:20:00.000Z' : null,
    approvedBy: null,
    authorUserId: 8,
    createdBy: 'Dr. Ngozi Ikedife',
    createdAt: '2026-11-04T08:00:00.000Z',
    updatedAt: '2026-11-04T09:00:00.000Z',
    person: personOf(),
    template,
    events: [{ eventId: id, eventType: 'Created', actorLabel: 'Dr. Ngozi Ikedife', note: null, oldStatus: null, newStatus: status, createdAt: '2026-11-04T08:00:00.000Z' }],
  };
}

function seed(): Store {
  const nurse: ChatConversation = {
    id: 'chat-nurse',
    type: 'department',
    moduleScope: ['doctor'],
    group: 'Nurses',
    title: 'Ward update — Adaeze Nwosu',
    participantUserIds: [8, 4],
    patientId: String(DEMO.personId),
    patientName: 'Adaeze Nwosu',
    hospitalNo: DEMO.hospitalNo,
    urgent: false,
    archived: false,
    lastMessage: 'Vitals are stable. Ready for review.',
    lastMessageAt: '2026-11-05T08:30:00.000Z',
    unread: 1,
    createdById: 4,
    createdBy: 'Nurse Amina',
    createdAt: '2026-11-05T08:00:00.000Z',
  };
  const lab: ChatConversation = {
    id: 'chat-lab',
    type: 'department',
    moduleScope: ['doctor', 'laboratory'],
    group: 'Laboratory',
    title: 'Result ready — malaria RDT',
    participantUserIds: [8, 6],
    patientId: String(DEMO.personId),
    patientName: 'Adaeze Nwosu',
    hospitalNo: DEMO.hospitalNo,
    urgent: true,
    archived: false,
    lastMessage: 'Malaria RDT is positive. Result is validated.',
    lastMessageAt: '2026-11-05T09:00:00.000Z',
    unread: 1,
    createdById: 6,
    createdBy: 'Laboratory',
    createdAt: '2026-11-05T08:40:00.000Z',
  };
  return {
    nextId: 54000,
    notes: [{
      clinicalNoteId: 53001,
      noteNo: 'NOTE-2026-53001',
      personId: DEMO.personId,
      patientName: 'Adaeze Nwosu',
      hospitalNo: DEMO.hospitalNo,
      clinic: 'General OPD',
      noteType: 'SOAP Note',
      status: 'Draft',
      priority: 'Routine',
      version: 1,
      authorName: 'Dr. Ngozi Ikedife',
      signedBy: null,
      signedAt: null,
      submittedAt: null,
      returnReason: null,
      updatedAt: '2026-11-05T08:15:00.000Z',
      createdAt: '2026-11-05T08:15:00.000Z',
      encounterId: null,
      fields: {
        Subjective: 'Headache for two days, no vomiting.',
        Objective: 'BP 118/76. Afebrile.',
        Assessment: 'Tension headache.',
        Plan: 'Analgesia and review if worse.',
      },
      patient: {
        personId: DEMO.personId,
        name: 'Adaeze Nwosu',
        hospitalNo: DEMO.hospitalNo,
        age: 29,
        sex: 'Female',
        phone: '08031112233',
        nhia: null,
        nin: null,
      },
    }],
    signedEncounters: [],
    certificates: [
      cert(53011, 1, 'Draft', { diagnosis: 'Tension headache', days: '2', from: '2026-11-05', advice: 'Rest' }),
      cert(53012, 2, 'PendingSignature', { fitness: 'Fit to resume light duty', restrictions: 'No night shift for 7 days', review: '2026-11-12' }),
      cert(53013, 3, 'PendingApproval', { reason: 'Acute illness', until: '2026-11-07' }),
      cert(53014, 4, 'Issued', { history: 'Two-day headache', findings: 'Normal examination', opinion: 'Tension headache' }),
      cert(53015, 5, 'Issued', { destination: 'Neurology', reason: 'Persistent headache', summary: 'Please review.' }),
      cert(53016, 6, 'Draft', { ward: 'Female Medical', reason: 'Observation', urgency: 'Routine' }),
      cert(53017, 7, 'PendingApproval', { recipient: 'Occupational health', summary: 'Clinical details enclosed.' }),
      cert(53018, 8, 'Issued', { plan: 'Review in one week', date: '2026-11-12' }),
    ],
    conversations: [nurse, lab],
    messages: [
      { id: 'msg-1', conversationId: 'chat-nurse', senderUserId: 4, senderName: 'Nurse Amina', text: 'Vitals are stable. Ready for review.', urgent: false, mentions: [], attachmentUrl: null, readBy: [4], edited: false, createdAt: '2026-11-05T08:30:00.000Z' },
      { id: 'msg-2', conversationId: 'chat-lab', senderUserId: 6, senderName: 'Laboratory', text: 'Malaria RDT is positive. Result is validated.', urgent: true, mentions: [], attachmentUrl: null, readBy: [6], edited: false, createdAt: '2026-11-05T09:00:00.000Z' },
    ],
    broadcasts: [{
      id: 'bc-1',
      target: 'Doctors',
      moduleScope: ['doctor'],
      priority: 'Routine',
      message: 'OPD clinic starts at 09:00. Please review your waiting list.',
      patientName: null,
      expiry: null,
      sentBy: 'Medical Records',
      sentByUserId: 3,
      conversationId: null,
      sentAt: '2026-11-05T07:30:00.000Z',
    }],
    notifications: [
      { notificationId: 53021, userId: 8, roleHint: 'doctor', type: 'lab', title: 'Lab result ready', body: 'Malaria RDT for Adaeze Nwosu is validated.', linkPath: '/dashboard/doctor/clinical/results', entity: 'lab', entityId: 1, personId: DEMO.personId, isRead: false, acknowledgedAt: null, createdAt: '2026-11-05T09:00:00.000Z' },
      { notificationId: 53022, userId: 8, roleHint: 'doctor', type: 'imaging', title: 'Imaging accepted', body: 'Chest X-ray for Adaeze Nwosu was accepted.', linkPath: '/dashboard/doctor/clinical/imaging', entity: 'imaging', entityId: 1, personId: DEMO.personId, isRead: false, acknowledgedAt: null, createdAt: '2026-11-05T09:05:00.000Z' },
      { notificationId: 53023, userId: 8, roleHint: 'doctor', type: 'referral', title: 'Referral acknowledged', body: 'Nursing acknowledged the referral.', linkPath: '/dashboard/doctor/clinical/referrals', entity: 'referral', entityId: 1, personId: DEMO.personId, isRead: true, acknowledgedAt: null, createdAt: '2026-11-04T16:00:00.000Z' },
      { notificationId: 53024, userId: 8, roleHint: 'doctor', type: 'task', title: 'Note awaiting signature', body: 'A consultation note is ready to sign.', linkPath: '/dashboard/doctor/clinical/documentation', entity: 'note', entityId: 53001, personId: DEMO.personId, isRead: false, acknowledgedAt: null, createdAt: '2026-11-05T08:20:00.000Z' },
    ],
    sessions: [{
      sessionId: 53031,
      overrideNo: 'EM-2026-53031',
      personId: DEMO.personId,
      admissionId: 53041,
      patientName: 'Adaeze Nwosu',
      hospitalNo: DEMO.hospitalNo,
      reason: 'Acute severe headache',
      justification: 'Needs immediate review before payment clearance.',
      severity: 3,
      durationMinutes: 60,
      location: 'Emergency bay',
      consultant: 'Dr. Ngozi Ikedife',
      status: 'Active',
      actions: ['Opened'],
      startedAt: '2026-11-05T07:50:00.000Z',
      endsAt: '2026-11-05T08:50:00.000Z',
      endedAt: null,
      createdBy: 'Dr. Ngozi Ikedife',
      createdAt: '2026-11-05T07:50:00.000Z',
    }],
    alerts: [{
      alertId: 53032,
      personId: DEMO.personId,
      patientName: 'Adaeze Nwosu',
      hospitalNo: DEMO.hospitalNo,
      type: 'Clinical',
      message: 'Severe headache with no red flags on first review.',
      severity: 'High',
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      createdBy: 'Nurse Amina',
      createdAt: '2026-11-05T07:45:00.000Z',
    }],
    discharges: [{
      draftId: 53051,
      draftNo: 'DD-2026-53051',
      personId: DEMO.personId,
      admissionId: 53041,
      status: 'Draft',
      admissionDiagnosis: 'Acute psychosis observation',
      finalDiagnosis: 'Acute stress reaction',
      reasonForAdmission: 'Observation',
      clinicalSummary: 'Settled overnight. Fit for discharge with follow-up.',
      investigations: 'FBC normal.',
      treatmentGiven: 'Supportive care.',
      dischargeMedications: 'None',
      medicationsChanged: 'None',
      followUpPlan: 'OPC in one week',
      nextAppointment: '2026-11-12',
      patientEducation: 'Return if symptoms worsen.',
      riskSafetyNotes: 'No active risk.',
      dischargeType: 'Home',
      returnReason: null,
      requestedByUserId: 8,
      submittedAt: null,
      paymentClearedAt: null,
      finalizedAt: null,
      createdBy: 'Dr. Ngozi Ikedife',
      createdAt: '2026-11-05T08:00:00.000Z',
      updatedAt: '2026-11-05T08:00:00.000Z',
      person: { ...personOf(), sex: DEMO.sex, dateOfBirth: '1997-04-12', phone: '08031112233' },
      admission: {
        admissionId: 53041,
        status: 'ADMITTED',
        diagnosis: 'Acute stress reaction',
        admittedAt: '2026-11-03T18:00:00.000Z',
        ward: { wardId: 2, code: 'FM', name: 'Female Medical' },
        bed: { bedId: 21, label: 'FM-01', status: 'OCCUPIED' },
      },
      payment: { cleared: false, unpaidCount: 0, items: [] },
      events: [],
    }],
    registry: [{
      id: 53061,
      personId: DEMO.personId,
      patient: 'Adaeze Nwosu',
      diagnosis: 'Tension headache',
      eligibility: 'Eligible',
      consent: 'Granted',
      enrolledBy: 'Dr. Ngozi Ikedife',
      studyGroup: 'Observation',
      status: 'Enrolled',
      clinic: 'General OPD',
    }],
    trials: [{ id: 53062, name: 'Headache pathway audit', pi: 'Dr. Ngozi Ikedife', eligible: 20, enrolled: 8, startDate: '2026-10-01', status: 'Open' }],
    audits: [{ id: 53063, title: 'OPD note completeness', department: 'General OPD', lead: 'Dr. Ngozi Ikedife', indicator: 'Signed notes', standard: '90%', performance: '86%', status: 'Active' }],
    auditLogs: [
      { auditId: 53071, type: 'Clinical note', item: 'NOTE-2026-53001', entity: 'clinical-note', entityId: '53001', status: 'Draft', personId: DEMO.personId, userId: 8, createdBy: 'Dr. Ngozi Ikedife', createdAt: '2026-11-05T08:15:00.000Z', newValue: 'Draft saved', oldValue: null },
      { auditId: 53072, type: 'Certificate', item: 'CERT-2026-53014', entity: 'certificate', entityId: '53014', status: 'Issued', personId: DEMO.personId, userId: 8, createdBy: 'Dr. Ngozi Ikedife', createdAt: '2026-11-04T09:10:00.000Z', newValue: 'Issued', oldValue: 'PendingSignature' },
      { auditId: 53073, type: 'Emergency', item: 'EM-2026-53031', entity: 'emergency', entityId: '53031', status: 'Active', personId: DEMO.personId, userId: 8, createdBy: 'Dr. Ngozi Ikedife', createdAt: '2026-11-05T07:50:00.000Z', newValue: 'Override opened', oldValue: null },
    ],
    profile: {
      userId: 8,
      email: 'doctor@gfa-health.demo',
      firstName: 'Ngozi',
      lastName: 'Ikedife',
      phoneNo: '08030001111',
      licenseNumber: 'MDCN-44219',
      specialties: 'General practice',
      subSpecialty: 'Primary care',
      qualifications: 'MBBS',
      departmentName: 'General OPD',
      clinicName: 'General OPD',
      consultationHours: '09:00–14:00',
      wardAssignment: 'Female Medical',
      roles: ['DOCTOR'],
    },
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = seed();
      save(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<Store>;
    const base = seed();
    return {
      ...base,
      ...parsed,
      notes: parsed.notes?.length ? parsed.notes : base.notes,
      certificates: parsed.certificates?.length ? parsed.certificates : base.certificates,
      conversations: parsed.conversations?.length ? parsed.conversations : base.conversations,
      messages: parsed.messages?.length ? parsed.messages : base.messages,
      notifications: parsed.notifications?.length ? parsed.notifications : base.notifications,
      sessions: parsed.sessions?.length ? parsed.sessions : base.sessions,
      alerts: parsed.alerts?.length ? parsed.alerts : base.alerts,
      discharges: parsed.discharges?.length ? parsed.discharges : base.discharges,
      profile: parsed.profile ?? base.profile,
      signedEncounters: parsed.signedEncounters ?? [],
    };
  } catch {
    return seed();
  }
}

function save(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function encounterFields(note: EncounterNote): ClinicalNoteFields {
  return {
    'Chief Complaint': note.chiefComplaint,
    History: note.history,
    Examination: note.examination,
    Diagnosis: note.assessment,
    'Treatment Plan': note.plan,
    'Follow-Up Plan': note.followUpPlan,
  };
}

function encounterStatus(row: { encounterId: number; status: string }, signed: number[]) {
  if (signed.includes(row.encounterId) || row.status === 'Completed') return 'Signed';
  return 'Draft';
}

function encounterAsNote(row: ReturnType<typeof localAllEncounters>[number], signed: number[]): ClinicalNoteDetail {
  const status = encounterStatus(row, signed);
  return {
    clinicalNoteId: 70000 + row.encounterId,
    noteNo: `NOTE-ENC-${row.encounterId}`,
    personId: row.personId,
    patientName: row.patient.name,
    hospitalNo: row.patient.mrn,
    clinic: row.patient.clinic,
    noteType: 'Consultation Note',
    status,
    priority: row.patient.priority || 'Routine',
    version: row.version,
    authorName: row.doctorName,
    signedBy: status === 'Signed' ? row.doctorName : null,
    signedAt: status === 'Signed' ? row.completedAt ?? row.startedAt : null,
    submittedAt: null,
    returnReason: null,
    updatedAt: row.completedAt ?? row.startedAt,
    createdAt: row.startedAt,
    encounterId: row.encounterId,
    fields: encounterFields(row.note),
    patient: {
      personId: row.personId,
      name: row.patient.name,
      hospitalNo: row.patient.mrn,
      age: row.patient.age,
      sex: row.patient.sex,
      phone: null,
      nhia: null,
      nin: null,
    },
  };
}

function allNotes(store: Store): ClinicalNoteDetail[] {
  const visits = localAllEncounters().map((row) => encounterAsNote(row, store.signedEncounters));
  return [...visits, ...store.notes];
}

function toListItem(note: ClinicalNoteDetail): ClinicalNoteListItem {
  const { fields: _fields, patient: _patient, encounterId: _encounterId, ...item } = note;
  return item;
}

function findNote(store: Store, id: number) {
  return allNotes(store).find((note) => note.clinicalNoteId === id) ?? null;
}

function summaryOf(notes: ClinicalNoteDetail[]): ClinicalNoteSummary {
  return {
    drafts: notes.filter((note) => noteBucket('drafts', note.status)).length,
    awaitingReview: notes.filter((note) => noteBucket('reviews', note.status)).length,
    signedThisMonth: notes.filter((note) => note.status === 'Signed').length,
    templates: 14,
  };
}

function analytics(): DoctorAnalyticsPayload {
  return {
    from: '2026-10-06',
    to: '2026-11-05',
    clinic: 'all',
    doctorUserId: 8,
    kpis: {
      consultations: 18,
      patients: 16,
      diagnoses: 14,
      procedures: 3,
      admissions: 2,
      referrals: 4,
      prescriptions: 11,
      investigations: 9,
      discharges: 1,
      followUps: 6,
      telemedicine: 2,
      critical: 1,
      avgConsultMinutes: 18,
      pendingNotes: 1,
    },
    charts: {
      consultationTrend: [
        { date: 'Mon', count: 3 },
        { date: 'Tue', count: 4 },
        { date: 'Wed', count: 2 },
        { date: 'Thu', count: 5 },
        { date: 'Fri', count: 4 },
      ],
      patientsByClinic: [
        { clinic: 'General OPD', count: 11 },
        { clinic: 'Emergency', count: 3 },
        { clinic: 'Psychiatry', count: 2 },
      ],
      prescriptionVolume: [
        { date: 'Mon', count: 2 },
        { date: 'Tue', count: 3 },
        { date: 'Wed', count: 1 },
        { date: 'Thu', count: 3 },
        { date: 'Fri', count: 2 },
      ],
      referralTrend: [
        { date: 'Mon', count: 1 },
        { date: 'Tue', count: 0 },
        { date: 'Wed', count: 1 },
        { date: 'Thu', count: 1 },
        { date: 'Fri', count: 1 },
      ],
    },
    tables: {
      consultations: [{
        id: 'ENC-9201',
        date: '2026-11-05',
        patient: 'Adaeze Nwosu',
        hospitalId: DEMO.hospitalNo,
        patientId: String(DEMO.personId),
        clinic: 'General OPD',
        visitType: 'New',
        start: '09:10',
        end: '09:28',
        duration: '18 min',
        outcome: 'Discharged',
        payment: 'Paid',
      }],
      diagnoses: [{ diagnosis: 'Tension headache', code: '8A80', count: 4, newCases: 3, followUp: 1, clinic: 'General OPD', trend: 'Stable' }],
      prescriptions: [{ drug: 'Paracetamol', count: 6, patients: 6, clinic: 'General OPD', alerts: 0, stopped: 0 }],
      investigations: [{ name: 'Malaria RDT', type: 'Lab', count: 5, completed: 4, pending: 1, critical: 1 }],
    },
    patients: {
      newCount: 10,
      returningCount: 6,
      ageBands: [{ band: '18–39', count: 9 }, { band: '40–64', count: 7 }],
      paymentMix: [{ channel: 'Cash', count: 12 }, { channel: 'HMO', count: 4 }],
    },
    admission: {
      admissions: 2,
      discharges: 1,
      avgLosDays: 2,
      pendingDrafts: 1,
      wardDistribution: [{ ward: 'Female Medical', count: 1 }, { ward: 'Male Medical', count: 1 }],
    },
    referrals: { sent: 4, received: 1, completed: 2, pending: 2, external: 1 },
  };
}

function researchSummary(store: Store): ResearchSummary {
  return {
    diagnosis: 6,
    admissions: 2,
    mortality: '0',
    los: '2.0 days',
    readmissions: 0,
    drugs: 12,
    registry: store.registry.length,
    trials: store.trials.length,
    auditProjects: store.audits.length,
    outcomes: 4,
    psychiatric: 1,
    exported: 0,
  };
}

const DIAGNOSIS_ROWS: ResearchDiagnosisRow[] = [
  { diagnosis: 'Tension headache', code: '8A80', patients: 4, newCases: 3, admissions: 0, readmissions: 0, los: '—', outcome: 'Home' },
];
const WARD_ROWS: ResearchWardRow[] = [
  { ward: 'Female Medical', admissions: 1, discharges: 0, transfers: 0, dama: 0, deaths: 0, los: '2 days', occupancy: 40 },
];
const DRUG_ROWS: ResearchDrugRow[] = [
  { drug: 'Paracetamol', rx: 6, patients: 6, dept: 'General OPD', cost: '₦1,400', stock: 'In stock' },
];

function boardPatients(): EmergencyBoardPatient[] {
  return [{
    personId: DEMO.personId,
    admissionId: 53041,
    patientName: 'Adaeze Nwosu',
    hospitalNo: DEMO.hospitalNo,
    ward: 'Female Medical',
    bed: 'FM-01',
    status: 'ADMITTED',
    admittedAt: '2026-11-03T18:00:00.000Z',
  }];
}

function kpis(store: Store): EmergencyKpis {
  return {
    emergencyPatients: boardPatients().length,
    overrideRequests: store.sessions.length,
    criticalAlerts: store.alerts.filter((alert) => !alert.acknowledged).length,
    activeSessions: store.sessions.filter((session) => session.status === 'Active').length,
    expiredSessions: store.sessions.filter((session) => session.status !== 'Active').length,
    emergencyAdmissions: 1,
  };
}

function withTemplate(row: ApiCertificate): ApiCertificate {
  return { ...row, template: TEMPLATES.find((item) => item.templateId === row.templateId) ?? row.template ?? null };
}

function certSummary(rows: ApiCertificate[]): CertificateSummary {
  const month = '2026-11';
  return {
    drafts: rows.filter((row) => row.status === 'Draft').length,
    pendingSignature: rows.filter((row) => row.status === 'PendingSignature').length,
    pendingApproval: rows.filter((row) => row.status === 'PendingApproval').length,
    issuedMonth: rows.filter((row) => row.status === 'Issued' && (row.issuedAt ?? '').startsWith(month)).length,
    total: rows.length,
  };
}

function touchCert(store: Store, id: number, status: string, extra: Partial<ApiCertificate> = {}) {
  const row = store.certificates.find((item) => item.certificateId === id);
  if (!row) return null;
  const previous = row.status;
  Object.assign(row, extra, { status, updatedAt: nowIso() });
  row.events = [...(row.events ?? []), {
    eventId: store.nextId++,
    eventType: status,
    actorLabel: 'Dr. Ngozi Ikedife',
    note: null,
    oldStatus: previous,
    newStatus: status,
    createdAt: nowIso(),
  }];
  store.auditLogs.unshift({
    auditId: store.nextId++,
    type: 'Certificate',
    item: row.docNo,
    entity: 'certificate',
    entityId: String(row.certificateId),
    status,
    personId: row.personId,
    userId: 8,
    createdBy: 'Dr. Ngozi Ikedife',
    createdAt: nowIso(),
    newValue: status,
    oldValue: previous,
  });
  save(store);
  return withTemplate(row);
}

function timelineNotes(personId: number): PatientEncounterNoteItem[] {
  return localAllEncounters()
    .filter((row) => row.personId === personId)
    .map((row) => ({
      encounterId: row.encounterId,
      personId: row.personId,
      triageId: row.triageId,
      status: row.status,
      doctorId: row.doctorId,
      doctorName: row.doctorName,
      clinic: row.patient.clinic,
      priority: row.patient.priority,
      visit: row.patient.visit,
      queueNo: row.patient.queueNo,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      outcome: row.outcome,
      version: row.version,
      summary: row.note.assessment || row.note.chiefComplaint || 'Consultation',
      note: row.note,
    }));
}

/** Answers the doctor pages that were still reading an empty offline list. */
export function resolveDoctorClinicalPages(path: string, method: string, body?: unknown): unknown | null {
  const clean = cleanPath(path);
  const query = queryOf(path);
  const m = method.toUpperCase();

  if (clean === '/api/doctor/analytics' && m === 'GET') return envelope(analytics());

  if (clean === '/api/encounters/consultation-queue' && m === 'GET') {
    return envelope(localConsultationQueue({ q: query.get('q') ?? undefined, clinic: query.get('clinic') ?? undefined, priority: query.get('priority') ?? undefined }));
  }
  if (clean === '/api/encounters/active' && m === 'GET') return envelope(localActiveEncounters());
  if (clean === '/api/encounters/completed' && m === 'GET') return envelope(localCompletedEncounters());
  const summary = clean.match(/^\/api\/encounters\/patients\/(\d+)\/clinical-summary$/);
  if (summary && m === 'GET') return envelope(localClinicalSummary(Number(summary[1])));
  const notesForPatient = clean.match(/^\/api\/encounters\/patients\/(\d+)\/notes$/);
  if (notesForPatient && m === 'GET') return paged(timelineNotes(Number(notesForPatient[1])));

  if (clean === '/api/clinical-notes/summary' && m === 'GET') return envelope(summaryOf(allNotes(load())));
  if (clean === '/api/clinical-notes' && m === 'GET') {
    const term = (query.get('q') ?? '').toLowerCase();
    const items = allNotes(load()).filter((note) => noteBucket(query.get('status'), note.status)
      && (!term || `${note.noteNo} ${note.patientName} ${note.hospitalNo}`.toLowerCase().includes(term)));
    return paged(items.map(toListItem));
  }
  if (clean === '/api/clinical-notes' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const personId = Number(payload.personId) || DEMO.personId;
    const noteId = store.nextId++;
    const note: ClinicalNoteDetail = {
      clinicalNoteId: noteId,
      noteNo: `NOTE-2026-${noteId}`,
      personId,
      patientName: text(payload.patientName, personId === DEMO.personId ? 'Adaeze Nwosu' : `Patient ${personId}`),
      hospitalNo: personId === DEMO.personId ? DEMO.hospitalNo : null,
      clinic: text(payload.clinic, 'General OPD'),
      noteType: text(payload.noteType, 'SOAP Note'),
      status: 'Draft',
      priority: text(payload.priority, 'Routine'),
      version: 1,
      authorName: 'Dr. Ngozi Ikedife',
      signedBy: null,
      signedAt: null,
      submittedAt: null,
      returnReason: null,
      updatedAt: nowIso(),
      createdAt: nowIso(),
      encounterId: payload.encounterId == null ? null : Number(payload.encounterId),
      fields: (payload.fields && typeof payload.fields === 'object' ? payload.fields : {}) as ClinicalNoteFields,
      patient: {
        personId,
        name: text(payload.patientName, 'Adaeze Nwosu'),
        hospitalNo: personId === DEMO.personId ? DEMO.hospitalNo : null,
        age: null,
        sex: null,
        phone: null,
        nhia: null,
        nin: null,
      },
    };
    store.notes.unshift(note);
    save(store);
    return envelope(note);
  }
  const noteAction = clean.match(/^\/api\/clinical-notes\/(\d+)(?:\/(submit|sign|approve|return|void|versions))?$/);
  if (noteAction) {
    const id = Number(noteAction[1]);
    const action = noteAction[2];
    const store = load();
    const encounterId = id >= 70000 ? id - 70000 : null;
    if (encounterId && action === 'versions' && m === 'GET') {
      const note = findNote(store, id);
      return envelope({ clinicalNoteId: id, noteNo: note?.noteNo ?? '', noteType: note?.noteType ?? '', patientName: note?.patientName ?? '', hospitalNo: note?.hospitalNo ?? null, items: [] });
    }
    if (encounterId && m === 'GET' && !action) return envelope(findNote(store, id));
    if (encounterId && m === 'PATCH') {
      const fields = asRecord(asRecord(body).fields);
      const patch: Partial<EncounterNote> = {};
      if (fields['Chief Complaint']) patch.chiefComplaint = text(fields['Chief Complaint']);
      if (fields.History) patch.history = text(fields.History);
      if (fields.Examination) patch.examination = text(fields.Examination);
      if (fields.Diagnosis) patch.assessment = text(fields.Diagnosis);
      if (fields['Treatment Plan']) patch.plan = text(fields['Treatment Plan']);
      if (fields['Follow-Up Plan']) patch.followUpPlan = text(fields['Follow-Up Plan']);
      if (Object.keys(patch).length) localPatchEncounter(encounterId, patch);
      return envelope(findNote(load(), id));
    }
    if (encounterId && action === 'sign' && m === 'POST') {
      store.signedEncounters = [...new Set([...store.signedEncounters, encounterId])];
      save(store);
      return envelope(findNote(store, id));
    }
    if (encounterId && m === 'POST') return envelope(findNote(store, id));
    const row = store.notes.find((note) => note.clinicalNoteId === id);
    if (!row) return encounterId ? null : null;
    if (!action && m === 'GET') return envelope(row);
    if (!action && m === 'PATCH') {
      const payload = asRecord(body);
      if (payload.fields && typeof payload.fields === 'object') row.fields = { ...row.fields, ...payload.fields as ClinicalNoteFields };
      if (payload.noteType) row.noteType = text(payload.noteType);
      if (payload.clinic) row.clinic = text(payload.clinic);
      if (payload.priority) row.priority = text(payload.priority);
      row.version += 1;
      row.updatedAt = nowIso();
      save(store);
      return envelope(row);
    }
    if (action === 'versions' && m === 'GET') {
      return envelope({
        clinicalNoteId: row.clinicalNoteId,
        noteNo: row.noteNo,
        noteType: row.noteType,
        patientName: row.patientName,
        hospitalNo: row.hospitalNo,
        items: [{ versionId: row.clinicalNoteId, version: row.version, status: row.status, changeSummary: null, fields: row.fields, createdBy: row.authorName, createdAt: row.updatedAt, isCurrent: true }],
      });
    }
    if (m === 'POST' && action) {
      if (action === 'submit') row.status = 'Awaiting Review';
      if (action === 'sign' || action === 'approve') {
        row.status = 'Signed';
        row.signedBy = 'Dr. Ngozi Ikedife';
        row.signedAt = nowIso();
      }
      if (action === 'return') {
        row.status = 'Returned for Correction';
        row.returnReason = text(asRecord(body).reason, 'Please revise');
      }
      if (action === 'void') row.status = 'Void';
      row.version += 1;
      row.updatedAt = nowIso();
      save(store);
      return envelope(row);
    }
  }

  if (clean === '/api/clinical-certificates/templates' && m === 'GET') return envelope(TEMPLATES);
  if (clean === '/api/clinical-certificates/summary' && m === 'GET') return envelope(certSummary(load().certificates));
  if (clean === '/api/clinical-certificates' && m === 'GET') {
    const items = load().certificates.filter((row) => listed(query.get('status'), row.status)).map(withTemplate);
    return paged(items);
  }
  if (clean === '/api/clinical-certificates' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const template = TEMPLATES.find((item) => item.templateId === Number(payload.templateId)) ?? TEMPLATES[0];
    const created = cert(store.nextId++, template.templateId, 'Draft', (payload.fields && typeof payload.fields === 'object' ? payload.fields : {}) as Record<string, string>);
    created.personId = Number(payload.personId) || DEMO.personId;
    created.person = personOf(created.personId);
    created.validityUntil = text(payload.validityUntil, created.validityUntil ?? '');
    created.createdAt = nowIso();
    created.updatedAt = nowIso();
    store.certificates.unshift(created);
    save(store);
    return envelope(withTemplate(created));
  }
  const certAction = clean.match(/^\/api\/clinical-certificates\/(\d+)(?:\/(submit-sign|sign|approve|cancel))?$/);
  if (certAction) {
    const id = Number(certAction[1]);
    const action = certAction[2];
    const store = load();
    const row = store.certificates.find((item) => item.certificateId === id);
    if (!row) return null;
    if (!action && m === 'GET') return envelope(withTemplate(row));
    if (!action && m === 'PATCH') {
      const payload = asRecord(body);
      if (payload.fields && typeof payload.fields === 'object') row.fields = { ...row.fields, ...payload.fields as Record<string, string> };
      if (payload.validityUntil) row.validityUntil = text(payload.validityUntil);
      row.updatedAt = nowIso();
      save(store);
      return envelope(withTemplate(row));
    }
    if (action === 'submit-sign') return envelope(touchCert(store, id, 'PendingSignature'));
    if (action === 'sign') {
      const template = TEMPLATES.find((item) => item.templateId === row.templateId);
      const next = template?.approvalRequired ? 'PendingApproval' : 'Issued';
      return envelope(touchCert(store, id, next, {
        signedAt: nowIso(),
        signedBy: 'Dr. Ngozi Ikedife',
        issuedAt: next === 'Issued' ? nowIso() : row.issuedAt,
        issuedBy: next === 'Issued' ? 'Dr. Ngozi Ikedife' : row.issuedBy,
        locked: next === 'Issued',
      }));
    }
    if (action === 'approve') {
      return envelope(touchCert(store, id, 'Issued', { approvedAt: nowIso(), approvedBy: 'Dr. Ngozi Ikedife', issuedAt: nowIso(), issuedBy: 'Dr. Ngozi Ikedife', locked: true }));
    }
    if (action === 'cancel') return envelope(touchCert(store, id, 'Cancelled'));
  }

  if (clean === '/api/chat/conversations' && m === 'GET') {
    const items = load().conversations.filter((row) => !row.archived);
    return paged(items);
  }
  if (clean === '/api/chat/conversations' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const conversation: ChatConversation = {
      id: `chat-${store.nextId++}`,
      type: text(payload.type, 'direct'),
      moduleScope: ['doctor'],
      group: text(payload.group, 'Nurses'),
      title: text(payload.title, 'New conversation'),
      participantUserIds: [8],
      patientId: payload.patientId == null ? null : String(payload.patientId),
      patientName: text(payload.patientName) || null,
      hospitalNo: text(payload.hospitalNo) || null,
      urgent: Boolean(payload.urgent),
      archived: false,
      lastMessage: text(payload.initialMessage),
      lastMessageAt: nowIso(),
      unread: 0,
      createdById: 8,
      createdBy: 'Dr. Ngozi Ikedife',
      createdAt: nowIso(),
    };
    store.conversations.unshift(conversation);
    save(store);
    return envelope({ conversation, message: null });
  }
  const chatMessages = clean.match(/^\/api\/chat\/conversations\/([^/]+)\/messages$/);
  if (chatMessages && m === 'GET') {
    const store = load();
    const conversation = store.conversations.find((item) => item.id === decodeURIComponent(chatMessages[1]));
    if (!conversation) return null;
    const items = store.messages.filter((item) => item.conversationId === conversation.id);
    return envelope({ ...paged(items).data, conversation });
  }
  if (chatMessages && m === 'POST') {
    const store = load();
    const conversation = store.conversations.find((item) => item.id === decodeURIComponent(chatMessages[1]));
    if (!conversation) return null;
    const payload = asRecord(body);
    const message: ChatMessage = {
      id: `msg-${store.nextId++}`,
      conversationId: conversation.id,
      senderUserId: 8,
      senderName: 'Dr. Ngozi Ikedife',
      text: text(payload.text, 'Noted'),
      urgent: Boolean(payload.urgent),
      mentions: [],
      attachmentUrl: null,
      readBy: [8],
      edited: false,
      createdAt: nowIso(),
    };
    conversation.lastMessage = message.text;
    conversation.lastMessageAt = message.createdAt;
    store.messages.push(message);
    save(store);
    return envelope({ conversation, message });
  }
  const chatRead = clean.match(/^\/api\/chat\/conversations\/([^/]+)\/read$/);
  if (chatRead && m === 'PATCH') {
    const store = load();
    const conversation = store.conversations.find((item) => item.id === decodeURIComponent(chatRead[1]));
    if (!conversation) return null;
    conversation.unread = 0;
    save(store);
    return envelope({ conversation });
  }
  if (clean === '/api/chat/broadcasts' && m === 'GET') return paged(load().broadcasts);
  if (clean === '/api/chat/directory' && m === 'GET') {
    const directory: ChatDirectoryUser[] = [
      { userId: 4, firstName: 'Amina', lastName: 'Bello', email: 'nurse@gfa-health.demo', role: 'nurse', modules: ['doctor'], displayName: 'Nurse Amina Bello' },
      { userId: 6, firstName: 'Lab', lastName: 'Desk', email: 'lab@gfa-health.demo', role: 'lab', modules: ['laboratory'], displayName: 'Laboratory Desk' },
      { userId: 5, firstName: 'Pharmacy', lastName: 'Desk', email: 'pharmacist@gfa-health.demo', role: 'pharmacist', modules: ['pharmacy'], displayName: 'Pharmacy Desk' },
    ];
    const term = (query.get('q') ?? '').toLowerCase();
    return paged(directory.filter((user) => !term || user.displayName.toLowerCase().includes(term)));
  }

  if (clean === '/api/notifications' && m === 'GET') {
    const items = load().notifications.filter((row) => query.get('unreadOnly') !== 'true' || !row.isRead);
    return paged(items);
  }
  if (clean === '/api/notifications/stats' && m === 'GET') {
    return envelope({ unread: load().notifications.filter((row) => !row.isRead).length });
  }
  if (clean === '/api/notifications/read-all' && m === 'POST') {
    const store = load();
    store.notifications.forEach((row) => { row.isRead = true; });
    save(store);
    return envelope({ updated: store.notifications.length });
  }
  const notification = clean.match(/^\/api\/notifications\/(\d+)\/(read|ack)$/);
  if (notification) {
    const store = load();
    const row = store.notifications.find((item) => item.notificationId === Number(notification[1]));
    if (!row) return null;
    row.isRead = true;
    if (notification[2] === 'ack') row.acknowledgedAt = nowIso();
    save(store);
    return envelope(row);
  }

  if (clean === '/api/emergency-override/board' && m === 'GET') {
    const store = load();
    return envelope({ kpis: kpis(store), patients: boardPatients() });
  }
  if (clean === '/api/emergency-override/sessions' && m === 'GET') return paged(load().sessions);
  if (clean === '/api/emergency-override/sessions' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const session: EmergencySession = {
      sessionId: store.nextId++,
      overrideNo: `EM-2026-${store.nextId}`,
      personId: Number(payload.personId) || DEMO.personId,
      admissionId: null,
      patientName: text(payload.patientName, 'Adaeze Nwosu'),
      hospitalNo: DEMO.hospitalNo,
      reason: text(payload.reason, 'Clinical emergency'),
      justification: text(payload.justification),
      severity: Number(payload.severity) || 3,
      durationMinutes: Number(payload.durationMinutes) || 60,
      location: text(payload.location) || null,
      consultant: 'Dr. Ngozi Ikedife',
      status: 'Active',
      actions: ['Opened'],
      startedAt: nowIso(),
      endsAt: null,
      endedAt: null,
      createdBy: 'Dr. Ngozi Ikedife',
      createdAt: nowIso(),
    };
    store.sessions.unshift(session);
    save(store);
    return envelope(session);
  }
  const endSession = clean.match(/^\/api\/emergency-override\/sessions\/(\d+)\/end$/);
  if (endSession && m === 'PATCH') {
    const store = load();
    const row = store.sessions.find((item) => item.sessionId === Number(endSession[1]));
    if (!row) return null;
    row.status = 'Ended';
    row.endedAt = nowIso();
    save(store);
    return envelope(row);
  }
  if (clean === '/api/emergency-override/alerts' && m === 'GET') return paged(load().alerts);
  const ackAlert = clean.match(/^\/api\/emergency-override\/alerts\/(\d+)\/ack$/);
  if (ackAlert && m === 'PATCH') {
    const store = load();
    const row = store.alerts.find((item) => item.alertId === Number(ackAlert[1]));
    if (!row) return null;
    row.acknowledged = true;
    row.acknowledgedAt = nowIso();
    row.acknowledgedBy = 'Dr. Ngozi Ikedife';
    save(store);
    return envelope(row);
  }
  if (clean === '/api/emergency-override/admissions' && m === 'GET') {
    return paged([{ admissionId: 53041, personId: DEMO.personId, patientName: 'Adaeze Nwosu', hospitalNo: DEMO.hospitalNo, ward: 'Female Medical', status: 'ADMITTED', admittedAt: '2026-11-03T18:00:00.000Z', doctor: 'Dr. Ngozi Ikedife' }]);
  }
  if (clean === '/api/emergency-override/referrals' && m === 'GET') {
    return paged([{ referralId: 53042, referralNo: 'REF-2026-53042', personId: DEMO.personId, patientName: 'Adaeze Nwosu', destination: 'Neurology', priority: 'Routine', reason: 'Persistent headache', status: 'Submitted', createdAt: '2026-11-05T09:20:00.000Z' }]);
  }
  if (clean === '/api/emergency-override/medications' && m === 'GET') {
    return paged([{ prescriptionId: 53043, rxNo: 'RX-EM-53043', personId: DEMO.personId, patientName: 'Adaeze Nwosu', drug: 'Paracetamol', dose: '1g', route: 'Oral', urgency: 'Stat', paymentStatus: 'Emergency', status: 'Sent', doctor: 'Dr. Ngozi Ikedife', createdAt: '2026-11-05T09:25:00.000Z' }]);
  }

  if (clean === '/api/discharge-drafts' && m === 'GET') {
    const items = load().discharges.filter((row) => listed(query.get('status'), row.status)
      && (query.get('personId') == null || row.personId === Number(query.get('personId'))));
    return paged(items);
  }
  if (clean === '/api/discharge-drafts' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const draft: ApiDischargeDraft = {
      ...store.discharges[0],
      draftId: store.nextId++,
      draftNo: `DD-2026-${store.nextId}`,
      personId: Number(payload.personId) || DEMO.personId,
      admissionId: Number(payload.admissionId) || 53041,
      status: 'Draft',
      admissionDiagnosis: text(payload.admissionDiagnosis, 'Observation'),
      finalDiagnosis: text(payload.finalDiagnosis),
      clinicalSummary: text(payload.clinicalSummary),
      followUpPlan: text(payload.followUpPlan),
      dischargeType: text(payload.dischargeType, 'Home'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      submittedAt: null,
      events: [],
    };
    store.discharges.unshift(draft);
    save(store);
    return envelope(draft);
  }
  const discharge = clean.match(/^\/api\/discharge-drafts\/(\d+)(?:\/(submit|return|cancel|finalize))?$/);
  if (discharge) {
    const store = load();
    const row = store.discharges.find((item) => item.draftId === Number(discharge[1]));
    if (!row) return null;
    const action = discharge[2];
    if (!action && m === 'GET') return envelope(row);
    if (!action && m === 'PATCH') {
      Object.assign(row, asRecord(body), { updatedAt: nowIso() });
      save(store);
      return envelope(row);
    }
    if (action === 'submit') row.status = 'Submitted';
    if (action === 'return') {
      row.status = 'Returned';
      row.returnReason = text(asRecord(body).reason, 'Please revise');
    }
    if (action === 'cancel') row.status = 'Cancelled';
    if (action === 'finalize') row.status = 'Discharged';
    row.updatedAt = nowIso();
    save(store);
    return envelope(row);
  }

  if (clean === '/api/doctor/research/summary' && m === 'GET') return envelope(researchSummary(load()));
  if (clean === '/api/doctor/research/diagnoses' && m === 'GET') return paged(DIAGNOSIS_ROWS);
  if (clean === '/api/doctor/research/admissions-by-ward' && m === 'GET') return paged(WARD_ROWS);
  if (clean === '/api/doctor/research/drug-utilization' && m === 'GET') return paged(DRUG_ROWS);
  if (clean === '/api/doctor/research/registry' && m === 'GET') return paged(load().registry);
  if (clean === '/api/doctor/research/registry' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const row: RegistryEntry = {
      id: store.nextId++,
      personId: payload.personId == null ? DEMO.personId : Number(payload.personId),
      patient: text(payload.patient, 'Adaeze Nwosu'),
      diagnosis: text(payload.diagnosis, 'Tension headache'),
      eligibility: text(payload.eligibility, 'Eligible'),
      consent: text(payload.consent, 'Granted'),
      enrolledBy: text(payload.enrolledBy, 'Dr. Ngozi Ikedife'),
      studyGroup: text(payload.studyGroup, 'Observation'),
      status: text(payload.status, 'Enrolled'),
      clinic: text(payload.clinic, 'General OPD'),
    };
    store.registry.unshift(row);
    save(store);
    return envelope(row);
  }
  if (clean === '/api/doctor/research/trials' && m === 'GET') return paged(load().trials);
  if (clean === '/api/doctor/research/trials' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const row: TrialEntry = {
      id: store.nextId++,
      name: text(payload.name, 'New study'),
      pi: text(payload.pi, 'Dr. Ngozi Ikedife'),
      eligible: Number(payload.eligibleCount) || 0,
      enrolled: Number(payload.enrolledCount) || 0,
      startDate: text(payload.startDate) || nowIso().slice(0, 10),
      status: text(payload.status, 'Open'),
    };
    store.trials.unshift(row);
    save(store);
    return envelope(row);
  }
  if (clean === '/api/doctor/research/audit-projects' && m === 'GET') return paged(load().audits);
  if (clean === '/api/doctor/research/audit-projects' && m === 'POST') {
    const payload = asRecord(body);
    const store = load();
    const row: AuditProject = {
      id: store.nextId++,
      title: text(payload.title, 'New audit'),
      department: text(payload.department, 'General OPD'),
      lead: text(payload.lead, 'Dr. Ngozi Ikedife'),
      indicator: text(payload.indicator, 'Completion'),
      standard: text(payload.standard, '90%'),
      performance: text(payload.performance, '0%'),
      status: text(payload.status, 'Active'),
    };
    store.audits.unshift(row);
    save(store);
    return envelope(row);
  }

  if (clean === '/api/audit/logs' && m === 'GET') return paged(load().auditLogs);
  if (clean === '/api/audit/stats' && m === 'GET') {
    const logs = load().auditLogs;
    const stats: ApiAuditStats = {
      asOf: nowIso(),
      total: logs.length,
      today: logs.length,
      emergencyOverrides: logs.filter((row) => row.type === 'Emergency').length,
      noteEdits: logs.filter((row) => row.type === 'Clinical note').length,
      prescriptionChanges: 1,
      flagged: 0,
    };
    return envelope(stats);
  }

  if (clean === '/api/users/me' && m === 'GET') return envelope(load().profile);
  if (clean === '/api/users/me' && m === 'PATCH') {
    const store = load();
    store.profile = { ...store.profile, ...asRecord(body) } as UserProfile;
    save(store);
    return envelope(store.profile);
  }

  return null;
}
