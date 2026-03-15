import { describe, expect, it, vi } from 'vitest';

import {
  executeLoadSharedCensusFiles,
  executeLogSharedCensusAccess,
} from '@/application/backup-export/sharedCensusFilesUseCases';

describe('sharedCensusFilesUseCases', () => {
  it('returns failed outcome when file loading controller fails', async () => {
    const result = await executeLoadSharedCensusFiles(new Date('2026-03-15T10:00:00.000Z'), {
      sharedCensusFilesPort: {
        listFilesInMonth: vi.fn().mockRejectedValue(new Error('storage down')),
      },
    });

    expect(result.status).toBe('failed');
    expect(result.data).toEqual([]);
    expect(result.issues[0]?.message).toBe('No se pudieron cargar los archivos del censo.');
  });

  it('forwards access log through census access port', async () => {
    const logAccess = vi.fn().mockResolvedValue(undefined);

    await executeLogSharedCensusAccess(
      {
        userId: 'user-1',
        email: 'viewer@example.com',
        action: 'view_file',
        fileName: 'file.xlsx',
      },
      {
        censusAccessPort: { logAccess },
      }
    );

    expect(logAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      email: 'viewer@example.com',
      action: 'view_file',
      fileName: 'file.xlsx',
    });
  });
});
