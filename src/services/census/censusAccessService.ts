import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  query,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';
import { logger } from '@/services/utils/loggerService';
import {
  CensusAccessInvitation,
  CensusAccessUser,
  CensusAccessRole,
  CensusAccessLog,
  CensusAuthorizedEmail,
} from '@/types/censusAccess';

const INVITATIONS_COLLECTION = 'census-access-invitations';
const USERS_COLLECTION = 'census-access-users';
const LOGS_COLLECTION = 'census-access-logs';
const AUTHORIZED_EMAILS_COLLECTION = 'census-authorized-emails';
const censusAccessLogger = logger.child('CensusAccessService');

export interface CensusAccessServiceDependencies {
  runtime?: FirestoreServiceRuntimePort;
  getUserAgent?: () => string;
}

/**
 * Normalizes a field that could be a Firestore Timestamp or a Date
 */
const toDate = (ts: Timestamp | Date | { toDate: () => Date } | undefined | null): Date => {
  if (!ts) return new Date();
  if (ts instanceof Date) return ts;
  if (
    typeof ts === 'object' &&
    ts !== null &&
    'toDate' in ts &&
    typeof (ts as { toDate?: unknown }).toDate === 'function'
  ) {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as unknown as string | number);
};

/**
 * Calculates the end of the next month relative to today
 */
export const calculateDefaultExpiration = (): Date => {
  const now = new Date();
  // Go to first day of 2 months ahead, then back 1 day to get last day of next month
  const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
  return endOfNextMonth;
};

const defaultGetUserAgent = (): string =>
  typeof navigator === 'undefined' ? '' : navigator.userAgent;

