import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './database';
import { clear, load, storageKey } from './persistence';
import { buildSeed } from './seed';

describe('database (STEP-04)', () => {
  beforeEach(() => {
    db._testReset();
  });

  afterEach(() => {
    clear();
    db._testReset();
  });

  it('seeds 8 canonical patients with GFA/HMS hospital ids', () => {
    expect(db.patients.list()).toHaveLength(8);
    const john = db.patients.get('PT-1001');
    expect(john?.name).toBe('John Doe');
    expect(john?.hospitalId).toBe('GFA/HMS/2026/000145');
  });

  it('links visits and invoices to patientId', () => {
    const visit = db.visits.get('VST-30025');
    expect(visit?.patientId).toBe('PT-1001');
    const inv = db.invoices.get('INV-BIL-1001');
    expect(inv?.patientId).toBe('PT-1001');
    expect(inv?.lines?.length).toBeGreaterThan(0);
  });

  it('creates a patient, persists to localStorage, and emits PATIENT_REGISTERED', () => {
    const events: unknown[] = [];
    db.on('PATIENT_REGISTERED', payload => events.push(payload));

    const created = db.patients.create({
      name: 'Test Patient',
      phone: '08000000000',
      sex: 'Male',
      allergies: [],
      insurance: 'None',
      source: 'Walk-in',
    });

    expect(created.hospitalId).toMatch(/^GFA\/HMS\/\d{4}\/\d{6}$/);
    expect(db.patients.get(created.id)?.name).toBe('Test Patient');
    expect(events).toHaveLength(1);

    const snap = load<ReturnType<typeof db.snapshot>>();
    expect(snap?.patients.some(p => p.name === 'Test Patient')).toBe(true);
    expect(localStorage.getItem(storageKey)).toBeTruthy();
  });

  it('seed snapshot matches billing row counts', () => {
    const seed = buildSeed();
    expect(seed.visits).toHaveLength(8);
    expect(seed.invoices).toHaveLength(8);
    expect(seed.payments).toHaveLength(7);
    expect(seed.audit.length).toBeGreaterThanOrEqual(6);
  });

  it('emits CHANGED on write so React subscribers re-render', () => {
    let changes = 0;
    db.on('CHANGED', () => { changes += 1; });
    db.audit.add({
      actor: 'Test',
      role: 'test',
      action: 'ping',
      entity: 'test',
      entityId: 'x',
    });
    expect(changes).toBeGreaterThanOrEqual(1);
  });
});
