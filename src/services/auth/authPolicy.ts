import { auth } from '@/firebaseConfig';
import { UserRole } from '@/types';
import { normalizeEmail } from '@/services/auth/authShared';
import {
  getAllowedUserRoleForEmail,
  getCloudRoleForEmail,
  getDynamicRoleForEmail,
  getStaticRoleForEmail,
} from '@/services/auth/authRoleLookup';
import { getCachedRole, saveRoleToCache } from '@/services/auth/authRoleCache';
import {
  recordAuthOperationalError,
  emitAuthOperationalEvent,
} from '@/services/auth/authOperationalTelemetry';
import { resolveAllowedRoleForEmail } from '@/services/auth/authRoleResolutionController';

export { clearRoleCacheForEmail } from '@/services/auth/authRoleCache';

export const checkEmailInFirestore = async (
  email: string
): Promise<{ allowed: boolean; role?: UserRole }> => {
  try {
    const cleanEmail = normalizeEmail(email);
    const { role, source } = await resolveAllowedRoleForEmail(cleanEmail, {
      getStaticRoleForEmail,
      getCachedRole,
      getCloudRoleForEmail,
      getDynamicRoleForEmail,
      getAllowedUserRoleForEmail,
      saveRoleToCache,
    });

    if (role) {
      return { allowed: true, role };
    }

    emitAuthOperationalEvent('check_email_in_firestore', 'degraded', {
      code: 'auth_email_not_whitelisted',
      message: `Email not found in whitelist: ${cleanEmail}`,
      severity: 'warning',
      userSafeMessage: 'El correo no está autorizado para ingresar.',
      context: {
        email: cleanEmail,
        source,
      },
    });
    return { allowed: false };
  } catch (error) {
    recordAuthOperationalError('check_email_in_firestore', error, {
      code: 'auth_role_lookup_failed',
      message: 'Error checking allowed users in Firestore.',
      severity: 'error',
      userSafeMessage: 'No se pudo validar el acceso del correo.',
      context: {
        email: normalizeEmail(email),
      },
    });
    return { allowed: false };
  }
};

export const isCurrentUserAllowed = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  const { allowed } = await checkEmailInFirestore(user.email || '');
  return allowed;
};
