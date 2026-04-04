import { createScopedLogger } from '@/services/utils/loggerScope';

export const authClaimSyncLogger = createScopedLogger('AuthClaimSync');
export const authRoleCacheLogger = createScopedLogger('AuthRoleCache');
export const sharedCensusAuthLogger = createScopedLogger('SharedCensusAuth');
export const firebaseStartupWarningLogger = createScopedLogger('FirebaseStartupWarningRenderer');
