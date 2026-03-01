import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const mockReload = vi.fn();

vi.mock('@/services/storage/indexedDBService', () => ({
  isDatabaseInFallbackMode: vi.fn(),
  resetLocalDatabase: vi.fn(),
}));

vi.mock('@/shared/runtime/browserWindowRuntime', () => ({
  defaultBrowserWindowRuntime: {
    reload: () => mockReload(),
  },
}));

import { isDatabaseInFallbackMode, resetLocalDatabase } from '@/services/storage/indexedDBService';
import StorageStatusBadge from '@/components/layout/StorageStatusBadge';

describe('StorageStatusBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('does not render when fallback mode is disabled', () => {
    vi.mocked(isDatabaseInFallbackMode).mockReturnValue(false);
    render(<StorageStatusBadge />);
    expect(screen.queryByText('Almacenamiento Local Limitado')).not.toBeInTheDocument();
  });

  it('uses runtime reload on retry and reset on hard cleanup', () => {
    window.sessionStorage.setItem('hhr_storage_auto_recovery_attempted_v1', 'true');
    vi.mocked(isDatabaseInFallbackMode).mockReturnValue(true);
    render(<StorageStatusBadge />);

    fireEvent.click(screen.getByRole('button', { name: /Recargar/i }));
    expect(mockReload).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Más información/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reiniciar guardado local/i }));
    expect(resetLocalDatabase).toHaveBeenCalled();
  });

  it('auto-recovers once before showing the banner', () => {
    vi.mocked(isDatabaseInFallbackMode).mockReturnValue(true);

    render(<StorageStatusBadge />);

    expect(mockReload).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Almacenamiento Local Limitado')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem('hhr_storage_auto_recovery_attempted_v1')).toBe('true');
  });
});
