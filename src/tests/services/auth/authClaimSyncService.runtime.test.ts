import { beforeEach, describe, expect, it, vi } from 'vitest';

const callableMock = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

import { createAuthClaimSyncService } from '@/services/auth/authClaimSyncService';

describe('authClaimSyncService runtime injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callableMock.mockResolvedValue({
      data: {
        role: 'admin',
      },
    });
  });

  it('syncs role claims through an injected functions runtime', async () => {
    const service = createAuthClaimSyncService({
      getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
    });

    await expect(service.syncCurrentUserRoleClaim()).resolves.toEqual({
      role: 'admin',
    });
  });
});
