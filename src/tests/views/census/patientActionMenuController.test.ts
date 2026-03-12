import { describe, expect, it, vi } from 'vitest';

import {
  buildPatientActionMenuModel,
  resolvePatientActionMenuCallbackAvailability,
} from '@/features/census/controllers/patientActionMenuController';

describe('patientActionMenuController', () => {
  it('derives callback availability from optional handlers', () => {
    expect(
      resolvePatientActionMenuCallbackAvailability({
        onViewHistory: vi.fn(),
        onViewClinicalDocuments: undefined,
        onViewExamRequest: vi.fn(),
        onViewImagingRequest: undefined,
      })
    ).toEqual({
      hasHistoryAction: true,
      hasClinicalDocumentsAction: false,
      hasExamRequestAction: true,
      hasImagingRequestAction: false,
    });
  });

  it('builds a full action-menu model from row state and callback availability', () => {
    const model = buildPatientActionMenuModel({
      align: 'bottom',
      isBlocked: true,
      readOnly: false,
      showCmaAction: false,
      indicators: {
        hasClinicalDocument: true,
        isNewAdmission: true,
      },
      callbackAvailability: {
        hasHistoryAction: true,
        hasClinicalDocumentsAction: true,
        hasExamRequestAction: true,
        hasImagingRequestAction: false,
      },
    });

    expect(model.binding.align).toBe('bottom');
    expect(model.binding.indicators).toEqual({
      hasClinicalDocument: true,
      isNewAdmission: true,
    });
    expect(model.binding.availability.showClinicalDocumentsAction).toBe(false);
    expect(model.utilityActions.map(action => action.action)).toEqual(['clear']);
  });
});
