import Dexie, { type Table } from 'dexie';

/** Basket line persisted for doctor lab request drafts (IndexedDB when API has no Draft status). */
export type StoredBasketItem = {
  id: string;
  testId: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  indication: string;
  note: string;
  price: number;
  status: 'Draft';
};

export type StoredLabRequestDetails = {
  encounter: string;
  clinicalIndication: string;
  workingDiagnosis: string;
  priority: 'Routine' | 'Urgent' | 'Emergency';
  collectionLocation: string;
  fasting: string;
  preferredTime: string;
  doctorNote: string;
  billingType: string;
  urgentReason: string;
  markAllUrgent: boolean;
};

export type LabRequestPersonDraft = {
  personId: string;
  patientName: string;
  hospitalId: string;
  createdBy: string;
  items: StoredBasketItem[];
  details: StoredLabRequestDetails;
  updatedAt: string;
};

class LabRequestDraftDb extends Dexie {
  drafts!: Table<LabRequestPersonDraft, string>;

  constructor() {
    super('gfa_lab_request_drafts');
    this.version(1).stores({
      drafts: 'personId, updatedAt, hospitalId',
    });
  }
}

const db = new LabRequestDraftDb();

export async function listLabRequestDrafts(): Promise<LabRequestPersonDraft[]> {
  return db.drafts.orderBy('updatedAt').reverse().toArray();
}

export async function getLabRequestDraft(
  personId: string,
): Promise<LabRequestPersonDraft | undefined> {
  return db.drafts.get(personId);
}

export async function upsertLabRequestDraft(
  draft: Omit<LabRequestPersonDraft, 'updatedAt'> & { updatedAt?: string },
): Promise<LabRequestPersonDraft> {
  const entry: LabRequestPersonDraft = {
    ...draft,
    updatedAt: draft.updatedAt ?? new Date().toISOString(),
  };
  await db.drafts.put(entry);
  return entry;
}

export async function deleteLabRequestDraft(personId: string): Promise<void> {
  await db.drafts.delete(personId);
}
