import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockInitializeApp = vi.fn();
const mockGetAuth = vi.fn();
const mockSetPersistence = vi.fn();
const mockInitializeFirestore = vi.fn();

vi.mock('firebase/app', () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
}));

vi.mock('firebase/auth', () => ({
  getAuth: (...args: unknown[]) => mockGetAuth(...args),
  connectAuthEmulator: vi.fn(),
  setPersistence: (...args: unknown[]) => mockSetPersistence(...args),
  browserLocalPersistence: { mode: 'local' },
  browserSessionPersistence: { mode: 'session' },
  inMemoryPersistence: { mode: 'memory' },
}));

vi.mock('firebase/firestore', () => ({
  initializeFirestore: (...args: unknown[]) => mockInitializeFirestore(...args),
  connectFirestoreEmulator: vi.fn(),
  persistentLocalCache: vi.fn(() => ({ persistence: true })),
  persistentMultipleTabManager: vi.fn(() => ({ mode: 'multi' })),
  persistentSingleTabManager: vi.fn(() => ({ mode: 'single' })),
}));

vi.mock('@/services/firebase-runtime/firebaseEnvironmentPolicy', () => ({
  parseEmulatorHost: vi.fn(() => null),
  shouldUseSingleTabFirestoreCache: vi.fn(() => false),
}));

vi.mock('@/services/firebase-runtime/firebaseRuntimeLoggers', () => ({
  firebaseBootstrapLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { initializeFirebaseServices } from '@/services/firebase-runtime/firebaseServiceBootstrap';

describe('firebaseServiceBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInitializeApp.mockReturnValue({ name: 'app' });
    mockGetAuth.mockReturnValue({ name: 'auth' });
    mockInitializeFirestore.mockReturnValue({ name: 'db' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not block bootstrap when local persistence stalls', async () => {
    mockSetPersistence.mockImplementationOnce(() => new Promise(() => {}));

    const services = await initializeFirebaseServices({
      apiKey: 'test',
      projectId: 'project',
      appId: 'app-id',
    });

    await vi.advanceTimersByTimeAsync(2_500);

    expect(services).toEqual({
      app: { name: 'app' },
      auth: { name: 'auth' },
      db: { name: 'db' },
    });
    expect(mockSetPersistence).toHaveBeenCalledTimes(1);
    expect(mockSetPersistence.mock.calls[0]?.[1]).toEqual({ mode: 'local' });
  });

  it('falls back to session persistence when local persistence rejects', async () => {
    mockSetPersistence
      .mockRejectedValueOnce(new Error('local broken'))
      .mockResolvedValueOnce(undefined);

    const services = await initializeFirebaseServices({
      apiKey: 'test',
      projectId: 'project',
      appId: 'app-id',
    });

    expect(services).toEqual({
      app: { name: 'app' },
      auth: { name: 'auth' },
      db: { name: 'db' },
    });
    await vi.runAllTicks();
    await Promise.resolve();

    expect(mockSetPersistence).toHaveBeenCalledTimes(2);
    expect(mockSetPersistence.mock.calls[0]?.[1]).toEqual({ mode: 'local' });
    expect(mockSetPersistence.mock.calls[1]?.[1]).toEqual({ mode: 'session' });
  });

  it('does not start fallback candidates on timeout before the previous attempt settles', async () => {
    let rejectLocal: ((error: Error) => void) | undefined;
    mockSetPersistence
      .mockImplementationOnce(
        () =>
          new Promise((_, reject: (error: Error) => void) => {
            rejectLocal = reject;
          })
      )
      .mockResolvedValueOnce(undefined);

    const services = await initializeFirebaseServices({
      apiKey: 'test',
      projectId: 'project',
      appId: 'app-id',
    });

    expect(services).toEqual({
      app: { name: 'app' },
      auth: { name: 'auth' },
      db: { name: 'db' },
    });

    await vi.advanceTimersByTimeAsync(2_500);
    expect(mockSetPersistence).toHaveBeenCalledTimes(1);

    rejectLocal?.(new Error('late local failure'));
    await vi.runAllTicks();
    await Promise.resolve();

    expect(mockSetPersistence).toHaveBeenCalledTimes(2);
    expect(mockSetPersistence.mock.calls[1]?.[1]).toEqual({ mode: 'session' });
  });
});
