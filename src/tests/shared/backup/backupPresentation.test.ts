import { describe, expect, it } from 'vitest';
import {
  formatBackupDisplayDate,
  formatBackupShiftLabel,
  formatBackupTimestamp,
  getBackupShiftPresentation,
  getBackupTypePresentation,
} from '@/shared/backup/backupPresentation';

describe('backupPresentation', () => {
  it('resolves backup type and shift labels from shared presentation helpers', () => {
    expect(getBackupTypePresentation('CENSUS').label).toBe('Censo Diario');
    expect(getBackupShiftPresentation('night').label).toBe('Turno Noche');
    expect(formatBackupShiftLabel('day')).toBe('Turno Largo');
  });

  it('formats backup dates for UI surfaces', () => {
    expect(formatBackupDisplayDate('2026-03-15')).toBe('15-03-2026');
    expect(formatBackupTimestamp('2026-03-15T10:30:00.000Z')).toContain('15-03-2026');
  });
});