export const createCensusAccessService = ({
  runtime = defaultFirestoreServiceRuntime,
  getUserAgent = defaultGetUserAgent,
}: CensusAccessServiceDependencies = {}) => {
  const getDb = () => runtime.getDb();

  const verifyInvitation = async (invitationId: string): Promise<CensusAccessInvitation | null> => {
    await runtime.ready;

    const docRef = doc(getDb(), INVITATIONS_COLLECTION, invitationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CensusAccessInvitation;
    const now = new Date();
    const expiresAt = toDate(data.expiresAt);

    if (data.status !== 'pending' || expiresAt < now) {
      if (data.status === 'pending') {
        await updateDoc(docRef, { status: 'expired' });
      }
      return null;
    }

    return { ...data, id: docSnap.id };
  };

  const checkUserAccess = async (userId: string): Promise<CensusAccessUser | null> => {
    await runtime.ready;

    const docRef = doc(getDb(), USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data() as CensusAccessUser;
    const now = new Date();
    const expiresAt = toDate(data.expiresAt);

    if (!data.isActive || expiresAt < now) {
      return null;
    }

    return data;
  };

  const checkEmailAuthorization = async (email: string): Promise<CensusAuthorizedEmail | null> => {
    try {
      await runtime.ready;
      const docRef = doc(getDb(), AUTHORIZED_EMAILS_COLLECTION, email.toLowerCase().trim());
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        return snap.data() as CensusAuthorizedEmail;
      }
      return null;
    } catch (err) {
      censusAccessLogger.error('Error checking email authorization', err);
      return null;
    }
  };

  return {
    async createInvitation(
      createdBy: string,
      role: CensusAccessRole = 'viewer',
      email?: string
    ): Promise<string> {
      await runtime.ready;

      const invitation: Omit<CensusAccessInvitation, 'id'> = {
        email: email?.toLowerCase(),
        role,
        createdAt: new Date(),
        createdBy,
        expiresAt: calculateDefaultExpiration(),
        status: 'pending',
      };

      const docRef = await addDoc(collection(getDb(), INVITATIONS_COLLECTION), invitation);
      return docRef.id;
    },

    verifyInvitation,

    async registerUserFromInvitation(
      invitationId: string,
      user: { uid: string; email: string; displayName: string }
    ): Promise<boolean> {
      await runtime.ready;

      const invitation = await verifyInvitation(invitationId);
      if (!invitation) return false;

      if (invitation.email && invitation.email !== user.email.toLowerCase()) {
        throw new Error('Esta invitación está restringida a otro correo electrónico.');
      }

      await updateDoc(doc(getDb(), INVITATIONS_COLLECTION, invitationId), {
        status: 'used',
        usedBy: user.uid,
        usedAt: serverTimestamp(),
      });

      const userDoc: CensusAccessUser = {
        id: user.uid,
        email: user.email.toLowerCase(),
        displayName: user.displayName || '',
        role: invitation.role,
        createdAt: new Date(),
        createdBy: invitation.createdBy,
        expiresAt: invitation.expiresAt,
        isActive: true,
      };

      await setDoc(doc(getDb(), USERS_COLLECTION, user.uid), userDoc);
      return true;
    },

    checkUserAccess,

    async logAccess(config: Omit<CensusAccessLog, 'id' | 'timestamp'>): Promise<void> {
      try {
        await runtime.ready;

        await addDoc(collection(getDb(), LOGS_COLLECTION), {
          ...config,
          timestamp: serverTimestamp(),
          userAgent: getUserAgent(),
        });
      } catch (error) {
        censusAccessLogger.error('Error logging access', error);
      }
    },

    async getAuthorizedEmails(): Promise<CensusAuthorizedEmail[]> {
      try {
        await runtime.ready;
        const q = query(collection(getDb(), AUTHORIZED_EMAILS_COLLECTION));
        const snap = await getDocs(q);
        return snap.docs.map(docSnap => docSnap.data() as CensusAuthorizedEmail);
      } catch (err) {
        censusAccessLogger.error('Error getting authorized emails', err);
        return [];
      }
    },

    async addAuthorizedEmail(
      email: string,
      role: CensusAccessRole,
      addedBy: string
    ): Promise<void> {
      try {
        await runtime.ready;
        const normalizedEmail = email.toLowerCase().trim();
        await setDoc(doc(getDb(), AUTHORIZED_EMAILS_COLLECTION, normalizedEmail), {
          email: normalizedEmail,
          role,
          addedAt: serverTimestamp(),
          addedBy,
        });
      } catch (err) {
        censusAccessLogger.error('Error adding authorized email', err);
        throw err;
      }
    },

    async removeAuthorizedEmail(email: string): Promise<void> {
      try {
        await runtime.ready;
        await deleteDoc(doc(getDb(), AUTHORIZED_EMAILS_COLLECTION, email.toLowerCase().trim()));
      } catch (err) {
        censusAccessLogger.error('Error removing authorized email', err);
        throw err;
      }
    },

    checkEmailAuthorization,

    async checkUserAccessWithWhitelist(
      userId: string,
      email: string,
      displayName: string
    ): Promise<CensusAccessUser | null> {
      try {
        const existingUser = await checkUserAccess(userId);
        if (existingUser) return existingUser;

        const authInfo = await checkEmailAuthorization(email);
        if (!authInfo) {
          return null;
        }

        const newUser: CensusAccessUser = {
          id: userId,
          email: email.toLowerCase(),
          displayName,
          role: authInfo.role,
          createdAt: new Date(),
          createdBy: authInfo.addedBy,
          expiresAt: calculateDefaultExpiration(),
          isActive: true,
        };

        await runtime.ready;
        await setDoc(doc(getDb(), USERS_COLLECTION, userId), newUser);

        return newUser;
      } catch (err) {
        censusAccessLogger.error('Error in checkUserAccessWithWhitelist', err);
        return null;
      }
    },
  };
};

export const defaultCensusAccessService = createCensusAccessService();

export const createInvitation = (
  ...args: Parameters<typeof defaultCensusAccessService.createInvitation>
) => defaultCensusAccessService.createInvitation(...args);

export const verifyInvitation = (
  ...args: Parameters<typeof defaultCensusAccessService.verifyInvitation>
) => defaultCensusAccessService.verifyInvitation(...args);

export const registerUserFromInvitation = (
  ...args: Parameters<typeof defaultCensusAccessService.registerUserFromInvitation>
) => defaultCensusAccessService.registerUserFromInvitation(...args);

export const checkUserAccess = (
  ...args: Parameters<typeof defaultCensusAccessService.checkUserAccess>
) => defaultCensusAccessService.checkUserAccess(...args);

export const logAccess = (...args: Parameters<typeof defaultCensusAccessService.logAccess>) =>
  defaultCensusAccessService.logAccess(...args);

export const getAuthorizedEmails = (
  ...args: Parameters<typeof defaultCensusAccessService.getAuthorizedEmails>
) => defaultCensusAccessService.getAuthorizedEmails(...args);

export const addAuthorizedEmail = (
  ...args: Parameters<typeof defaultCensusAccessService.addAuthorizedEmail>
) => defaultCensusAccessService.addAuthorizedEmail(...args);

export const removeAuthorizedEmail = (
  ...args: Parameters<typeof defaultCensusAccessService.removeAuthorizedEmail>
) => defaultCensusAccessService.removeAuthorizedEmail(...args);

export const checkEmailAuthorization = (
  ...args: Parameters<typeof defaultCensusAccessService.checkEmailAuthorization>
) => defaultCensusAccessService.checkEmailAuthorization(...args);

export const checkUserAccessWithWhitelist = (
  ...args: Parameters<typeof defaultCensusAccessService.checkUserAccessWithWhitelist>
) => defaultCensusAccessService.checkUserAccessWithWhitelist(...args);
