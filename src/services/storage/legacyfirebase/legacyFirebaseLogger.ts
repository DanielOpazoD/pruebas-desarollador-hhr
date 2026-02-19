const isTestEnvironment = (): boolean =>
  typeof process !== 'undefined' &&
  (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test');

const isLegacyDebugEnabled = (): boolean =>
  !isTestEnvironment() &&
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEBUG_LEGACY_FIREBASE || '').toLowerCase() === 'true';

export const isLegacyPermissionDeniedError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const typed = error as { code?: string; message?: string };
  const code = typed.code;
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return true;
  }

  const message = String(typed.message || '').toLowerCase();
  return message.includes('missing or insufficient permissions');
};

export const logLegacyInfo = (message: string): void => {
  if (!isLegacyDebugEnabled()) return;
  console.warn(message);
};

export const logLegacyError = (message: string, error: unknown): void => {
  if (isLegacyPermissionDeniedError(error) && !isLegacyDebugEnabled()) {
    return;
  }
  console.error(message, error);
};
