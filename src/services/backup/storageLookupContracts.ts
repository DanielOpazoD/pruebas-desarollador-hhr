import type { StorageLookupStatus } from '@/services/backup/storageErrorPolicy';

export interface StorageLookupResult {
  exists: boolean;
  status: StorageLookupStatus;
}

export const createStorageLookupResult = (
  exists: boolean,
  status: StorageLookupStatus
): StorageLookupResult => ({
  exists,
  status,
});

export const withStorageLookupTimeout = async (
  promise: Promise<StorageLookupResult>,
  timeoutMs: number,
  onTimeout?: () => void
): Promise<StorageLookupResult> => {
  const timeoutPromise = new Promise<StorageLookupResult>(resolve =>
    setTimeout(() => {
      onTimeout?.();
      resolve(createStorageLookupResult(false, 'timeout'));
    }, timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
};
