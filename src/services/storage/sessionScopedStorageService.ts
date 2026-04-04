import { clearAllRecords } from '@/services/storage/indexeddb/indexedDbRecordService';
import { clearSyncQueueForOwner, recordSyncQueueOwnershipTelemetry } from '@/services/storage/sync';
import { recordOperationalTelemetry } from '@/services/observability/operationalTelemetryService';

const SESSION_OWNER_KEY = 'hhr_session_owner_v1';

export const resolveSessionOwnerKey = (uid: string | null | undefined): string | null =>
  uid ? `user:${uid}` : null;

export const getStoredSessionOwnerKey = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  return localStorage.getItem(SESSION_OWNER_KEY);
};

const setStoredSessionOwnerKey = (ownerKey: string | null): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (!ownerKey) {
    localStorage.removeItem(SESSION_OWNER_KEY);
    return;
  }

  localStorage.setItem(SESSION_OWNER_KEY, ownerKey);
};

const clearSensitiveSessionState = async (ownerKey: string | null): Promise<void> => {
  await clearAllRecords();
  await clearSyncQueueForOwner(ownerKey);
};

export const reconcileAuthorizedSessionOwner = async (ownerKey: string): Promise<void> => {
  const previousOwnerKey = getStoredSessionOwnerKey();

  if (!previousOwnerKey) {
    setStoredSessionOwnerKey(ownerKey);
    return;
  }

  if (previousOwnerKey === ownerKey) {
    return;
  }

  await clearSensitiveSessionState(previousOwnerKey);
  setStoredSessionOwnerKey(ownerKey);
  recordSyncQueueOwnershipTelemetry('session_owner_changed', {
    previousOwnerKey,
    nextOwnerKey: ownerKey,
  });
  recordOperationalTelemetry({
    category: 'auth',
    operation: 'session_owner_changed_cleanup',
    status: 'degraded',
    runtimeState: 'recoverable',
    issues: [
      'Se limpió el estado local sensible al detectar un cambio de usuario en este navegador.',
    ],
    context: {
      previousOwnerKey,
      nextOwnerKey: ownerKey,
    },
  });
};

export const clearSessionScopedClientState = async (
  reason: 'manual' | 'automatic'
): Promise<void> => {
  const ownerKey = getStoredSessionOwnerKey();
  await clearSensitiveSessionState(ownerKey);
  setStoredSessionOwnerKey(null);
  recordSyncQueueOwnershipTelemetry('session_owner_cleared', {
    ownerKey,
    logoutReason: reason,
  });
  recordOperationalTelemetry({
    category: 'auth',
    operation: 'session_owner_cleared_cleanup',
    status: 'degraded',
    runtimeState: 'recoverable',
    issues: ['Se limpió el estado local sensible al cerrar sesión.'],
    context: {
      ownerKey,
      logoutReason: reason,
    },
  });
};
