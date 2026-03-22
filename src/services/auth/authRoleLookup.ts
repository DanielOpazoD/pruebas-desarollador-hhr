import { httpsCallable } from 'firebase/functions';
import { UserRole } from '@/types/auth';
import { BOOTSTRAP_ADMIN_EMAILS, normalizeEmail } from '@/services/auth/authShared';
import { isGeneralLoginRole } from '@/shared/access/roleAccessMatrix';
import { defaultFunctionsRuntime } from '@/services/firebase-runtime/functionsRuntime';
import { createAuthError } from '@/services/auth/authShared';

type CheckUserRoleResponse = {
  role?: string;
};

export const AUTH_ROLE_LOOKUP_UNAVAILABLE_CODE = 'auth/role-lookup-unavailable';

export const getBootstrapRoleForEmail = (email: string): UserRole | null => {
  const cleanEmail = normalizeEmail(email);

  if (
    (BOOTSTRAP_ADMIN_EMAILS as readonly string[]).some(
      staticEmail => cleanEmail === normalizeEmail(staticEmail)
    )
  ) {
    return 'admin';
  }

  return null;
};

export const getDynamicRoleForEmail = async (email: string): Promise<UserRole | null> => {
  try {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return null;

    const functions = await defaultFunctionsRuntime.getFunctions();
    const checkUserRole = httpsCallable<Record<string, never>, CheckUserRoleResponse>(
      functions,
      'checkUserRole'
    );
    const response = await checkUserRole({});
    const role = response.data?.role;
    if (!isGeneralLoginRole(role)) {
      return null;
    }
    return role;
  } catch (error) {
    throw createAuthError(
      AUTH_ROLE_LOOKUP_UNAVAILABLE_CODE,
      error instanceof Error && error.message
        ? error.message
        : 'No se pudo consultar el rol actual del usuario.'
    );
  }
};
