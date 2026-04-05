vi.unmock('@/services/repositories/dailyRecordRepositoryReadService');
vi.unmock('@/services/repositories/dailyRecordRepositoryWriteService');
vi.unmock('@/services/repositories/dailyRecordRepositoryInitializationService');
vi.unmock('@/services/repositories/dailyRecordRepositorySyncService');
vi.unmock('@/services/repositories/CatalogRepository');

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  copyPatientToDate,
  copyPatientToDateDetailed,
  initializeDay,
  initializeDayDetailed,
} from '@/services/repositories/dailyRecordRepositoryInitializationService';
import { deleteDailyRecordAcrossStores as deleteDay } from '@/services/repositories/dailyRecordRepositoryFacadeSupport';
import { isFirestoreEnabled, setFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import { save, updatePartial } from '@/services/repositories/dailyRecordRepositoryWriteService';
import { syncWithFirestore } from '@/services/repositories/dailyRecordRepositorySyncService';
import {
  bridgeLegacyRecordForDate,
  getAvailableDates,
  getForDate,
  getForDateWithMeta,
  getPreviousDay,
  getPreviousDayWithMeta,
} from '@/services/repositories/dailyRecordRepositoryReadService';
import { CatalogRepository } from '@/services/repositories/CatalogRepository';
import * as idbService from '@/services/storage/indexedDBService';
import * as firestoreService from '@/services/storage/firestore';
import * as legacyBridge from '@/services/storage/migration/legacyFirestoreBridge';
import type { CudyrScore } from '@/types/domain/cudyr';
import type { DailyRecord } from '@/types/domain/dailyRecord';
import type { DailyRecordPatch } from '@/types/domain/dailyRecordPatch';
import type { PatientData } from '@/types/domain/patient';
import { PatientStatus, Specialty } from '@/types/domain/patientClassification';
import { logError } from '@/services/utils/errorService';

vi.mock('@/services/utils/errorService', () => ({
  logError: vi.fn(),
}));

const { legacyFirebaseMock, indexedDbFacadeMock, firestoreMock } = vi.hoisted(() => ({
  legacyFirebaseMock: {
    getLegacyRecord: vi.fn().mockResolvedValue(null),
    getLegacyNurseCatalog: vi.fn().mockResolvedValue([]),
    getLegacyTensCatalog: vi.fn().mockResolvedValue([]),
    getLegacyRecordsRange: vi.fn().mockResolvedValue([]),
  },
  indexedDbFacadeMock: {
    getRecordForDate: vi.fn().mockResolvedValue(null),
    getPreviousDayRecord: vi.fn().mockResolvedValue(null),
    saveRecord: vi.fn(),
    deleteRecord: vi.fn(),
    getAllRecords: vi.fn().mockResolvedValue([]),
    getAllDates: vi.fn().mockResolvedValue([]),
    getRecordsRange: vi.fn().mockResolvedValue([]),
    getRecordsForMonth: vi.fn().mockResolvedValue([]),
    saveRecords: vi.fn(),
    saveCatalog: vi.fn(),
    getCatalog: vi.fn().mockResolvedValue([]),
    getCatalogValues: vi.fn().mockResolvedValue([]),
    saveCatalogValues: vi.fn(),
    isIndexedDBAvailable: vi.fn().mockReturnValue(true),
  },
  firestoreMock: {
    saveRecordToFirestore: vi.fn(),
    subscribeToRecord: vi.fn(() => () => {}),
    deleteRecordFromFirestore: vi.fn(),
    updateRecordPartial: vi.fn(),
    getRecordFromFirestore: vi.fn(),
    getRecordFromFirestoreDetailed: vi.fn(),
    getAvailableDatesFromFirestore: vi.fn().mockResolvedValue([]),
    saveNurseCatalogToFirestore: vi.fn(),
    saveTensCatalogToFirestore: vi.fn(),
    getNurseCatalogFromFirestore: vi.fn().mockResolvedValue([]),
    getTensCatalogFromFirestore: vi.fn().mockResolvedValue([]),
    getProfessionalsCatalogFromFirestore: vi.fn().mockResolvedValue([]),
    saveProfessionalsCatalogToFirestore: vi.fn(),
    subscribeToNurseCatalog: vi.fn(() => () => {}),
    subscribeToTensCatalog: vi.fn(() => () => {}),
    subscribeToProfessionalsCatalog: vi.fn(() => () => {}),
    moveRecordToTrash: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/storage/migration/legacyFirestoreBridge', () => legacyFirebaseMock);
vi.mock('@/services/storage/indexedDBService', () => indexedDbFacadeMock);
vi.mock('@/services/storage/indexeddb/indexedDbRecordService', () => ({
  getRecordForDate: indexedDbFacadeMock.getRecordForDate,
  getPreviousDayRecord: indexedDbFacadeMock.getPreviousDayRecord,
  saveRecord: indexedDbFacadeMock.saveRecord,
  deleteRecord: indexedDbFacadeMock.deleteRecord,
  getAllRecords: indexedDbFacadeMock.getAllRecords,
  getAllDates: indexedDbFacadeMock.getAllDates,
  getRecordsRange: indexedDbFacadeMock.getRecordsRange,
  getRecordsForMonth: indexedDbFacadeMock.getRecordsForMonth,
  saveRecords: indexedDbFacadeMock.saveRecords,
}));
vi.mock('@/services/storage/records', () => ({
  getRecordForDate: indexedDbFacadeMock.getRecordForDate,
  getPreviousDayRecord: indexedDbFacadeMock.getPreviousDayRecord,
  saveRecord: indexedDbFacadeMock.saveRecord,
  deleteRecord: indexedDbFacadeMock.deleteRecord,
  getAllRecords: indexedDbFacadeMock.getAllRecords,
  getAllDates: indexedDbFacadeMock.getAllDates,
  getRecordsRange: indexedDbFacadeMock.getRecordsRange,
  getRecordsForMonth: indexedDbFacadeMock.getRecordsForMonth,
  saveRecords: indexedDbFacadeMock.saveRecords,
}));
vi.mock('@/services/storage/indexeddb/indexedDbCatalogService', () => ({
  saveCatalog: indexedDbFacadeMock.saveCatalog,
  getCatalog: indexedDbFacadeMock.getCatalog,
  getCatalogValues: indexedDbFacadeMock.getCatalogValues,
  saveCatalogValues: indexedDbFacadeMock.saveCatalogValues,
}));
vi.mock('@/services/storage/firestore', () => firestoreMock);

const Repository = {
  bridgeLegacyRecord: bridgeLegacyRecordForDate,
  copyPatientToDate,
  copyPatientToDateDetailed,
  deleteDay,
  getAvailableDates,
  getForDate,
  getForDateWithMeta,
  getPreviousDay,
  getPreviousDayWithMeta,
  initializeDay,
  initializeDayDetailed,
  isFirestoreEnabled,
  save,
  setFirestoreEnabled,
  syncWithFirestore,
  updatePartial,
  CatalogRepository,
};

describe('DailyRecordRepository lifecycle', () => {
  const mockDate = '2025-01-01';
  const buildCudyr = (overrides: Partial<CudyrScore> = {}): CudyrScore => ({
    changeClothes: 0,
    mobilization: 0,
    feeding: 0,
    elimination: 0,
    psychosocial: 0,
    surveillance: 0,
    vitalSigns: 0,
    fluidBalance: 0,
    oxygenTherapy: 0,
    airway: 0,
    proInterventions: 0,
    skinCare: 0,
    pharmacology: 0,
    invasiveElements: 0,
    ...overrides,
  });

  const buildPatient = (overrides: Partial<PatientData> = {}): PatientData => ({
    bedId: 'R1',
    isBlocked: false,
    bedMode: 'Cama',
    hasCompanionCrib: false,
    patientName: '',
    rut: '',
    age: '',
    pathology: '',
    specialty: Specialty.MEDICINA,
    status: PatientStatus.ESTABLE,
    admissionDate: '',
    hasWristband: false,
    devices: [],
    surgicalComplication: false,
    isUPC: false,
    ...overrides,
  });

  const mockRecord: DailyRecord = {
    date: mockDate,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: `${mockDate}T00:00:00.000Z`,
    nurses: ['', ''],
    nursesDayShift: ['', ''],
    nursesNightShift: ['', ''],
    tensDayShift: ['', '', ''],
    tensNightShift: ['', '', ''],
    activeExtraBeds: [],
    handoffDayChecklist: {},
    handoffNightChecklist: {},
    handoffNightReceives: [],
    handoffNovedadesDayShift: '',
    handoffNovedadesNightShift: '',
    medicalHandoffNovedades: '',
    schemaVersion: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(idbService.getRecordForDate).mockReset();
    vi.mocked(idbService.getPreviousDayRecord).mockReset();
    vi.mocked(idbService.saveRecord).mockReset();
    vi.mocked(firestoreService.getRecordFromFirestore).mockReset();
    vi.mocked(firestoreService.saveRecordToFirestore).mockReset();
    vi.mocked(firestoreService.updateRecordPartial).mockReset();

    Repository.setFirestoreEnabled(true);
    vi.mocked(idbService.getRecordForDate).mockResolvedValue(null);
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValue(null);
    vi.mocked(firestoreService.getRecordFromFirestoreDetailed).mockImplementation(
      async (date: string) => {
        try {
          const record = await vi.mocked(firestoreService.getRecordFromFirestore)(date);
          return {
            status: record ? 'resolved' : 'missing',
            record,
          };
        } catch (error) {
          return {
            status: 'failed',
            record: null,
            error,
          };
        }
      }
    );
  });

  it('saves to both local and remote', async () => {
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(null);

    await Repository.save(mockRecord);

    expect(idbService.saveRecord).toHaveBeenCalled();
    expect(firestoreService.saveRecordToFirestore).toHaveBeenCalled();
  });

  it('logs invariant repairs when record is auto-corrected', async () => {
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(null);

    await Repository.save(mockRecord);

    expect(vi.mocked(logError)).toHaveBeenCalledWith(
      'Invariant repair applied on save',
      undefined,
      expect.objectContaining({
        date: mockDate,
        patches: expect.any(Array),
      })
    );
  });

  it('blocks save if regression detected', async () => {
    const remoteWithData: DailyRecord = {
      ...mockRecord,
      beds: {},
    };
    for (let i = 0; i < 10; i++) {
      remoteWithData.beds[`BED_${i}`] = buildPatient({ patientName: `Patient ${i}` });
    }

    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(remoteWithData);

    await expect(Repository.save(mockRecord)).rejects.toThrow(
      'Se detectó una pérdida masiva de datos'
    );
  });

  it('returns existing record if initializeDay finds one', async () => {
    vi.mocked(idbService.getRecordForDate).mockResolvedValueOnce(mockRecord);
    const result = await Repository.initializeDay(mockDate);
    expect(result).toMatchObject({
      ...mockRecord,
      beds: expect.any(Object),
    });
  });

  it('creates new record and copies from previous day if available', async () => {
    const prevRecord = {
      ...mockRecord,
      date: '2024-12-31',
      nursesNightShift: ['Nurse A', 'Nurse B'],
      beds: { R1: buildPatient({ patientName: 'Patient X' }) },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date =>
      date === '2024-12-31' ? prevRecord : null
    );
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(null);

    const result = await Repository.initializeDay(mockDate, '2024-12-31');

    expect(result.date).toBe(mockDate);
    expect(result.nursesDayShift).toEqual(['Nurse A', 'Nurse B']);
    expect(result.beds['R1'].patientName).toBe('Patient X');
  });

  it('returns semantic initialization outcome through initializeDayDetailed', async () => {
    const prevRecord = {
      ...mockRecord,
      date: '2024-12-31',
      beds: {
        R1: buildPatient({
          patientName: 'Paciente legacy',
          status: 'ESTADO_INVALIDO',
        } as unknown as Partial<PatientData>),
      },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date => {
      if (date === mockDate) return null;
      if (date === '2024-12-31') return prevRecord;
      return null;
    });

    const result = await Repository.initializeDayDetailed(mockDate, '2024-12-31');

    expect(result.outcome).toBe('repaired');
    expect(result.sourceMigrationRulesApplied.length).toBeGreaterThan(0);
  });

  it('falls back to firestore during initialization if not found locally', async () => {
    vi.mocked(idbService.getRecordForDate).mockResolvedValueOnce(null);
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(mockRecord);

    const result = await Repository.initializeDay(mockDate);
    expect(result).toMatchObject({
      ...mockRecord,
      beds: expect.any(Object),
    });
    expect(idbService.saveRecord).toHaveBeenCalled();
  });

  it('preserves CIE-10 from copy source when remote initialization record already exists', async () => {
    const copySourceRecord = {
      ...mockRecord,
      date: '2024-12-31',
      beds: {
        R1: buildPatient({
          bedId: 'R1',
          patientName: 'Paciente remoto',
          cie10Code: 'I48.0',
          cie10Description: 'Fibrilacion auricular',
        }),
      },
    };
    const remoteRecord = {
      ...mockRecord,
      beds: {
        R1: buildPatient({
          bedId: 'R1',
          patientName: 'Paciente remoto',
          cie10Code: undefined,
          cie10Description: undefined,
        }),
      },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date =>
      date === '2024-12-31' ? copySourceRecord : null
    );
    vi.mocked(firestoreService.getRecordFromFirestore).mockImplementation(async date => {
      if (date === mockDate) return null;
      if (date === '2024-12-31') return remoteRecord;
      return null;
    });

    const result = await Repository.initializeDay(mockDate, '2024-12-31');

    expect(result.beds.R1.cie10Code).toBe('I48.0');
    expect(result.beds.R1.cie10Description).toBe('Fibrilacion auricular');
    expect(idbService.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        beds: expect.objectContaining({
          R1: expect.objectContaining({
            cie10Code: 'I48.0',
            cie10Description: 'Fibrilacion auricular',
          }),
        }),
      })
    );
  });

  it('creates a fresh record when Firestore has no record and legacy is isolated from initialization hot path', async () => {
    vi.mocked(idbService.getRecordForDate).mockResolvedValueOnce(null);
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(null);
    vi.mocked(legacyBridge.getLegacyRecord).mockResolvedValueOnce(mockRecord);

    const result = await Repository.initializeDay(mockDate);

    expect(result.date).toBe(mockDate);
    expect(result.beds).toBeDefined();
    expect(legacyBridge.getLegacyRecord).not.toHaveBeenCalled();
  });

  it('creates a fresh record if no previous day exists', async () => {
    vi.mocked(idbService.getRecordForDate).mockResolvedValue(null);
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValue(null);
    vi.mocked(idbService.getPreviousDayRecord).mockResolvedValue(null);

    const result = await Repository.initializeDay(mockDate);
    expect(result.date).toBe(mockDate);
    expect(result.beds).toBeDefined();
  });

  it('updates both local and remote on updatePartial', async () => {
    const patch: DailyRecordPatch = {
      'beds.R1.patientName': 'New Name',
      'beds.R1.rut': '12.345.678-9',
    };
    vi.mocked(idbService.getRecordForDate).mockResolvedValueOnce(mockRecord);

    await Repository.updatePartial(mockDate, patch);

    expect(idbService.getRecordForDate).toHaveBeenCalledWith(mockDate);
    expect(firestoreService.updateRecordPartial).toHaveBeenCalledWith(
      mockDate,
      expect.anything(),
      mockRecord.lastUpdated
    );
  });

  it('deletes from local and moves to trash in remote', async () => {
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(mockRecord);

    await Repository.deleteDay(mockDate);
    expect(idbService.deleteRecord).toHaveBeenCalledWith(mockDate);
    expect(firestoreService.moveRecordToTrash).toHaveBeenCalledWith(mockRecord);
  });

  it('handles firestore errors during initializeDay gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(idbService.getRecordForDate).mockResolvedValue(null);
    vi.mocked(firestoreService.getRecordFromFirestore).mockRejectedValue(new Error('FS Error'));

    const result = await Repository.initializeDay(mockDate);
    expect(result.date).toBe(mockDate);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check remote sources'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('resets CUDYR when copying from previous day', async () => {
    const prevRecord = {
      ...mockRecord,
      date: '2024-12-31',
      beds: {
        R1: buildPatient({
          patientName: 'Patient X',
          cudyr: buildCudyr({ changeClothes: 2 }),
        }),
      },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date =>
      date === '2024-12-31' ? prevRecord : null
    );
    vi.mocked(firestoreService.getRecordFromFirestore).mockResolvedValueOnce(null);

    const result = await Repository.initializeDay(mockDate, '2024-12-31');

    expect(result.beds['R1'].patientName).toBe('Patient X');
    expect(result.beds['R1'].cudyr).toBeUndefined();
  });

  it('copies patient and resets CUDYR', async () => {
    const sourceDate = '2024-12-30';
    const targetDate = '2024-12-31';
    const sourceRecord = {
      ...mockRecord,
      date: sourceDate,
      beds: {
        R1: buildPatient({
          patientName: 'Patient X',
          cudyr: buildCudyr({ changeClothes: 2 }),
        }),
      },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date => {
      if (date === sourceDate) return sourceRecord;
      return null;
    });

    await Repository.copyPatientToDate(sourceDate, 'R1', targetDate, 'R2');

    expect(idbService.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        date: targetDate,
        beds: expect.objectContaining({
          R2: expect.objectContaining({
            patientName: 'Patient X',
            cudyr: undefined,
          }),
        }),
      })
    );
  });

  it('returns copy metadata through copyPatientToDateDetailed', async () => {
    const sourceDate = '2024-12-30';
    const targetDate = '2024-12-31';
    const sourceRecord = {
      ...mockRecord,
      date: sourceDate,
      beds: {
        R1: buildPatient({
          patientName: 'Patient X',
          status: 'ESTADO_INVALIDO',
        } as unknown as Partial<PatientData>),
      },
    };

    vi.mocked(idbService.getRecordForDate).mockImplementation(async date => {
      if (date === sourceDate) return sourceRecord;
      return null;
    });

    const result = await Repository.copyPatientToDateDetailed(sourceDate, 'R1', targetDate, 'R2');

    expect(result.sourceDate).toBe(sourceDate);
    expect(result.outcome).toBe('repaired');
    expect(result.sourceMigrationRulesApplied).toContain('salvage_patient_fallback_applied');
  });

  it('rejects invalid date format on initializeDay copyFromDate', async () => {
    await expect(Repository.initializeDay('2026-02-19', '19-02-2026')).rejects.toThrow(
      /Invalid date format/
    );
  });

  it('rejects empty bed ids on copyPatientToDate', async () => {
    await expect(
      Repository.copyPatientToDate('2026-02-18', '', '2026-02-19', 'R1')
    ).rejects.toThrow(/non-empty bed id/);
  });
});
