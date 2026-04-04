import { beforeEach, describe, expect, it, vi } from 'vitest';

const callableMock = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

import { createPublicMedicalSignatureService } from '@/services/handoff/publicMedicalSignatureService';

describe('publicMedicalSignatureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the public handoff payload through an injected runtime', async () => {
    callableMock.mockResolvedValue({
      data: { record: { date: '2026-04-04' }, scope: 'medicine', alreadySigned: false },
    });

    const service = createPublicMedicalSignatureService({
      getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
    });

    await expect(
      service.fetchPublicMedicalHandoffRecord('2026-04-04', 'medicine' as never, 'token-1')
    ).resolves.toMatchObject({ alreadySigned: false });
  });

  it('submits the public medical signature through an injected runtime', async () => {
    callableMock.mockResolvedValue({
      data: {
        scope: 'medicine',
        signature: { doctorName: 'Dr Test', signedAt: '2026-04-04T10:00:00.000Z' },
        alreadySigned: true,
      },
    });

    const service = createPublicMedicalSignatureService({
      getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
    });

    await expect(
      service.submitPublicMedicalHandoffSignature({
        date: '2026-04-04',
        scope: 'medicine' as never,
        token: 'token-1',
        doctorName: 'Dr Test',
      })
    ).resolves.toMatchObject({ alreadySigned: true });
  });
});
