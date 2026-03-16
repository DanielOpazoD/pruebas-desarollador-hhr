import { describe, expect, it, vi } from 'vitest';
import {
  buildEmptyDayPromptProps,
  buildRegisterContentProps,
  resolveCensusViewBranch,
} from '@/features/census/controllers/censusViewController';

describe('censusViewController', () => {
  it('prioritizes analytics branch over record presence', () => {
    expect(resolveCensusViewBranch({ viewMode: 'ANALYTICS', beds: {} })).toBe('analytics');
  });

  it('returns empty branch when register view has no beds', () => {
    expect(resolveCensusViewBranch({ viewMode: 'REGISTER', beds: null })).toBe('empty');
  });

  it('returns register branch when record exists', () => {
    expect(resolveCensusViewBranch({ viewMode: 'REGISTER', beds: {} })).toBe('register');
  });

  it('builds empty day prompt props without reshaping values', () => {
    const onCreateDay = vi.fn();
    const result = buildEmptyDayPromptProps({
      selectedDay: 14,
      selectedMonth: 2,
      currentDateString: '2026-03-14',
      previousRecordAvailable: true,
      previousRecordDate: '2026-03-13',
      availableDates: ['2026-03-13'],
      onCreateDay,
      readOnly: false,
      allowAdminCopyOverride: true,
    });

    expect(result).toEqual({
      selectedDay: 14,
      selectedMonth: 2,
      currentDateString: '2026-03-14',
      previousRecordAvailable: true,
      previousRecordDate: '2026-03-13',
      availableDates: ['2026-03-13'],
      onCreateDay,
      readOnly: false,
      allowAdminCopyOverride: true,
    });
  });

  it('builds register content props without dropping fields', () => {
    const onCloseBedManagerModal = vi.fn();
    const result = buildRegisterContentProps({
      currentDateString: '2026-03-14',
      readOnly: true,
      localViewMode: 'TABLE',
      beds: {},
      visibleBeds: [],
      marginStyle: { padding: '0 12px' },
      stats: null,
      showBedManagerModal: true,
      onCloseBedManagerModal,
    });

    expect(result).toEqual({
      currentDateString: '2026-03-14',
      readOnly: true,
      localViewMode: 'TABLE',
      beds: {},
      visibleBeds: [],
      marginStyle: { padding: '0 12px' },
      stats: null,
      showBedManagerModal: true,
      onCloseBedManagerModal,
    });
  });
});
