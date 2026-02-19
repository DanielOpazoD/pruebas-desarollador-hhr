import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDailyRecordSyncQuery } from '@/hooks/useDailyRecordSyncQuery';
import { ConcurrencyError } from '@/services/storage/firestoreService';
import { createQueryClientTestWrapper } from '@/tests/utils/queryClientTestUtils';
import { DailyRecord } from '@/types';

const mockSubscribe = vi.fn();
const mockGetForDate = vi.fn();
const mockSave = vi.fn();
const mockUpdatePartial = vi.fn();

const mockNotifyError = vi.fn();

vi.mock('@/services/repositories/DailyRecordRepository', () => {
  const mockImpl = {
    getForDate: (date: string) => mockGetForDate(date),
    save: (record: DailyRecord) => mockSave(record),
    updatePartial: (date: string, partial: Record<string, unknown>) =>
      mockUpdatePartial(date, partial),
    subscribe: (
      date: string,
      cb: (record: DailyRecord | null, hasPendingWrites: boolean) => void
    ) => {
      mockSubscribe(date, cb);
      return () => {};
    },
    initializeDay: vi.fn(),
    deleteDay: vi.fn(),
    getPreviousDay: vi.fn(),
    getAllDates: vi.fn(),
    copyPatientToDate: vi.fn(),
    syncWithFirestore: vi.fn(),
  };

  return {
    ...mockImpl,
    DailyRecordRepository: mockImpl,
  };
});

vi.mock('@/context/UIContext', () => ({
  useNotification: () => ({
    error: mockNotifyError,
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const createWrapper = () => {
  const { wrapper } = createQueryClientTestWrapper();
  return wrapper;
};

const buildRecord = (date: string, name: string): DailyRecord =>
  ({
    date,
    beds: {
      R1: {
        bedId: 'R1',
        isBlocked: false,
        bedMode: 'Cama',
        hasCompanionCrib: false,
        patientName: name,
        rut: '11.111.111-1',
        age: '40a',
        pathology: 'Diag',
        specialty: 'Med Interna',
        status: 'Estable',
        admissionDate: date,
        hasWristband: false,
        devices: [],
        surgicalComplication: false,
        isUPC: false,
      },
    },
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: `${date}T10:00:00.000Z`,
    nurses: [],
    activeExtraBeds: [],
  }) as unknown as DailyRecord;

describe('Sync UI Resilience Integration', () => {
  const date = '2026-02-19';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockUpdatePartial.mockResolvedValue(undefined);
  });

  it('ignores remote echo updates while hasPendingWrites is true', async () => {
    const localRecord = buildRecord(date, 'Paciente Local');
    const remoteEcho = buildRecord(date, 'Paciente Remoto');
    mockGetForDate.mockResolvedValue(localRecord);

    const { result } = renderHook(() => useDailyRecordSyncQuery(date, false, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.record?.beds.R1.patientName).toBe('Paciente Local');
    });

    const subscribeCallback = mockSubscribe.mock.calls[0][1];

    await act(async () => {
      subscribeCallback(remoteEcho, true);
    });

    expect(result.current.record?.beds.R1.patientName).toBe('Paciente Local');
  });

  it('reports ConcurrencyError and schedules automatic refetch', async () => {
    const record = buildRecord(date, 'Paciente Local');
    mockGetForDate.mockResolvedValue(record);
    mockSave.mockRejectedValueOnce(new ConcurrencyError('Remote is newer'));

    const { result } = renderHook(() => useDailyRecordSyncQuery(date, false, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.record).not.toBeNull();
    });

    await act(async () => {
      await result.current.saveAndUpdate(record).catch(() => undefined);
    });

    await waitFor(() => {
      expect(mockNotifyError).toHaveBeenCalledWith('Conflicto de Edición', 'Remote is newer');
      expect(result.current.syncStatus).toBe('error');
    });

    mockGetForDate.mockClear();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 2100));
    });

    expect(mockGetForDate).toHaveBeenCalledWith(date);
  });

  it('rolls back optimistic patch when update fails with permission-denied', async () => {
    const originalRecord = buildRecord(date, 'Paciente Original');
    mockGetForDate.mockResolvedValue(originalRecord);
    mockUpdatePartial.mockRejectedValueOnce({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions',
    });

    const { result } = renderHook(() => useDailyRecordSyncQuery(date, false, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.record?.beds.R1.patientName).toBe('Paciente Original');
    });

    await act(async () => {
      await result.current
        .patchRecord({ 'beds.R1.patientName': 'Paciente Nuevo' })
        .catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.record?.beds.R1.patientName).toBe('Paciente Original');
    });
  });
});
