import { db } from '@/services/infrastructure/db';
import { UserRole } from '@/types';
import { BOOTSTRAP_ADMIN_EMAILS, normalizeEmail } from '@/services/auth/authShared';

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
    const dynamicRoles = await db.getDoc<Record<string, string>>('config', 'roles');
    if (!dynamicRoles?.[email]) return null;
    return dynamicRoles[email] as UserRole;
  } catch {
    return null;
  }
};
