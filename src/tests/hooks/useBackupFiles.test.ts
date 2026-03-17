import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBackupFiles } from '@/hooks/useBackupFiles';
import {
  executeListBackupCrudFiles,
  executeGetBackupCrudFile,
  executeDeleteBackupCrudFile,
  executeCheckBackupCrudExists,
} from '@/application/backup-export/backupFilesUseCases';

vi.mock('@/application/backup-export/backupFilesUseCases', () => ({
  executeListBackupCrudFiles: vi
    .fn()
    .mockResolvedValue({ status: 'success', data: [], issues: [] }),
  executeGetBackupCrudFile: vi.fn().mockResolvedValue({
    status: 'success',
    data: { id: 'test-1', content: {} },
    issues: [],
  }),
  executeDeleteBackupCrudFile: vi.fn().mockResolvedValue({
    status: 'success',
    data: { deleted: true },
    issues: [],
  }),
  executeSaveNursingHandoffCrudBackup: vi.fn().mockResolvedValue({
    status: 'success',
    data: 'new-id',
    issues: [],
  }),
  executeCheckBackupCrudExists: vi.fn().mockResolvedValue({
    status: 'success',
    data: false,
    issues: [],
  }),
}));

describe('useBackupFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return all backup file functions', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.loadFiles).toBe('function');
    expect(typeof result.current.loadFile).toBe('function');
    expect(typeof result.current.removeFile).toBe('function');
    expect(typeof result.current.setFilters).toBe('function');
    expect(typeof result.current.clearSelectedFile).toBe('function');
    expect(typeof result.current.saveNursingHandoff).toBe('function');
    expect(typeof result.current.checkExists).toBe('function');
  });

  it('should load files on mount', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(executeListBackupCrudFiles).toHaveBeenCalled();
  });

  it('should load single file', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.loadFile('test-1');
    });

    expect(executeGetBackupCrudFile).toHaveBeenCalledWith('test-1');
  });

  it('should clear selected file', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.clearSelectedFile();
    });

    expect(result.current.selectedFile).toBeNull();
  });

  it('should delete file', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const success = await result.current.removeFile('test-1');
      expect(success).toBe(true);
    });

    expect(executeDeleteBackupCrudFile).toHaveBeenCalledWith('test-1');
  });

  it('prefers userSafeMessage when listing files fails', async () => {
    vi.mocked(executeListBackupCrudFiles).mockResolvedValueOnce({
      status: 'failed',
      data: [],
      issues: [{ kind: 'unknown', message: 'raw message', userSafeMessage: 'safe list message' }],
      userSafeMessage: 'safe list message',
    });

    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.error).toBe('safe list message');
    });
  });

  it('should check if backup exists', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const exists = await result.current.checkExists('2024-12-28', 'night');
      expect(exists).toBe(false);
    });

    expect(executeCheckBackupCrudExists).toHaveBeenCalledWith('2024-12-28', 'night');
  });

  it('should set filters', async () => {
    const { result } = renderHook(() => useBackupFiles());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setFilters({ type: 'NURSING_HANDOFF' });
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ type: 'NURSING_HANDOFF' });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(executeListBackupCrudFiles).toHaveBeenCalledWith({ type: 'NURSING_HANDOFF' });
    });

    const lastCallArgs = vi.mocked(executeListBackupCrudFiles).mock.calls.at(-1);
    expect(lastCallArgs?.[0]).toEqual({ type: 'NURSING_HANDOFF' });
  });
});
