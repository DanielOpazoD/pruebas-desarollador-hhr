import { firestoreDb } from '@/services/storage/firestore';
import { healthServiceLogger } from '@/services/admin/adminLoggers';
export type {
  SystemHealthSummary,
  UserHealthStatus,
  VersionUpdateReason,
} from '@/services/admin/healthService.contracts';
export { normalizeUserHealthStatus } from '@/services/admin/healthService.normalization';
export { buildSystemHealthSummary } from '@/services/admin/healthService.summary';
import { normalizeUserHealthStatus } from '@/services/admin/healthService.normalization';
import type { UserHealthStatus } from '@/services/admin/healthService.contracts';

const HEALTH_COLLECTION = 'system_health';
const STATS_DOC = 'stats';
const USERS_SUBCOLLECTION = 'users';

const isHealthPermissionError = (error: unknown): boolean => {
  const authError = error as { code?: string; message?: string };
  const code = String(authError?.code || '').toLowerCase();
  const message = String(authError?.message || '').toLowerCase();
  return code.includes('permission') || message.includes('missing or insufficient permissions');
};

export const reportUserHealth = async (status: UserHealthStatus): Promise<void> => {
  try {
    const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
    await firestoreDb.setDoc(path, status.uid, {
      ...status,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    if (isHealthPermissionError(error)) {
      return;
    }
    healthServiceLogger.error('Failed to report health', error);
  }
};

export const subscribeToSystemHealth = (onUpdate: (data: UserHealthStatus[]) => void) => {
  const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
  return firestoreDb.subscribeQuery<Partial<UserHealthStatus>>(
    path,
    {
      orderBy: [{ field: 'lastSeen', direction: 'desc' }],
      limit: 50,
    },
    users => {
      onUpdate(users.map(normalizeUserHealthStatus));
    }
  );
};

export const getSystemHealthSnapshot = async (): Promise<UserHealthStatus[]> => {
  try {
    const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
    const users = await firestoreDb.getDocs<Partial<UserHealthStatus>>(path, {
      orderBy: [{ field: 'lastSeen', direction: 'desc' }],
      limit: 100,
    });
    return users.map(normalizeUserHealthStatus);
  } catch (error) {
    healthServiceLogger.error('Failed to fetch health snapshot', error);
    return [];
  }
};
