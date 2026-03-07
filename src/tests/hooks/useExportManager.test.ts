import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useExportManager } from '@/hooks/useExportManager';
import { DailyRecord } from '@/types';
import * as backupExportUseCases from '@/application/backup-export/backupExportUseCases';

const notificationApi = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
};

const confirmApi = {
  confirm: vi.fn().mockResolvedValue(true),
};

// Mock context
vi.mock('@/context/UIContext', () => ({
  useNotification: () => notificationApi,
  useConfirmDialog: () => confirmApi,
}));

vi.mock('@/application/backup-export/backupExportUseCases', async () => {
  const actual = await vi.importActual<
    typeof import('@/application/backup-export/backupExportUseCases')
  >('@/application/backup-export/backupExportUseCases');
  return {
    ...actual,
    executeLookupBackupArchiveStatus: vi.fn().mockResolvedValue({
      status: 'success',
      data: { exists: false, lookup: { exists: false, status: 'missing' } },
      issues: [],
    }),
    executeExportHandoffPdf: vi.fn().mockResolvedValue({
      status: 'success',
      data: null,
      issues: [],
    }),
    executeBackupCensusExcel: vi.fn().mockResolvedValue({
      status: 'success',
      data: { archivedDate: '2024-12-28', recordCount: 1 },
      issues: [],
    }),
    executeBackupHandoffPdf: vi.fn().mockResolvedValue({
      status: 'success',
      data: { shift: 'day', createdCudyrBackup: false },
      issues: [],
    }),
  };
});

describe('useExportManager', () => {
  const mockRecord: DailyRecord = {
    date: '2024-12-28',
    beds: {},
    discharges: [],
    transfers: [],
    nursesDayShift: ['Nurse A'],
    nursesNightShift: ['Nurse B'],
    handoffNightReceives: ['Nurse C'],
  } as unknown as DailyRecord;

  const defaultProps = {
    currentDateString: '2024-12-28',
    selectedYear: 2024,
    selectedMonth: 11,
    selectedDay: 28,
    record: mockRecord,
    currentModule: 'CENSUS',
    selectedShift: 'day' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    notificationApi.success.mockReset();
    notificationApi.error.mockReset();
    notificationApi.warning.mockReset();
    confirmApi.confirm.mockReset();
    confirmApi.confirm.mockResolvedValue(true);
  });

  it('should return all export functions', () => {
    const { result } = renderHook(() => useExportManager(defaultProps));

    expect(typeof result.current.handleExportPDF).toBe('function');
    expect(typeof result.current.handleBackupExcel).toBe('function');
    expect(typeof result.current.handleBackupHandoff).toBe('function');
    expect(result.current.isArchived).toBe(false);
    expect(result.current.isBackingUp).toBe(false);
  });

  it('should check archive status on mount for CENSUS module', async () => {
    const { result } = renderHook(() => useExportManager(defaultProps));

    await waitFor(() => {
      expect(result.current.isArchived).toBeDefined();
    });

    expect(backupExportUseCases.executeLookupBackupArchiveStatus).toHaveBeenCalledWith({
      backupType: 'census',
      date: '2024-12-28',
      shift: 'day',
    });
  });

  it('should check archive status for NURSING_HANDOFF module', async () => {
    const props = {
      ...defaultProps,
      currentModule: 'NURSING_HANDOFF',
    };

    const { result } = renderHook(() => useExportManager(props));

    await waitFor(() => {
      expect(result.current.isArchived).toBeDefined();
    });

    expect(backupExportUseCases.executeLookupBackupArchiveStatus).toHaveBeenCalledWith({
      backupType: 'handoff',
      date: '2024-12-28',
      shift: 'day',
    });
  });

  it('should handle null record', () => {
    const props = {
      ...defaultProps,
      record: null,
    };

    const { result } = renderHook(() => useExportManager(props));

    expect(result.current.handleExportPDF).toBeDefined();
  });

  it('surfaces degraded lookup as warning on mount', async () => {
    vi.mocked(backupExportUseCases.executeLookupBackupArchiveStatus).mockResolvedValueOnce({
      status: 'degraded',
      data: { exists: false, lookup: { exists: false, status: 'restricted' } },
      issues: [{ kind: 'unknown', message: 'Storage restringido' }],
    } as any);

    renderHook(() => useExportManager(defaultProps));

    await waitFor(() => {
      expect(notificationApi.warning).toHaveBeenCalled();
    });
  });

  it('treats a missing lookup as a non-fatal unarchived state', async () => {
    vi.mocked(backupExportUseCases.executeLookupBackupArchiveStatus).mockResolvedValueOnce({
      status: 'success',
      data: { exists: false, lookup: { exists: false, status: 'missing' } },
      issues: [],
    } as any);

    const { result } = renderHook(() => useExportManager(defaultProps));

    await waitFor(() => {
      expect(result.current.isArchived).toBe(false);
    });

    expect(notificationApi.warning).not.toHaveBeenCalled();
    expect(notificationApi.error).not.toHaveBeenCalled();
  });

  it('surfaces partial handoff backup and still marks archive state', async () => {
    vi.mocked(backupExportUseCases.executeBackupHandoffPdf).mockResolvedValueOnce({
      status: 'partial',
      data: { shift: 'day', createdCudyrBackup: false },
      issues: [{ kind: 'unknown', message: 'CUDYR mensual no pudo guardarse.' }],
    } as any);

    const { result } = renderHook(() =>
      useExportManager({
        ...defaultProps,
        currentModule: 'NURSING_HANDOFF',
      })
    );

    await waitFor(() => {
      expect(result.current.isArchived).toBeDefined();
    });

    await act(async () => {
      await result.current.handleBackupHandoff(true);
    });

    await waitFor(() => {
      expect(notificationApi.warning).toHaveBeenCalledWith(
        'Respaldo PDF guardado con observaciones',
        expect.stringContaining('CUDYR mensual')
      );
      expect(result.current.isArchived).toBe(true);
    });
  });
});
