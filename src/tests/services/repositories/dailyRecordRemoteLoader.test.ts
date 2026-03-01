import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadRemoteRecordWithFallback } from '@/services/repositories/dailyRecordRemoteLoader';
import { DataFactory } from '@/tests/factories/DataFactory';

vi.mock('@/services/storage/firestoreService', () => ({
  getRecordFromFirestore: vi.fn(),
}));

vi.mock('@/services/storage/legacyFirebaseService', () => ({
  getLegacyRecord: vi.fn(),
}));

vi.mock('@/services/storage/indexedDBService', () => ({
  saveRecord: vi.fn(),
}));

import { getRecordFromFirestore } from '@/services/storage/firestoreService';
import { getLegacyRecord } from '@/services/storage/legacyFirebaseService';
import { saveRecord } from '@/services/storage/indexedDBService';

describe('dailyRecordRemoteLoader', () => {
  const date = '2025-01-01';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns firestore metadata when the primary remote record exists', async () => {
    vi.mocked(getRecordFromFirestore).mockResolvedValue(DataFactory.createMockDailyRecord(date));

    const result = await loadRemoteRecordWithFallback(date);

    expect(result.source).toBe('firestore');
    expect(result.compatibilityTier).toBe('current_firestore');
    expect(result.compatibilityIntensity).toBe('normalized_only');
    expect(result.cachedLocally).toBe(true);
    expect(result.migrationRulesApplied).toContain('schema_defaults_applied');
    expect(saveRecord).toHaveBeenCalled();
  });

  it('returns legacy metadata when only the historical remote source exists', async () => {
    vi.mocked(getRecordFromFirestore).mockResolvedValue(null);
    vi.mocked(getLegacyRecord).mockResolvedValue(DataFactory.createMockDailyRecord(date));

    const result = await loadRemoteRecordWithFallback(date);

    expect(result.source).toBe('legacy');
    expect(result.compatibilityTier).toBe('legacy_firestore');
    expect(result.compatibilityIntensity).toBe('normalized_only');
    expect(result.cachedLocally).toBe(true);
    expect(saveRecord).toHaveBeenCalled();
  });

  it('returns not_found metadata when neither remote source has data', async () => {
    vi.mocked(getRecordFromFirestore).mockResolvedValue(null);
    vi.mocked(getLegacyRecord).mockResolvedValue(null);

    const result = await loadRemoteRecordWithFallback(date);

    expect(result.record).toBeNull();
    expect(result.source).toBe('not_found');
    expect(result.compatibilityTier).toBe('none');
    expect(result.compatibilityIntensity).toBe('none');
    expect(result.cachedLocally).toBe(false);
    expect(result.migrationRulesApplied).toEqual([]);
  });
});
