import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRecordsForMonth = vi.fn();
const mockGetRecordsRange = vi.fn();
const mockSaveRecords = vi.fn();
const mockGetRemoteRecordsRange = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockSaveAs = vi.fn();

vi.mock('@/services/storage/indexedDBService', () => ({
  getRecordsForMonth: mockGetRecordsForMonth,
  getRecordsRange: mockGetRecordsRange,
  saveRecords: mockSaveRecords,
}));

vi.mock('@/services/storage/firestoreService', () => ({
  getRecordsRangeFromFirestore: mockGetRemoteRecordsRange,
}));

vi.mock('@/services/admin/auditService', () => ({
  logAuditEvent: mockLogAuditEvent,
}));

vi.mock('@/services/admin/utils/auditUtils', () => ({
  getCurrentUserEmail: () => 'admin@hanga.roa',
}));

vi.mock('@/services/repositories/repositoryConfig', () => ({
  isFirestoreEnabled: () => true,
}));

vi.mock('file-saver', () => ({
  saveAs: mockSaveAs,
}));

describe('dataMaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports year-to-date records using a bounded date range', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-03T10:00:00-06:00'));

    mockGetRecordsRange.mockResolvedValue([
      {
        date: '2026-01-01',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-01-01T08:00:00.000Z',
      },
    ]);
    mockGetRemoteRecordsRange.mockResolvedValue([
      {
        date: '2026-01-01',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-01-01T10:00:00.000Z',
      },
      {
        date: '2026-03-03',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-03-03T10:00:00.000Z',
      },
    ]);

    const { exportYearToDateRecords } = await import('@/services/admin/dataMaintenanceService');

    await exportYearToDateRecords(2026);

    expect(mockGetRecordsRange).toHaveBeenCalledWith('2026-01-01', '2026-03-03');
    expect(mockGetRemoteRecordsRange).toHaveBeenCalledWith('2026-01-01', '2026-03-03');
    expect(mockSaveRecords).toHaveBeenCalledTimes(1);
    expect(mockSaveAs).toHaveBeenCalledTimes(1);
    expect(mockSaveAs.mock.calls[0]?.[1]).toContain('Respaldo HHR 2026 hasta Marzo_03.json');
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      'admin@hanga.roa',
      'DATA_EXPORTED',
      'dailyRecord',
      '2026-YTD',
      expect.objectContaining({
        year: 2026,
        throughDate: '2026-03-03',
        recordCount: 2,
        exportScope: 'year-to-date',
      })
    );

    vi.useRealTimers();
  });

  it('throws when there are no records to export for the selected annual range', async () => {
    mockGetRecordsRange.mockResolvedValue([]);
    mockGetRemoteRecordsRange.mockResolvedValue([]);

    const { exportYearToDateRecords } = await import('@/services/admin/dataMaintenanceService');

    await expect(exportYearToDateRecords(2026)).rejects.toThrow(
      'No hay registros para exportar en el rango anual seleccionado.'
    );
  });

  it('exports monthly records after hydrating the selected range from Firestore', async () => {
    mockGetRecordsRange.mockResolvedValue([
      {
        date: '2026-03-01',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-03-01T08:00:00.000Z',
      },
    ]);
    mockGetRemoteRecordsRange.mockResolvedValue([
      {
        date: '2026-03-01',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-03-01T10:00:00.000Z',
      },
      {
        date: '2026-03-02',
        beds: {},
        activeExtraBeds: [],
        discharges: [],
        transfers: [],
        cma: [],
        lastUpdated: '2026-03-02T10:00:00.000Z',
      },
    ]);

    const { exportMonthRecords } = await import('@/services/admin/dataMaintenanceService');

    await exportMonthRecords(2026, 3);

    expect(mockGetRecordsRange).toHaveBeenCalledWith('2026-03-01', '2026-03-31');
    expect(mockGetRemoteRecordsRange).toHaveBeenCalledWith('2026-03-01', '2026-03-31');
    expect(mockSaveRecords).toHaveBeenCalledTimes(1);
    expect(mockSaveAs.mock.calls.at(-1)?.[1]).toContain('Respaldo HHR Marzo 2026.json');
  });
});
