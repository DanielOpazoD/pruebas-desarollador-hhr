import { httpsCallable } from 'firebase/functions';
import { getFunctionsInstance } from '@/firebaseConfig';
import { db } from '@/services/infrastructure/db';
import { UserRole } from '@/types';
import { STATIC_ROLES, normalizeEmail } from '@/services/auth/authShared';

export const getStaticRoleForEmail = (email: string): UserRole | null => {
  const cleanEmail = normalizeEmail(email);

  for (const [staticEmail, staticRole] of Object.entries(STATIC_ROLES)) {
    if (cleanEmail === normalizeEmail(staticEmail)) {
      return staticRole as UserRole;
    }
  }

  return null;
};

export const getCloudRoleForEmail = async (email: string): Promise<UserRole | null> => {
  try {
    console.warn('[authService] 📡 Fetching role via checkUserRole function...');
    const functions = await getFunctionsInstance();
    const checkRoleFunc = httpsCallable<{ email: string }, { role: string }>(
      functions,
      'checkUserRole'
    );
    const response = await checkRoleFunc({ email });

    if (response.data?.role && response.data.role !== 'unauthorized') {
      return response.data.role as UserRole;
    }
  } catch (error) {
    console.warn(
      '[authService] ⚠️ Cloud discovery failed, falling back to read-only check:',
      error
    );
  }

  return null;
};

export const getDynamicRoleForEmail = async (email: string): Promise<UserRole | null> => {
  try {
    const dynamicRoles = await db.getDoc<Record<string, string>>('config', 'roles');
    if (!dynamicRoles?.[email]) return null;
    return dynamicRoles[email] as UserRole;
  } catch {
    return null;
  }
};

export const getAllowedUserRoleForEmail = async (email: string): Promise<UserRole | null> => {
  const results = await db.getDocs<{ role?: string; email: string }>('allowedUsers', {
    where: [{ field: 'email', operator: '==', value: email }],
  });

  if (results.length === 0) {
    return null;
  }

  const rawRole = (results[0].role || 'viewer').toLowerCase().trim();
  return rawRole as UserRole;
};
