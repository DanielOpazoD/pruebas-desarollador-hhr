import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBackupFilesQuery } from '@/hooks/useBackupFilesQuery';
import { createQueryClientTestWrapper } from '@/tests/utils/queryClientTestUtils';
import type { BackupFolder } from '@/hooks/useBackupFilesQuery';
import * as backupExportUseCases from '@/application/backup-export/backupExportUseCases';

vi.mock('@/application/backup-export/backupExportUseCases', async () => {
  const actual = await vi.importActual<
    typeof import('@/application/backup-export/backupExportUseCases')
  >('@/application/backup-export/backupExportUseCases');
  return {
    ...actual,
    executeListBackupFiles: vi.fn(),
  };
});

describe('useBackupFilesQuery', () => {
  const createWrapper = () => createQueryClientTestWrapper().wrapper;

  it('should fetch years when path is empty', async () => {
    vi.mocked(backupExportUseCases.executeListBackupFiles).mockResolvedValueOnce({
      status: 'success',
      data: {
        items: [
          { type: 'folder', data: { name: '2024', type: 'year' } },
          { type: 'folder', data: { name: '2023', type: 'year' } },
        ],
        report: {
          skippedNotFound: 0,
          skippedRestricted: 0,
          skippedUnknown: 0,
          skippedUnparsed: 0,
          timedOut: false,
        },
      },
      issues: [],
    });
    const { result } = renderHook(() => useBackupFilesQuery('handoff', []), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].type).toBe('folder');
  });

  it('should fetch months when path has year', async () => {
    vi.mocked(backupExportUseCases.executeListBackupFiles).mockResolvedValueOnce({
      status: 'success',
      data: {
        items: [{ type: 'folder', data: { name: 'Enero', number: '01', type: 'month' } }],
        report: {
          skippedNotFound: 0,
          skippedRestricted: 0,
          skippedUnknown: 0,
          skippedUnparsed: 0,
          timedOut: false,
        },
      },
      issues: [],
    });
    const { result } = renderHook(() => useBackupFilesQuery('handoff', ['2024']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.length).toBe(1);
    expect((result.current.data?.[0].data as BackupFolder).name).toBe('Enero');
  });

  it('should fetch files when path has year and month', async () => {
    vi.mocked(backupExportUseCases.executeListBackupFiles).mockResolvedValueOnce({
      status: 'success',
      data: {
        items: [],
        report: {
          skippedNotFound: 0,
          skippedRestricted: 0,
          skippedUnknown: 0,
          skippedUnparsed: 0,
          timedOut: false,
        },
      },
      issues: [],
    });
    const { result } = renderHook(() => useBackupFilesQuery('handoff', ['2024', 'Enero']), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should use census service for census type', async () => {
    vi.mocked(backupExportUseCases.executeListBackupFiles).mockResolvedValueOnce({
      status: 'success',
      data: {
        items: [{ type: 'folder', data: { name: '2024', type: 'year' } }],
        report: {
          skippedNotFound: 0,
          skippedRestricted: 0,
          skippedUnknown: 0,
          skippedUnparsed: 0,
          timedOut: false,
        },
      },
      issues: [],
    });
    const { result } = renderHook(() => useBackupFilesQuery('census', []), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.length).toBe(1);
    expect(backupExportUseCases.executeListBackupFiles).toHaveBeenCalledWith({
      backupType: 'census',
      path: [],
    });
  });
});
