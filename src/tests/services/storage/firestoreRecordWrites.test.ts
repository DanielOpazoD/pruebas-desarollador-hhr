import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');

  class MockTimestamp {
    static now = vi.fn(() => new MockTimestamp());
  }

  return {
    ...actual,
    collection: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    Timestamp: MockTimestamp,
    updateDoc: vi.fn(),
  };
});

vi.mock('@/utils/networkUtils', () => ({
  withRetry: vi.fn((operation: () => Promise<unknown> | unknown) => operation()),
}));

vi.mock('@/services/storage/firestore/firestoreShared', () => ({
  flattenObject: vi.fn((value: Record<string, unknown>) => value),
  getRecordDocRef: vi.fn((date: string) => ({ date })),
  sanitizeForFirestore: vi.fn((value: unknown) => value),
}));

vi.mock('@/services/storage/firestore/firestoreWriteSupport', () => ({
  ConcurrencyError: class ConcurrencyError extends Error {},
  asFirestoreUpdatePayload: vi.fn((payload: Record<string, unknown>) => payload),
  assertFirestoreConcurrency: vi.fn(),
  createDeletedRecordRef: vi.fn((date: string) => ({ trashRef: date })),
  saveHistorySnapshot: vi.fn(),
}));

import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  deleteRecordFromFirestore,
  moveRecordToTrash,
  saveRecordToFirestore,
  updateRecordPartial,
} from '@/services/storage/firestore/firestoreRecordWrites';

describe('firestoreRecordWrites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves full records after concurrency and history checks', async () => {
    await saveRecordToFirestore({
      date: '2026-03-14',
      beds: {},
    } as never);

    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setDoc).mock.calls[0]?.[0]).toEqual({ date: '2026-03-14' });
  });

  it('updates partial records and falls back to setDoc when update target is missing', async () => {
    await updateRecordPartial('2026-03-14', { status: 'ok' } as never);
    expect(updateDoc).toHaveBeenCalledTimes(1);

    vi.mocked(updateDoc).mockRejectedValueOnce({ code: 'not-found' });
    await updateRecordPartial('2026-03-15', { status: 'created' } as never);
    expect(setDoc).toHaveBeenCalledWith(
      { date: '2026-03-15' },
      expect.objectContaining({ status: 'created' }),
      { merge: true }
    );
  });

  it('deletes records and moves them to trash', async () => {
    await deleteRecordFromFirestore('2026-03-14');
    expect(deleteDoc).toHaveBeenCalledWith({ date: '2026-03-14' });

    await moveRecordToTrash({
      date: '2026-03-14',
      beds: {},
    } as never);
    expect(setDoc).toHaveBeenCalledWith(
      { trashRef: '2026-03-14' },
      expect.objectContaining({
        date: '2026-03-14',
        originalDate: '2026-03-14',
      })
    );
  });
});
