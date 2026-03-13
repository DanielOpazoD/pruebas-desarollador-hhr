import type { UserRole } from '@/types';

export interface AuthRoleLookupDependencies {
  getStaticRoleForEmail(email: string): UserRole | null;
  getCachedRole(email: string): Promise<string | null>;
  getCloudRoleForEmail(email: string): Promise<UserRole | null>;
  getDynamicRoleForEmail(email: string): Promise<UserRole | null>;
  getAllowedUserRoleForEmail(email: string): Promise<UserRole | null>;
  saveRoleToCache(email: string, role: UserRole): Promise<void> | void;
}

export type AuthRoleResolutionSource =
  | 'static'
  | 'cache'
  | 'cloud'
  | 'dynamic'
  | 'allowed'
  | 'none';

export interface AuthRoleResolutionResult {
  role: UserRole | null;
  source: AuthRoleResolutionSource;
}

export const resolveAllowedRoleForEmail = async (
  email: string,
  dependencies: AuthRoleLookupDependencies
): Promise<AuthRoleResolutionResult> => {
  const staticRole = dependencies.getStaticRoleForEmail(email);
  if (staticRole) {
    void dependencies.saveRoleToCache(email, staticRole);
    return { role: staticRole, source: 'static' };
  }

  const cachedRole = await dependencies.getCachedRole(email);
  if (cachedRole) {
    return { role: cachedRole as UserRole, source: 'cache' };
  }

  const cloudRole = await dependencies.getCloudRoleForEmail(email);
  if (cloudRole) {
    void dependencies.saveRoleToCache(email, cloudRole);
    return { role: cloudRole, source: 'cloud' };
  }

  const dynamicRole = await dependencies.getDynamicRoleForEmail(email);
  if (dynamicRole) {
    void dependencies.saveRoleToCache(email, dynamicRole);
    return { role: dynamicRole, source: 'dynamic' };
  }

  const allowedRole = await dependencies.getAllowedUserRoleForEmail(email);
  if (allowedRole) {
    void dependencies.saveRoleToCache(email, allowedRole);
    return { role: allowedRole, source: 'allowed' };
  }

  return { role: null, source: 'none' };
};
