import { describe, expect, it } from 'vitest';
import { summarizeBackupImportOutcome } from '@/hooks/controllers/backupImportFeedbackController';

describe('backupImportFeedbackController', () => {
  it('summarizes repaired and partial imports', () => {
    expect(
      summarizeBackupImportOutcome({
        success: 2,
        failed: 0,
        repaired: 1,
        outcome: 'repaired',
      })
    ).toContain('1 requirieron reparación automática');

    expect(
      summarizeBackupImportOutcome({
        success: 2,
        failed: 1,
        repaired: 1,
        outcome: 'partial',
      })
    ).toContain('1 fallaron');
  });
});
