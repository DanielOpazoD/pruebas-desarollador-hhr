import type { UserRole } from '@/types';

export interface AuthRoleLookupDependencies {
  getBootstrapRoleForEmail(email: string): UserRole | null;
  getDynamicRoleForEmail(email: string): Promise<UserRole | null>;
}

export type AuthRoleResolutionSource = 'bootstrap' | 'dynamic' | 'none';

export interface AuthRoleResolutionResult {
  role: UserRole | null;
  source: AuthRoleResolutionSource;
}

export const resolveAllowedRoleForEmail = async (
  email: string,
  dependencies: AuthRoleLookupDependencies
): Promise<AuthRoleResolutionResult> => {
  const bootstrapRole = dependencies.getBootstrapRoleForEmail(email);
  if (bootstrapRole) {
    return { role: bootstrapRole, source: 'bootstrap' };
  }

  const dynamicRole = await dependencies.getDynamicRoleForEmail(email);
  if (dynamicRole) {
    return { role: dynamicRole, source: 'dynamic' };
  }

  return { role: null, source: 'none' };
};
