import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocMock = vi.fn();
const getDocsMock = vi.fn();
const addDocMock = vi.fn();
const setDocMock = vi.fn();
const deleteDocMock = vi.fn();
const updateDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((_dbOrCollection: unknown, ...segments: string[]) => ({ path: segments.join('/') })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  addDoc: (...args: unknown[]) => addDocMock(...args),
  query: vi.fn((value: unknown) => value),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  Timestamp: class {},
}));

vi.mock('@/firebaseConfig', () => ({
  db: {},
  firebaseReady: Promise.resolve(),
}));

import {
  addAuthorizedEmail,
  checkEmailAuthorization,
  getAuthorizedEmails,
  removeAuthorizedEmail,
} from '@/services/census/censusAccessService';

describe('censusAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when fetching authorized emails fails', async () => {
    getDocsMock.mockRejectedValueOnce(new Error('offline'));

    await expect(getAuthorizedEmails()).resolves.toEqual([]);
  });

  it('normalizes and stores authorized emails', async () => {
    setDocMock.mockResolvedValueOnce(undefined);

    await addAuthorizedEmail('  TEST@Hospital.cl ', 'viewer', 'admin@hospital.cl');

    expect(setDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'census-authorized-emails/test@hospital.cl' }),
      expect.objectContaining({
        email: 'test@hospital.cl',
        role: 'viewer',
        addedBy: 'admin@hospital.cl',
      })
    );
  });

  it('returns null when email authorization lookup fails', async () => {
    getDocMock.mockRejectedValueOnce(new Error('firestore down'));

    await expect(checkEmailAuthorization('blocked@hospital.cl')).resolves.toBeNull();
  });

  it('removes normalized authorized emails', async () => {
    deleteDocMock.mockResolvedValueOnce(undefined);

    await removeAuthorizedEmail('  REMOVE@Hospital.cl ');

    expect(deleteDocMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'census-authorized-emails/remove@hospital.cl' })
    );
  });
});
