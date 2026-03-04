import { describe, expect, it } from 'vitest';
import {
  buildRecipientSyncPayload,
  resolveActiveRecipientListForSync,
  shouldSkipRecipientSync,
} from '@/hooks/controllers/censusEmailRecipientSyncController';

describe('censusEmailRecipientSyncController', () => {
  it('skips sync when user cannot manage or recipients did not change', () => {
    expect(
      shouldSkipRecipientSync({
        canManageGlobalRecipientLists: false,
        recipientsReady: true,
        recipients: ['a@test.com'],
        lastRemoteRecipients: ['b@test.com'],
      })
    ).toBe(true);

    expect(
      shouldSkipRecipientSync({
        canManageGlobalRecipientLists: true,
        recipientsReady: true,
        recipients: ['a@test.com'],
        lastRemoteRecipients: ['a@test.com'],
      })
    ).toBe(true);
  });

  it('resolves active list and builds sync payload', () => {
    const activeList = resolveActiveRecipientListForSync(
      [
        { id: 'census-default', name: 'Base', description: null },
        { id: 'sec', name: 'Sec', description: 'd' },
      ] as never,
      'sec'
    );

    expect(activeList?.id).toBe('sec');

    const payload = buildRecipientSyncPayload({
      activeList: activeList as never,
      recipients: ['nuevo@test.com'],
      actor: { uid: 'u1', email: 'admin@test.com' },
    });

    expect(payload.listId).toBe('sec');
    expect(payload.updatedByEmail).toBe('admin@test.com');
    expect(payload.recipients).toEqual(['nuevo@test.com']);
  });
});
