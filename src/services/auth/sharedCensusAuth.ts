import { httpsCallable } from 'firebase/functions';
import { auth, getFunctionsInstance } from '@/firebaseConfig';

type SharedCensusAccessResult = {
  authorized: boolean;
  role: 'viewer' | 'downloader';
};

const SHARED_CENSUS_ROUTE_PREFIXES = ['/censo-compartido', '/censo-publico'] as const;

const normalizeEmail = (email: string): string => {
  if (!email) return '';
  return String(email).toLowerCase().replace(/\s+/g, '').trim();
};

const isSharedCensusPath = (pathname: string): boolean =>
  SHARED_CENSUS_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));

export const isSharedCensusMode = (): boolean =>
  typeof window !== 'undefined' && isSharedCensusPath(window.location.pathname);

export const checkSharedCensusAccess = async (
  email: string | null | undefined = auth.currentUser?.email
): Promise<SharedCensusAccessResult> => {
  const currentEmail = normalizeEmail(email || auth.currentUser?.email || '');
  if (!currentEmail) {
    return { authorized: false, role: 'viewer' };
  }
  try {
    const functions = await getFunctionsInstance();
    const checkSharedAccess = httpsCallable<Record<string, never>, SharedCensusAccessResult>(
      functions,
      'checkSharedCensusAccess'
    );
    const response = await checkSharedAccess({});

    if (!response.data?.authorized) {
      return { authorized: false, role: 'viewer' };
    }
    return {
      authorized: true,
      role: response.data.role === 'downloader' ? 'downloader' : 'viewer',
    };
  } catch (error) {
    console.error('[authService] Shared census authorization check failed', error);
    return { authorized: false, role: 'viewer' };
  }
};
