const REQUEST_TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 2;

export const getCensusEmailRequestTimeoutMs = (): number => REQUEST_TIMEOUT_MS;

export const getCensusEmailRequestMaxAttempts = (): number => MAX_ATTEMPTS;

export const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return false;
};

export const normalizeFetchErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Tiempo de espera agotado al enviar el correo.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'No se pudo enviar el correo.';
};
