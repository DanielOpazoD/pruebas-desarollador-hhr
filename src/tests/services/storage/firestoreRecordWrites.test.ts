import { beforeEach, describe, expect, it, vi } from 'vitest';

const { firestoreWriteLoggerWarn, firestoreWriteLoggerError } = vi.hoisted(() => ({
  firestoreWriteLoggerWarn: vi.fn(),
  firestoreWriteLoggerError: vi.fn(),
}));

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

vi.mock('@/services/storage/storageLoggers', () => ({
  firestoreWriteLogger: {
    warn: firestoreWriteLoggerWarn,
    error: firestoreWriteLoggerError,
  },
}));

import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  deleteRecordFromFirestore,
  moveRecordToTrash,
  saveRecordToFirestore,
  updateRecordPartial,
} from '@/services/storage/firestore/firestoreRecordWrites';
import {
  assertFirestoreConcurrency,
  createDeletedRecordRef,
  saveHistorySnapshot,
} from '@/services/storage/firestore/firestoreWriteSupport';
import { withRetry } from '@/utils/networkUtils';

describe('firestoreRecordWrites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves full records after concurrency and history checks', async () => {
    await saveRecordToFirestore({
      date: '2026-03-14',
      beds: {},
    } as never);

    expect(assertFirestoreConcurrency).toHaveBeenCalledWith(
      { date: '2026-03-14' },
      undefined,
      'El registro ha sido modificado por otro usuario. Por favor recarga la página.',
      'save'
    );
    expect(saveHistorySnapshot).toHaveBeenCalledWith('2026-03-14');
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
    expect(firestoreWriteLoggerWarn).toHaveBeenCalledWith(
      'Firestore write fallback: partialUpdateNotFound',
      expect.objectContaining({ date: '2026-03-15' })
    );
  });

  it('rethrows write failures that are not recoverable', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('boom'));
    await expect(updateRecordPartial('2026-03-16', { status: 'broken' } as never)).rejects.toThrow(
      'boom'
    );

    vi.mocked(setDoc).mockRejectedValueOnce(new Error('save failed'));
    await expect(
      saveRecordToFirestore(
        {
          date: '2026-03-17',
          beds: {},
        } as never,
        '2026-03-16T10:00:00.000Z'
      )
    ).rejects.toThrow('save failed');

    expect(assertFirestoreConcurrency).toHaveBeenCalledWith(
      { date: '2026-03-17' },
      '2026-03-16T10:00:00.000Z',
      'El registro ha sido modificado por otro usuario. Por favor recarga la página.',
      'save'
    );
    expect(firestoreWriteLoggerError).toHaveBeenCalledWith(
      'Firestore write failed: save',
      expect.objectContaining({
        date: '2026-03-17',
        error: expect.any(Error),
      })
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

  it('rethrows delete and trash failures', async () => {
    vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('delete failed'));
    await expect(deleteRecordFromFirestore('2026-03-18')).rejects.toThrow('delete failed');

    vi.mocked(setDoc).mockRejectedValueOnce(new Error('trash failed'));
    await expect(
      moveRecordToTrash({
        date: '2026-03-18',
        beds: {},
      } as never)
    ).rejects.toThrow('trash failed');

    expect(createDeletedRecordRef).toHaveBeenCalledWith('2026-03-18');
    expect(withRetry).toHaveBeenCalled();
    expect(firestoreWriteLoggerError).toHaveBeenCalledWith(
      'Firestore write failed: moveToTrash',
      expect.objectContaining({
        date: '2026-03-18',
        error: expect.any(Error),
      })
    );
  });

  it('wires retry callbacks for save, partial update and delete operations', async () => {
    vi.mocked(withRetry).mockImplementation(
      async (
        operation: () => Promise<unknown> | unknown,
        options?: { onRetry?: (error: unknown, attempt: number, delay: number) => void }
      ) => {
        options?.onRetry?.(new Error('retry'), 1, 0);
        return operation();
      }
    );

    await saveRecordToFirestore({
      date: '2026-03-19',
      beds: {},
    } as never);
    await updateRecordPartial('2026-03-19', { status: 'ok' } as never);
    await deleteRecordFromFirestore('2026-03-19');

    expect(setDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalled();
    expect(deleteDoc).toHaveBeenCalled();
    expect(firestoreWriteLoggerWarn).toHaveBeenCalledWith(
      'Firestore write retry: save',
      expect.objectContaining({ attempt: 1, date: '2026-03-19', error: expect.any(Error) })
    );
    expect(firestoreWriteLoggerWarn).toHaveBeenCalledWith(
      'Firestore write retry: partialUpdate',
      expect.objectContaining({ attempt: 1, date: '2026-03-19', error: expect.any(Error) })
    );
    expect(firestoreWriteLoggerWarn).toHaveBeenCalledWith(
      'Firestore write retry: delete',
      expect.objectContaining({ attempt: 1, date: '2026-03-19', error: expect.any(Error) })
    );
  });
});
