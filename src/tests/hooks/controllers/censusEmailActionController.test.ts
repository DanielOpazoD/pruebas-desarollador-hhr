import { describe, expect, it } from 'vitest';
import {
  buildClipboardCopyMessage,
  canRunCensusEmailAction,
  resolveShareLinkRole,
} from '@/hooks/controllers/censusEmailActionController';

describe('censusEmailActionController', () => {
  it('blocks actions while loading or after success', () => {
    expect(canRunCensusEmailAction('idle')).toBe(true);
    expect(canRunCensusEmailAction('error')).toBe(true);
    expect(canRunCensusEmailAction('loading')).toBe(false);
    expect(canRunCensusEmailAction('success')).toBe(false);
  });

  it('normalizes optional share-link role and clipboard copy message', () => {
    expect(resolveShareLinkRole()).toBe('viewer');
    expect(resolveShareLinkRole('downloader')).toBe('downloader');
    expect(buildClipboardCopyMessage('https://example.com')).toContain('https://example.com');
  });
});
