import { describe, expect, it } from 'vitest';
import {
  canEditMedicalHandoffForDate,
  canForceCreateDayCopyOverride,
  canOpenClinicalDocumentsFromCensus,
  canResetOrDeleteDailyRecord,
  canUseCensusUtilityActions,
  canVerifyPassiveBackupForRole,
  canVerifyArchiveStatusForModule,
} from '@/shared/access/operationalAccessPolicy';

describe('operationalAccessPolicy', () => {
  it('allows only admin to force day copy override', () => {
    expect(canForceCreateDayCopyOverride('admin')).toBe(true);
    expect(canForceCreateDayCopyOverride('doctor_specialist')).toBe(false);
    expect(canForceCreateDayCopyOverride('nurse_hospital')).toBe(false);
  });

  it('allows archive verification only for editable census and nursing handoff modules', () => {
    expect(canVerifyArchiveStatusForModule('admin', 'CENSUS')).toBe(true);
    expect(canVerifyArchiveStatusForModule('nurse_hospital', 'NURSING_HANDOFF')).toBe(true);
    expect(canVerifyArchiveStatusForModule('doctor_specialist', 'CENSUS')).toBe(false);
    expect(canVerifyArchiveStatusForModule('doctor_specialist', 'MEDICAL_HANDOFF')).toBe(false);
    expect(canVerifyPassiveBackupForRole('admin', 'CENSUS')).toBe(true);
  });

  it('keeps medical handoff edit access bound to specialist current-day policy', () => {
    expect(
      canEditMedicalHandoffForDate({
        role: 'doctor_specialist',
        readOnly: false,
        recordDate: '2026-03-16',
        todayISO: '2026-03-16',
      })
    ).toBe(true);

    expect(
      canEditMedicalHandoffForDate({
        role: 'doctor_specialist',
        readOnly: false,
        recordDate: '2026-03-15',
        todayISO: '2026-03-16',
      })
    ).toBe(false);
  });

  it('resolves census utility actions, clinical document access and reset permissions by intent', () => {
    expect(canUseCensusUtilityActions({ readOnly: false, accessProfile: 'default' })).toBe(true);
    expect(canUseCensusUtilityActions({ readOnly: false, accessProfile: 'specialist' })).toBe(
      false
    );

    expect(
      canOpenClinicalDocumentsFromCensus({
        role: 'doctor_specialist',
        isBlocked: false,
        isEmpty: false,
        hasPatientName: true,
      })
    ).toBe(true);

    expect(
      canResetOrDeleteDailyRecord({
        role: 'nurse_hospital',
        isToday: true,
      })
    ).toBe(true);
    expect(
      canResetOrDeleteDailyRecord({
        role: 'nurse_hospital',
        isToday: false,
      })
    ).toBe(false);
  });
});
