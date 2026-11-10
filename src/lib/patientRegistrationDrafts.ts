import Dexie, { type Table } from 'dexie';

export type RegistrationDraftStatus = 'In Progress' | 'Paused' | 'Submitted';

export type PatientRegistrationDraft = {
  id: string;
  form: Record<string, unknown>;
  step: number;
  createdAt: string;
  updatedAt: string;
  savedBy: string;
  status: RegistrationDraftStatus;
  /** Bumps on every local write for optimistic recovery. */
  version: number;
  lastSyncedAt?: string | null;
  syncStatus: 'local' | 'pending' | 'synced' | 'error';
  /** Set after Create Record & Card on Payment step. */
  registeredPersonId?: number | null;
  generatedId?: string | null;
  registeredCardId?: number | null;
};

class PatientRegistrationDraftDb extends Dexie {
  drafts!: Table<PatientRegistrationDraft, string>;

  constructor() {
    super('gfa_patient_registration_drafts');
    this.version(1).stores({
      drafts: 'id, updatedAt, status, syncStatus',
    });
    this.version(2).stores({
      drafts: 'id, updatedAt, status, syncStatus, registeredPersonId',
    });
  }
}

const db = new PatientRegistrationDraftDb();

export async function listRegistrationDrafts(): Promise<PatientRegistrationDraft[]> {
  return db.drafts.orderBy('updatedAt').reverse().toArray();
}

export async function getRegistrationDraft(
  id: string,
): Promise<PatientRegistrationDraft | undefined> {
  return db.drafts.get(id);
}

export async function upsertRegistrationDraft(input: {
  id?: string | null;
  form: Record<string, unknown>;
  step: number;
  savedBy: string;
  status?: RegistrationDraftStatus;
  registeredPersonId?: number | null;
  generatedId?: string | null;
  registeredCardId?: number | null;
}): Promise<PatientRegistrationDraft> {
  const now = new Date().toISOString();
  const id = input.id || `DR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = await db.drafts.get(id);
  const draft: PatientRegistrationDraft = {
    id,
    form: input.form,
    step: input.step,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    savedBy: existing?.savedBy || input.savedBy,
    status: input.status || 'In Progress',
    version: (existing?.version ?? 0) + 1,
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    syncStatus: 'local',
    registeredPersonId:
      input.registeredPersonId !== undefined
        ? input.registeredPersonId
        : existing?.registeredPersonId ?? null,
    generatedId:
      input.generatedId !== undefined ? input.generatedId : existing?.generatedId ?? null,
    registeredCardId:
      input.registeredCardId !== undefined
        ? input.registeredCardId
        : existing?.registeredCardId ?? null,
  };
  await db.drafts.put(draft);
  return draft;
}

export async function deleteRegistrationDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}

export async function markDraftSubmitted(id: string): Promise<void> {
  const existing = await db.drafts.get(id);
  if (!existing) return;
  await db.drafts.put({
    ...existing,
    status: 'Submitted',
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  });
}
