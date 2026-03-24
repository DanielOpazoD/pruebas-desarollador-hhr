import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCensusTableViewModel } from '@/features/census/hooks/useCensusTableViewModel';
import { useCensusTableRuntime } from '@/features/census/hooks/useCensusTableRuntime';
import { getDefaultConfig } from '@/services/storage/tableConfigService';

vi.mock('@/features/census/hooks/useCensusTableRuntime', () => ({
  useCensusTableRuntime: vi.fn(),
}));

const asHookValue = <T>(value: Partial<T>): T => value as T;

describe('useCensusTableViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useCensusTableRuntime).mockReturnValue(
      asHookValue<ReturnType<typeof useCensusTableRuntime>>({
        beds: {},
        handleRowAction: vi.fn(),
        role: 'admin',
        columns: getDefaultConfig().columns,
        isEditMode: true,
        diagnosisMode: 'free',
        toggleDiagnosisMode: vi.fn(),
        activateEmptyBed: vi.fn(),
        canDeleteRecord: true,
        resetDayDeniedMessage: '',
        occupiedRows: [],
        emptyBeds: [],
        bedTypes: {},
        totalWidth: 1000,
        handleClearAll: vi.fn(),
        handleColumnResize: vi.fn(),
      })
    );
  });

  it('delegates to the unified census table runtime', () => {
    renderHook(() => useCensusTableViewModel({ currentDateString: '2026-02-15' }));

    expect(useCensusTableRuntime).toHaveBeenCalledWith({
      currentDateString: '2026-02-15',
    });
  });

  it('returns the runtime contract unchanged', () => {
    const runtime = asHookValue<ReturnType<typeof useCensusTableRuntime>>({
      beds: {},
      handleRowAction: vi.fn(),
      diagnosisMode: 'cie10',
      toggleDiagnosisMode: vi.fn(),
      role: 'admin',
      activateEmptyBed: vi.fn(),
      columns: getDefaultConfig().columns,
      isEditMode: false,
      handleColumnResize: vi.fn(),
      canDeleteRecord: false,
      resetDayDeniedMessage: 'No permitido',
      occupiedRows: [],
      emptyBeds: [],
      bedTypes: {},
      totalWidth: 900,
      handleClearAll: vi.fn(),
    });
    vi.mocked(useCensusTableRuntime).mockReturnValue(runtime);

    const { result } = renderHook(() =>
      useCensusTableViewModel({ currentDateString: '2026-02-15' })
    );

    expect(result.current).toBe(runtime);
  });
});
