type StorageErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  customData?: {
    serverResponse?: string;
  };
};

const EXPECTED_LOOKUP_MISS_CODES = new Set([
  'storage/object-not-found',
  'storage/invalid-root-operation',
  'storage/unauthorized',
  'storage/unauthenticated',
]);

const HTTP_STATUS_PATTERN = /\b(403|404)\b/;

const hasLookupMissSignalInText = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    HTTP_STATUS_PATTERN.test(normalized) ||
    normalized.includes('not found') ||
    normalized.includes('forbidden') ||
    normalized.includes('permission denied')
  );
};

export const isExpectedStorageLookupMiss = (error: unknown): boolean => {
  const storageError = error as StorageErrorLike;
  if (EXPECTED_LOOKUP_MISS_CODES.has(storageError?.code || '')) {
    return true;
  }

  if (storageError?.status === 403 || storageError?.status === 404) {
    return true;
  }

  if (hasLookupMissSignalInText(storageError?.message)) {
    return true;
  }

  if (hasLookupMissSignalInText(storageError?.customData?.serverResponse)) {
    return true;
  }

  return false;
};
