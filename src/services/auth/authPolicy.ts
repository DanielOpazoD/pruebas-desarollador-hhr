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

export { clearRoleCacheForEmail } from '@/services/auth/authRoleCache';

export const checkEmailInFirestore = async (
  email: string
): Promise<{ allowed: boolean; role?: UserRole }> => {
  try {
    const cleanEmail = normalizeEmail(email);

    const staticRole = getStaticRoleForEmail(cleanEmail);
    if (staticRole) {
      void saveRoleToCache(cleanEmail, staticRole);
      return { allowed: true, role: staticRole };
    }

    const cachedRole = await getCachedRole(cleanEmail);
    if (cachedRole) {
      return { allowed: true, role: cachedRole as UserRole };
    }

    const cloudRole = await getCloudRoleForEmail(cleanEmail);
    if (cloudRole) {
      void saveRoleToCache(cleanEmail, cloudRole);
      return { allowed: true, role: cloudRole };
    }

    const dynamicRole = await getDynamicRoleForEmail(cleanEmail);
    if (dynamicRole) {
      void saveRoleToCache(cleanEmail, dynamicRole);
      return { allowed: true, role: dynamicRole };
    }

    const allowedUserRole = await getAllowedUserRoleForEmail(cleanEmail);
    if (allowedUserRole) {
      void saveRoleToCache(cleanEmail, allowedUserRole);
      return { allowed: true, role: allowedUserRole };
    }

    console.warn(`[authService] ❌ Email not found in whitelist: ${email}`);
    return { allowed: false };
  } catch (error) {
    console.error('[authService] ‼️ Error checking allowed users in Firestore:', error);
    return { allowed: false };
  }
};

export const isCurrentUserAllowed = async (): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user) return false;
  const { allowed } = await checkEmailInFirestore(user.email || '');
  return allowed;
};
