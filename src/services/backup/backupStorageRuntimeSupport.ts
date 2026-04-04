import type { BackupStorageRuntime } from '@/services/firebase-runtime/backupRuntime';
import { classifyStorageError } from '@/services/backup/storageErrorPolicy';
import type { StorageLookupResult } from '@/services/backup/storageLookupContracts';
import { withStorageLookupTimeout } from '@/services/backup/storageLookupContracts';

export type BackupStorageMutationStatus =
  | 'success'
  | 'permission_denied'
  | 'not_found'
  | 'invalid_date'
  | 'timeout'
  | 'unknown';

export type BackupStorageMutationResult<T = null> =
  | { status: 'success'; data: T }
  | { status: BackupStorageMutationStatus; error: unknown; data: null };

export const resolveBackupStorage = async (
  runtime: Pick<BackupStorageRuntime, 'ready' | 'getStorage'>
) => {
  await runtime.ready;
  return runtime.getStorage();
};

export const createBackupMutationResultFromError = <T = null>(
  error: unknown,
  options: { invalidDate?: boolean } = {}
): BackupStorageMutationResult<T> => {
  if (options.invalidDate) {
    return { status: 'invalid_date', error, data: null };
  }

  const category = classifyStorageError(error);
  return {
    status:
      category === 'permission_denied'
        ? 'permission_denied'
        : category === 'not_found'
          ? 'not_found'
          : category === 'timeout'
            ? 'timeout'
            : 'unknown',
    error,
    data: null,
  };
};

export const resolveDeleteMutationStatus = (error: unknown): BackupStorageMutationStatus =>
  classifyStorageError(error) === 'permission_denied' ? 'permission_denied' : 'not_found';

export const runStorageLookupWithTimeout = (
  promise: Promise<StorageLookupResult>,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<StorageLookupResult> => withStorageLookupTimeout(promise, timeoutMs, onTimeout);
