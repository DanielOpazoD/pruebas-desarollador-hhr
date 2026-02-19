import { describe, expect, it } from 'vitest';
import { isExpectedStorageLookupMiss } from '@/services/backup/storageErrorPolicy';

describe('storageErrorPolicy', () => {
  it('returns true for known storage miss codes', () => {
    expect(isExpectedStorageLookupMiss({ code: 'storage/object-not-found' })).toBe(true);
    expect(isExpectedStorageLookupMiss({ code: 'storage/unauthorized' })).toBe(true);
    expect(isExpectedStorageLookupMiss({ code: 'storage/unauthenticated' })).toBe(true);
  });

  it('returns true when error includes HTTP 403/404 signals', () => {
    expect(
      isExpectedStorageLookupMiss({ code: 'storage/unknown', message: 'HTTP 404 Not Found' })
    ).toBe(true);
    expect(
      isExpectedStorageLookupMiss({
        code: 'storage/unknown',
        customData: { serverResponse: 'status: 403 Forbidden' },
      })
    ).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isExpectedStorageLookupMiss(new Error('network timeout'))).toBe(false);
    expect(isExpectedStorageLookupMiss({ code: 'storage/retry-limit-exceeded' })).toBe(false);
  });
});
