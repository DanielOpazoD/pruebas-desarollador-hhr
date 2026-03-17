import { describe, expect, it } from 'vitest';

import {
  createApplicationFailed,
  createApplicationPartial,
  createApplicationSuccess,
} from '@/application/shared/applicationOutcome';
import { presentBackupExportOutcome } from '@/hooks/controllers/backupExportOutcomeController';

describe('backupExportOutcomeController', () => {
  it('maps success to success notification', () => {
    const notice = presentBackupExportOutcome(createApplicationSuccess(null), {
      successTitle: 'ok',
      partialTitle: 'partial',
      failedTitle: 'failed',
      fallbackErrorMessage: 'fallback',
    });

    expect(notice).toEqual({
      channel: 'success',
      title: 'ok',
      message: undefined,
      state: 'ok',
      actionRequired: false,
    });
  });

  it('maps partial to warning notification', () => {
    const notice = presentBackupExportOutcome(
      createApplicationPartial(null, [{ kind: 'unknown', message: 'backup warning' }]),
      {
        successTitle: 'ok',
        partialTitle: 'partial',
        failedTitle: 'failed',
        fallbackErrorMessage: 'fallback',
      }
    );

    expect(notice.channel).toBe('warning');
    expect(notice.message).toContain('backup warning');
    expect(notice.state).toBe('pending');
    expect(notice.actionRequired).toBe(false);
  });

  it('maps failed to error notification', () => {
    const notice = presentBackupExportOutcome(
      createApplicationFailed(null, [{ kind: 'unknown', message: 'broken' }]),
      {
        successTitle: 'ok',
        partialTitle: 'partial',
        failedTitle: 'failed',
        fallbackErrorMessage: 'fallback',
      }
    );

    expect(notice).toEqual({
      channel: 'error',
      title: 'failed',
      message: 'broken',
      state: 'blocked',
      actionRequired: true,
    });
  });
});
