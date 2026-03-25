import { describe, expect, it } from 'vitest';
import {
  formatCensusDateTime,
  formatCensusIsoDate,
  formatCensusMonthName,
  formatCensusRouteDateLabel,
  formatCensusShortDayMonth,
} from '@/shared/census/censusPresentation';

describe('censusPresentation', () => {
  it('formats census ISO dates consistently', () => {
    expect(formatCensusIsoDate('2025-01-02')).toBe('02-01-2025');
    expect(formatCensusShortDayMonth('2025-01-02')).toBe('02-01');
    expect(formatCensusRouteDateLabel('2025-01-02')).toBe('02-01-2025');
  });

  it('builds a capitalized month label and tolerates invalid dates', () => {
    expect(formatCensusMonthName('2025-03-15')).toBe('Marzo');
    expect(formatCensusIsoDate('invalid-date')).toBe('invalid-date');
  });

  it('formats census timestamps for exports and secondary views', () => {
    expect(formatCensusDateTime('2026-03-17T10:30:00.000Z')).toContain('17-03-2026');
    expect(formatCensusDateTime(undefined)).toBe('sin registro');
    expect(formatCensusDateTime('not-a-date')).toBe('not-a-date');
  });
});
