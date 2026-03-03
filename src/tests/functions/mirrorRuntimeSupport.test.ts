import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  canParseMirrorRecordDate,
  shouldSkipMirroringDailyRecord,
} = require('../../../functions/lib/mirror/mirrorRuntimeSupport.js');

describe('functions mirrorRuntimeSupport', () => {
  it('parses valid mirror document dates and rejects invalid ones', () => {
    expect(canParseMirrorRecordDate('2026-03-01')).toBeInstanceOf(Date);
    expect(canParseMirrorRecordDate('bad-date')).toBeNull();
  });

  it('skips mirroring when the record is stale or recently synced', () => {
    const now = Date.parse('2026-03-02T12:00:00.000Z');

    expect(
      shouldSkipMirroringDailyRecord({
        docId: '2026-02-27',
        now,
      })
    ).toBe(true);

    expect(
      shouldSkipMirroringDailyRecord({
        docId: '2026-03-02',
        sourceLastUpdatedMs: 10,
        betaSyncedAtMs: now - 1000,
        betaLastUpdatedMs: 5,
        now,
      })
    ).toBe(true);

    expect(
      shouldSkipMirroringDailyRecord({
        docId: '2026-03-02',
        sourceLastUpdatedMs: 10,
        betaSyncedAtMs: now - 6000,
        betaLastUpdatedMs: 10,
        now,
      })
    ).toBe(true);
  });

  it('keeps mirroring active when the record is current and changed', () => {
    const now = Date.parse('2026-03-02T12:00:00.000Z');

    expect(
      shouldSkipMirroringDailyRecord({
        docId: '2026-03-02',
        sourceLastUpdatedMs: 20,
        betaSyncedAtMs: now - 10000,
        betaLastUpdatedMs: 10,
        now,
      })
    ).toBe(false);
  });
});
