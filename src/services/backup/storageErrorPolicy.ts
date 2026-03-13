import {
  createOperationalError,
  type OperationalError,
} from '@/services/observability/operationalError';

type StorageErrorLike = {
  code?: string;
  message?: string;
  status?: number;
  customData?: {
    serverResponse?: string;
  };
};

export type StorageErrorCategory =
  | 'not_found'
  | 'permission_denied'
  | 'unauthenticated'
  | 'timeout'
  | 'unknown';

export type StorageLookupStatus =
  | 'available'
  | 'missing'
  | 'restricted'
  | 'invalid_date'
  | 'timeout'
  | 'error';

const NOT_FOUND_CODES = new Set(['storage/object-not-found', 'storage/invalid-root-operation']);
const PERMISSION_CODES = new Set(['storage/unauthorized', 'storage/permission-denied']);
const UNAUTHENTICATED_CODES = new Set(['storage/unauthenticated']);

const HTTP_STATUS_PATTERN = /\b(403|404)\b/;

const normalizeText = (value: string | undefined): string => (value || '').toLowerCase();

const hasNotFoundSignals = (text: string): boolean => {
  return text.includes('not found') || text.includes('object-not-found');
};

const hasPermissionSignals = (text: string): boolean => {
  return (
    text.includes('forbidden') ||
    text.includes('permission denied') ||
    text.includes('missing or insufficient permissions')
  );
};

const hasTimeoutSignals = (text: string): boolean => {
  return (
    text.includes('timeout') || text.includes('timed out') || text.includes('deadline exceeded')
  );
};

export const classifyStorageError = (error: unknown): StorageErrorCategory => {
  const storageError = error as StorageErrorLike;
  const code = storageError?.code || '';
  const message = normalizeText(storageError?.message);
  const serverResponse = normalizeText(storageError?.customData?.serverResponse);
  const mergedText = `${message} ${serverResponse}`;

  if (NOT_FOUND_CODES.has(code) || storageError?.status === 404 || hasNotFoundSignals(mergedText)) {
    return 'not_found';
  }

  if (
    PERMISSION_CODES.has(code) ||
    storageError?.status === 403 ||
    hasPermissionSignals(mergedText) ||
    HTTP_STATUS_PATTERN.test(mergedText)
  ) {
    return 'permission_denied';
  }

  if (UNAUTHENTICATED_CODES.has(code) || message.includes('unauthenticated')) {
    return 'unauthenticated';
  }

  if (hasTimeoutSignals(mergedText)) {
    return 'timeout';
  }

  return 'unknown';
};

export const isExpectedStorageLookupMiss = (error: unknown): boolean => {
  const category = classifyStorageError(error);
  return (
    category === 'not_found' || category === 'permission_denied' || category === 'unauthenticated'
  );
};

export const shouldLogStorageError = (error: unknown): boolean => {
  return classifyStorageError(error) === 'unknown';
};

export const resolveStorageLookupStatus = (
  error: unknown,
  options: { invalidDate?: boolean; timedOut?: boolean } = {}
): StorageLookupStatus => {
  if (options.invalidDate) {
    return 'invalid_date';
  }
  if (options.timedOut) {
    return 'timeout';
  }

  const category = classifyStorageError(error);
  if (category === 'not_found') {
    return 'missing';
  }
  if (category === 'permission_denied' || category === 'unauthenticated') {
    return 'restricted';
  }
  if (category === 'timeout') {
    return 'timeout';
  }
  return 'error';
};

export const toStorageOperationalError = (
  error: unknown,
  options: {
    code?: string;
    message?: string;
    context?: Record<string, unknown>;
    userSafeMessage?: string;
  } = {}
): OperationalError => {
  const category = classifyStorageError(error);
  const lookupStatus = resolveStorageLookupStatus(error);

  return createOperationalError({
    code: options.code || `storage_${category}`,
    message:
      options.message ||
      (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Error operacional de storage.'),
    severity: category === 'unknown' ? 'error' : 'warning',
    userSafeMessage:
      options.userSafeMessage ||
      (lookupStatus === 'restricted'
        ? 'No fue posible acceder al archivo solicitado.'
        : lookupStatus === 'missing'
          ? 'El archivo solicitado no se encuentra disponible.'
          : lookupStatus === 'timeout'
            ? 'La consulta al respaldo tardó demasiado.'
            : 'No fue posible completar la consulta de respaldo.'),
    context: {
      storageCategory: category,
      lookupStatus,
      ...options.context,
    },
  });
};
