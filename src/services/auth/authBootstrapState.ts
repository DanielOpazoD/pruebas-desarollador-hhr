const AUTH_BOOTSTRAP_PENDING_KEY = 'hhr_auth_bootstrap_pending_v1';
const AUTH_BOOTSTRAP_PENDING_TTL_MS = 90_000;

type AuthBootstrapState = {
  startedAt: number;
  mode: 'redirect';
};

const readState = (): AuthBootstrapState | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(AUTH_BOOTSTRAP_PENDING_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthBootstrapState>;
    if (parsed.mode !== 'redirect' || typeof parsed.startedAt !== 'number') {
      return null;
    }

    if (Date.now() - parsed.startedAt > AUTH_BOOTSTRAP_PENDING_TTL_MS) {
      window.localStorage.removeItem(AUTH_BOOTSTRAP_PENDING_KEY);
      return null;
    }

    return { startedAt: parsed.startedAt, mode: parsed.mode };
  } catch {
    return null;
  }
};

export const markAuthBootstrapPending = (mode: 'redirect' = 'redirect'): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const payload: AuthBootstrapState = {
    startedAt: Date.now(),
    mode,
  };
  window.localStorage.setItem(AUTH_BOOTSTRAP_PENDING_KEY, JSON.stringify(payload));
};

export const isAuthBootstrapPending = (): boolean => Boolean(readState());

export const clearAuthBootstrapPending = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(AUTH_BOOTSTRAP_PENDING_KEY);
};
