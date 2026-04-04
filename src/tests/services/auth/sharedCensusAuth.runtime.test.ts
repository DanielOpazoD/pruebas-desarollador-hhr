import { beforeEach, describe, expect, it, vi } from 'vitest';

const callableMock = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
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
});
