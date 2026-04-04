import { beforeEach, describe, expect, it, vi } from 'vitest';

const callableMock = vi.fn();
const { sharedCensusAuthLoggerError } = vi.hoisted(() => ({
  sharedCensusAuthLoggerError: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

vi.mock('@/services/auth/authLoggers', () => ({
  sharedCensusAuthLogger: {
    error: sharedCensusAuthLoggerError,
  },
}));

import { createSharedCensusAuthService } from '@/services/auth/sharedCensusAuth';

describe('sharedCensusAuth runtime injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callableMock.mockResolvedValue({
      data: {
        authorized: true,
        role: 'downloader',
      },
    });
  });

  it('checks shared census access through injected auth and functions runtimes', async () => {
    const service = createSharedCensusAuthService(
      {
        ready: Promise.resolve(),
        getCurrentUser: () => ({ email: 'viewer@hospital.cl' }) as never,
      },
      {
        getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
      }
    );

    await expect(service.checkSharedCensusAccess()).resolves.toEqual({
      authorized: true,
      role: 'downloader',
    });
  });

  it('logs and returns viewer when the shared census callable fails', async () => {
    callableMock.mockRejectedValueOnce(new Error('denied'));

    const service = createSharedCensusAuthService(
      {
        ready: Promise.resolve(),
        getCurrentUser: () => ({ email: 'viewer@hospital.cl' }) as never,
      },
      {
        getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
      }
    );

    await expect(service.checkSharedCensusAccess()).resolves.toEqual({
      authorized: false,
      role: 'viewer',
    });

    expect(sharedCensusAuthLoggerError).toHaveBeenCalledWith(
      'Shared census authorization check failed',
      expect.any(Error)
    );
  });
});
