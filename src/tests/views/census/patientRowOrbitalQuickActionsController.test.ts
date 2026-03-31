import { describe, expect, it } from 'vitest';
import {
  buildPatientRowOrbitalQuickActionItems,
  hasPatientRowOrbitalQuickActions,
} from '@/features/census/controllers/patientRowOrbitalQuickActionsController';

describe('patientRowOrbitalQuickActionsController', () => {
  it('builds visible orbital items with trigonometrically derived coordinates', () => {
    const items = buildPatientRowOrbitalQuickActionItems({
      showClinicalDocumentsAction: true,
      showExamRequestAction: true,
      showImagingRequestAction: true,
    });

    expect(items.map(item => item.id)).toEqual([
      'clinical-documents',
      'exam-request',
      'imaging-request',
    ]);
    expect(items[0]).toMatchObject({
      angleDeg: -60,
      x: 25,
      y: -43.3,
      iconAsset: 'rongorongo',
    });
    expect(items[1]).toMatchObject({
      angleDeg: 0,
      x: 50,
      y: 0,
      iconAsset: 'mangai',
    });
    expect(items[2]).toMatchObject({
      angleDeg: 60,
      x: 25,
      y: 43.3,
      iconAsset: 'ahutepitokura',
    });
  });

  it('reports when no quick clinical action is available', () => {
    expect(
      hasPatientRowOrbitalQuickActions({
        showClinicalDocumentsAction: false,
        showExamRequestAction: false,
        showImagingRequestAction: false,
      })
    ).toBe(false);
  });
});
