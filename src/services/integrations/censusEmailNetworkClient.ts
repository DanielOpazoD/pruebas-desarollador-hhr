import {
  getCensusEmailRequestMaxAttempts,
  getCensusEmailRequestTimeoutMs,
  isRetryableError,
  isRetryableStatus,
  normalizeFetchErrorMessage,
} from '@/services/integrations/censusEmailRequestPolicy';
import { sendCensusEmailTransportRequest } from '@/services/integrations/censusEmailTransport';

export interface SendCensusEmailRequestOptions {
  endpoint: string;
  body: string;
  userEmail?: string | null;
  userRole?: string | null;
  fetchImpl?: typeof fetch;
}

export const sendCensusEmailRequest = async ({
  endpoint,
  body,
  userEmail,
  userRole,
  fetchImpl = fetch,
}: SendCensusEmailRequestOptions): Promise<Response> => {
  const maxAttempts = getCensusEmailRequestMaxAttempts();
  const timeoutMs = getCensusEmailRequestTimeoutMs();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await sendCensusEmailTransportRequest(
        {
          endpoint,
          body,
          userEmail,
          userRole,
          signal: controller.signal,
        },
        fetchImpl
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < maxAttempts && isRetryableStatus(response.status)) {
          continue;
        }
        throw new Error(errorText || 'No se pudo enviar el correo.');
      }

      return response;
    } catch (error) {
      if (attempt < maxAttempts && isRetryableError(error)) {
        continue;
      }
      throw new Error(normalizeFetchErrorMessage(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('No se pudo enviar el correo.');
};
