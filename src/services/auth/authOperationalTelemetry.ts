import {
  createOperationalError,
  normalizeOperationalError,
  type OperationalError,
  type OperationalErrorShape,
} from '@/services/observability/operationalError';
import {
  recordOperationalErrorTelemetry,
  recordOperationalTelemetry,
} from '@/services/observability/operationalTelemetryService';

export const recordAuthOperationalError = (
  operation: string,
  error: unknown,
  fallback: OperationalErrorShape,
  options: { context?: Record<string, unknown> } = {}
): OperationalError => recordOperationalErrorTelemetry('auth', operation, error, fallback, options);

export const emitAuthOperationalEvent = (
  operation: string,
  status: 'degraded' | 'failed',
  input: OperationalErrorShape
): OperationalError => {
  const operationalError = normalizeOperationalError(createOperationalError(input), input);
  recordOperationalTelemetry({
    category: 'auth',
    operation,
    status,
    context: {
      errorCode: operationalError.code,
      ...operationalError.context,
    },
    issues: [operationalError.userSafeMessage || operationalError.message],
  });
  return operationalError;
};
