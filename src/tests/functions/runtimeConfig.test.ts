import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  HOSPITAL_ID,
  HOSPITAL_CAPACITY,
} = require('../../../functions/lib/runtime/runtimeConfig.js');
const { assertSupportedHospitalId } = require('../../../functions/lib/runtime/hospitalPolicy.js');

describe('functions runtime config and hospital policy', () => {
  it('exposes a bounded default hospital runtime context', () => {
    expect(typeof HOSPITAL_ID).toBe('string');
    expect(HOSPITAL_ID.length).toBeGreaterThan(0);
    expect(HOSPITAL_CAPACITY).toBeGreaterThan(0);
  });

  it('rejects unsupported hospital ids', () => {
    expect(assertSupportedHospitalId(HOSPITAL_ID)).toBe(HOSPITAL_ID);
    expect(() => assertSupportedHospitalId('other-hospital')).toThrow(/Unsupported hospitalId/);
  });
});
