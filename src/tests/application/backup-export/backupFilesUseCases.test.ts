import { describe, expect, it } from 'vitest';
import {
  executeCheckBackupCrudExists,
  executeDeleteBackupCrudFile,
  executeGetBackupCrudFile,
  executeListBackupCrudFiles,
  executeSaveNursingHandoffCrudBackup,
} from '@/application/backup-export/backupFilesUseCases';
import type { BackupFilesPort } from '@/application/ports/backupFilesPort';

const buildPort = (overrides: Partial<BackupFilesPort>): BackupFilesPort => ({
  listFiles: async () => ({ status: 'success', data: [] }),
  getFile: async () => ({
    status: 'success',
    data: {
      id: 'backup-1',
      type: 'NURSING_HANDOFF',
      shiftType: 'day',
      date: '2026-03-15',
      title: 'Backup',
      createdAt: '2026-03-15T10:00:00.000Z',
      createdBy: { uid: 'u1', email: 'a@b.com', name: 'Test' },
      metadata: {},
      content: {},
    },
  }),
  deleteFile: async () => ({ status: 'success', data: { deleted: true } }),
  saveNursingHandoff: async () => ({ status: 'success', data: 'backup-1' }),
  checkExists: async () => ({ status: 'success', data: true }),
  ...overrides,
});

describe('backupFilesUseCases', () => {
  it('maps not_found get-file results to a failed application outcome', async () => {
    const outcome = await executeGetBackupCrudFile('missing', {
      backupFilesPort: buildPort({
        getFile: async () => ({
          status: 'not_found',
          data: null,
          error: new Error('missing backup'),
        }),
      }),
    });

    expect(outcome.status).toBe('failed');
    expect(outcome.issues[0]?.kind).toBe('not_found');
  });

  it('maps permission denied list-file results to degraded outcomes', async () => {
    const outcome = await executeListBackupCrudFiles(undefined, {
      backupFilesPort: buildPort({
        listFiles: async () => ({
          status: 'permission_denied',
          data: null,
          error: new Error('forbidden'),
        }),
      }),
    });

    expect(outcome.status).toBe('degraded');
    expect(outcome.data).toEqual([]);
    expect(outcome.issues[0]?.kind).toBe('permission');
  });

  it('maps unauthenticated save failures to unauthorized application issues', async () => {
    const outcome = await executeSaveNursingHandoffCrudBackup(
      {
        date: '2026-03-15',
        shiftType: 'day',
        deliveryStaff: 'A',
        receivingStaff: 'B',
        content: {},
      },
      {
        backupFilesPort: buildPort({
          saveNursingHandoff: async () => ({
            status: 'unauthenticated',
            data: null,
            error: new Error('Usuario no autenticado'),
          }),
        }),
      }
    );

    expect(outcome.status).toBe('failed');
    expect(outcome.issues[0]?.kind).toBe('permission');
  });

  it('maps delete failures to failed outcomes without throwing', async () => {
    const outcome = await executeDeleteBackupCrudFile('backup-1', {
      backupFilesPort: buildPort({
        deleteFile: async () => ({
          status: 'unknown',
          data: null,
          error: new Error('delete failed'),
        }),
      }),
    });

    expect(outcome.status).toBe('failed');
    expect(outcome.data).toBeNull();
  });

  it('maps check-exists failures to degraded outcomes', async () => {
    const outcome = await executeCheckBackupCrudExists('2026-03-15', 'night', {
      backupFilesPort: buildPort({
        checkExists: async () => ({
          status: 'permission_denied',
          data: null,
          error: new Error('forbidden'),
        }),
      }),
    });

    expect(outcome.status).toBe('degraded');
    expect(outcome.data).toBe(false);
    expect(outcome.issues[0]?.kind).toBe('permission');
  });
});
