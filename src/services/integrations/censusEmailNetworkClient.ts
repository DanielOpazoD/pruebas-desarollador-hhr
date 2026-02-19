const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;

const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
};

const normalizeFetchErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Tiempo de espera agotado al enviar el correo.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No se pudo enviar el correo.';
};

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
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail || '',
          'x-user-role': userRole || '',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (attempt < MAX_ATTEMPTS && isRetryableStatus(response.status)) {
          continue;
        }
        throw new Error(errorText || 'No se pudo enviar el correo.');
      }

      return response;
    } catch (error) {
      if (attempt < MAX_ATTEMPTS && isRetryableError(error)) {
        continue;
      }
      throw new Error(normalizeFetchErrorMessage(error));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('No se pudo enviar el correo.');
};
