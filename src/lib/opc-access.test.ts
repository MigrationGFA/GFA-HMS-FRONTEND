import { describe, expect, it } from 'vitest';
import { canExportOpcCsv, canUseConfidentialNotes } from './opc-access';

describe('opc access guards', () => {
  it('allows csv export for approved roles only', () => {
    expect(canExportOpcCsv('superadmin')).toBe(true);
    expect(canExportOpcCsv('psychopc')).toBe(true);
    expect(canExportOpcCsv('nurse')).toBe(false);
  });

  it('allows confidential notes for clinical privileged roles', () => {
    expect(canUseConfidentialNotes('doctor')).toBe(true);
    expect(canUseConfidentialNotes('admin')).toBe(true);
    expect(canUseConfidentialNotes('records')).toBe(false);
  });
});
