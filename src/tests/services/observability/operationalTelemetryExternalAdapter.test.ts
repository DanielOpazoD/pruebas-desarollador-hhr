import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dispatchOperationalTelemetryExternally,
  resolveOperationalTelemetryExternalConfig,
} from '@/services/observability/operationalTelemetryExternalAdapter';

const event = {
  category: 'sync' as const,
  status: 'failed' as const,
  operation: 'refresh_daily_record',
  timestamp: '2026-03-07T10:00:00.000Z',
};

describe('operationalTelemetryExternalAdapter', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('resolves disabled config without endpoint', () => {
    expect(resolveOperationalTelemetryExternalConfig()).toEqual({
      enabled: false,
      endpoint: undefined,
      sampleRate: 1,
    });
  });

  it('sends payload through beacon when configured', async () => {
    vi.stubEnv('VITE_OPERATIONAL_TELEMETRY_ENDPOINT', 'https://example.test/ops');
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { sendBeacon },
      configurable: true,
    });

    const sent = await dispatchOperationalTelemetryExternally(event);

    expect(sent).toBe(true);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith('https://example.test/ops', expect.any(Blob));
  });

  it('falls back to fetch when beacon is unavailable', async () => {
    vi.stubEnv('VITE_OPERATIONAL_TELEMETRY_ENDPOINT', 'https://example.test/ops');
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchSpy);
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
    });

    const sent = await dispatchOperationalTelemetryExternally(event);

    expect(sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.test/ops',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      })
    );
  });
});
