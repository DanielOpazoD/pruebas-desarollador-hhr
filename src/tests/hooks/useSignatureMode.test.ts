import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignatureMode } from '@/hooks/useSignatureMode';

describe('useSignatureMode', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?mode=signature'),
      writable: true,
      configurable: true,
    });
  });

  it('detects signature mode from URL without mutating auth state', () => {
    const { result } = renderHook(() => useSignatureMode('2024-12-28', null, false));

    expect(result.current.isSignatureMode).toBe(true);
    expect(result.current.signatureDate).toBeNull();
  });

  it('normalizes DD-MM-YYYY signature dates', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?mode=signature&date=03-03-2026'),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useSignatureMode('2024-12-28', null, false));
    expect(result.current.currentDateString).toBe('2026-03-03');
  });

  it('returns the navigation date outside signature mode', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/'),
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useSignatureMode('2024-12-28', null, false));
    expect(result.current.isSignatureMode).toBe(false);
    expect(result.current.currentDateString).toBe('2024-12-28');
  });
});
