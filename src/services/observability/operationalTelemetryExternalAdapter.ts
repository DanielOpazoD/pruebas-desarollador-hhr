import type {
  OperationalTelemetryEvent,
  OperationalTelemetryStatus,
} from '@/services/observability/operationalTelemetryService';

export interface OperationalTelemetryExternalConfig {
  enabled: boolean;
  endpoint?: string;
  sampleRate: number;
}

const DEFAULT_SAMPLE_RATE = 1;

const normalizeSampleRate = (raw: string | undefined): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_RATE;
  return Math.max(0, Math.min(1, parsed));
};

export const resolveOperationalTelemetryExternalConfig = (): OperationalTelemetryExternalConfig => {
  const endpoint = import.meta.env.VITE_OPERATIONAL_TELEMETRY_ENDPOINT?.trim();
  const sampleRate = normalizeSampleRate(import.meta.env.VITE_OPERATIONAL_TELEMETRY_SAMPLE_RATE);

  return {
    enabled: Boolean(endpoint),
    endpoint: endpoint || undefined,
    sampleRate,
  };
};

const shouldSampleStatus = (status: OperationalTelemetryStatus, sampleRate: number): boolean => {
  if (status === 'failed') return true;
  if (sampleRate >= 1) return true;
  return Math.random() <= sampleRate;
};

const buildPayload = (event: OperationalTelemetryEvent): string =>
  JSON.stringify({
    source: 'hhr_operational_telemetry',
    event,
  });

const sendWithBeacon = (endpoint: string, payload: string): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false;
  }

  try {
    return navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
  } catch {
    return false;
  }
};

const sendWithFetch = async (endpoint: string, payload: string): Promise<void> => {
  if (typeof fetch !== 'function') {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
};

export const dispatchOperationalTelemetryExternally = async (
  event: OperationalTelemetryEvent,
  config: OperationalTelemetryExternalConfig = resolveOperationalTelemetryExternalConfig()
): Promise<boolean> => {
  if (!config.enabled || !config.endpoint) {
    return false;
  }
  if (!shouldSampleStatus(event.status, config.sampleRate)) {
    return false;
  }

  const payload = buildPayload(event);
  if (sendWithBeacon(config.endpoint, payload)) {
    return true;
  }

  try {
    await sendWithFetch(config.endpoint, payload);
    return true;
  } catch {
    return false;
  }
};
