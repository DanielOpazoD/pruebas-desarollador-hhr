import { afterEach, describe, expect, it, vi } from 'vitest';

import { shouldUseSingleTabFirestoreCache } from '@/services/firebase-runtime/firebaseEnvironmentPolicy';

describe('firebaseEnvironmentPolicy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults Firestore cache ownership to multi-tab', () => {
    vi.stubEnv('VITE_FIRESTORE_FORCE_SINGLE_TAB_CACHE', '');

    expect(shouldUseSingleTabFirestoreCache()).toBe(false);
  });

  it('allows explicitly forcing single-tab Firestore cache', () => {
    vi.stubEnv('VITE_FIRESTORE_FORCE_SINGLE_TAB_CACHE', 'true');

    expect(shouldUseSingleTabFirestoreCache()).toBe(true);
  });
});
