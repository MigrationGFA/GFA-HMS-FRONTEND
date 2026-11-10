import Dexie, { type Table } from 'dexie';

export type ClinicalNoteDraftSyncStatus = 'local' | 'pending' | 'synced' | 'error';

export type ClinicalNoteDraft = {
  clinicalNoteId: number;
  fields: Record<string, string>;
  noteType: string;
  version: number;
  updatedAt: string;
  syncStatus: ClinicalNoteDraftSyncStatus;
  lastSyncedAt?: string | null;
  idempotencyKey?: string;
};

class ClinicalNoteDraftDb extends Dexie {
  drafts!: Table<ClinicalNoteDraft, number>;

  constructor() {
    super('gfa_clinical_note_drafts');
    this.version(1).stores({
      drafts: 'clinicalNoteId, updatedAt, syncStatus',
    });
  }
}

const db = new ClinicalNoteDraftDb();

export async function getClinicalNoteDraft(
  clinicalNoteId: number,
): Promise<ClinicalNoteDraft | undefined> {
  return db.drafts.get(clinicalNoteId);
}

export async function upsertClinicalNoteDraft(input: {
  clinicalNoteId: number;
  fields: Record<string, string>;
  noteType: string;
  version: number;
  syncStatus?: ClinicalNoteDraftSyncStatus;
  idempotencyKey?: string;
}): Promise<ClinicalNoteDraft> {
  const now = new Date().toISOString();
  const existing = await db.drafts.get(input.clinicalNoteId);
  const draft: ClinicalNoteDraft = {
    clinicalNoteId: input.clinicalNoteId,
    fields: { ...input.fields },
    noteType: input.noteType,
    version: input.version,
    updatedAt: now,
    syncStatus: input.syncStatus ?? 'local',
    lastSyncedAt: existing?.lastSyncedAt ?? null,
    idempotencyKey: input.idempotencyKey ?? existing?.idempotencyKey,
  };
  await db.drafts.put(draft);
  return draft;
}

export async function markClinicalNoteDraftSynced(
  clinicalNoteId: number,
  version: number,
): Promise<void> {
  const existing = await db.drafts.get(clinicalNoteId);
  if (!existing) return;
  await db.drafts.put({
    ...existing,
    version,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteClinicalNoteDraft(clinicalNoteId: number): Promise<void> {
  await db.drafts.delete(clinicalNoteId);
}
