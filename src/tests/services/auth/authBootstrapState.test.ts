import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAuthBootstrapPending,
  markAuthBootstrapPending,
  restoreAuthBootstrapReturnTo,
} from '@/services/auth/authBootstrapState';

describe('authBootstrapState', () => {
  const originalLocation = window.location;
  const replaceState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Reflect.deleteProperty(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/',
        search: '',
        hash: '',
      },
    });
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: {
        ...window.history,
        state: null,
        replaceState,
      },
    });
  });

  afterEach(() => {
    clearAuthBootstrapPending();
    Reflect.deleteProperty(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('stores and restores the original specialist link after redirect auth', () => {
    markAuthBootstrapPending(
      'redirect',
      '/?mode=specialist-medical-handoff&date=2026-03-14&scope=upc&specialty=Cirug%C3%ADa'
    );

    restoreAuthBootstrapReturnTo();

    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/?mode=specialist-medical-handoff&date=2026-03-14&scope=upc&specialty=Cirug%C3%ADa'
    );
  });
});
