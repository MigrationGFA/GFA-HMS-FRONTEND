import Dexie, { type Table } from 'dexie';

export type EncounterDraftSyncStatus = 'local' | 'pending' | 'synced' | 'error';

export type EncounterDraftNote = {
  chiefComplaint: string;
  history: string;
  examination: string;
  assessment: string;
  plan: string;
  pastMedicalHistory: string;
  drugHistory: string;
  allergyHistory: string;
  familyHistory: string;
  socialHistory: string;
  followUpPlan: string;
};

export type EncounterDraft = {
  encounterId: number;
  note: EncounterDraftNote;
  version: number;
  updatedAt: string;
  syncStatus: EncounterDraftSyncStatus;
  lastSyncedAt?: string | null;
  idempotencyKey?: string;
};

class EncounterDraftDb extends Dexie {
  drafts!: Table<EncounterDraft, number>;

  constructor() {
    super('gfa_encounter_drafts');
    this.version(1).stores({
      drafts: 'encounterId, updatedAt, syncStatus',
    });
  }
}

const db = new EncounterDraftDb();

function normalizeNote(note: Partial<EncounterDraftNote> | undefined): EncounterDraftNote {
  return {
    chiefComplaint: note?.chiefComplaint ?? '',
    history: note?.history ?? '',
    examination: note?.examination ?? '',
    assessment: note?.assessment ?? '',
    plan: note?.plan ?? '',
    pastMedicalHistory: note?.pastMedicalHistory ?? '',
    drugHistory: note?.drugHistory ?? '',
    allergyHistory: note?.allergyHistory ?? '',
    familyHistory: note?.familyHistory ?? '',
    socialHistory: note?.socialHistory ?? '',
    followUpPlan: note?.followUpPlan ?? '',
  };
}

export async function getEncounterDraft(
  encounterId: number,
): Promise<EncounterDraft | undefined> {
  const row = await db.drafts.get(encounterId);
  if (!row) return undefined;
  return { ...row, note: normalizeNote(row.note) };
}

export async function upsertEncounterDraft(input: {
  encounterId: number;
  note: Partial<EncounterDraftNote>;
  version: number;
  syncStatus?: EncounterDraftSyncStatus;
  idempotencyKey?: string;
}): Promise<EncounterDraft> {
  const now = new Date().toISOString();
  const existing = await db.drafts.get(input.encounterId);
  const draft: EncounterDraft = {
    encounterId: input.encounterId,
    note: normalizeNote(input.note),
    version: input.version,
    updatedAt: now,
    syncStatus: input.syncStatus ?? 'local',
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    idempotencyKey: input.idempotencyKey ?? existing?.idempotencyKey,
  };
  await db.drafts.put(draft);
  return draft;
}

export async function markEncounterDraftSynced(
  encounterId: number,
  version: number,
): Promise<void> {
  const existing = await db.drafts.get(encounterId);
  if (!existing) return;
  await db.drafts.put({
    ...existing,
    version,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteEncounterDraft(encounterId: number): Promise<void> {
  await db.drafts.delete(encounterId);
}
