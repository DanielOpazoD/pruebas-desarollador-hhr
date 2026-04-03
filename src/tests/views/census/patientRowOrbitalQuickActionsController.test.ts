import { describe, expect, it } from 'vitest';
import {
  buildPatientRowOrbitalQuickActionItems,
  hasPatientRowOrbitalQuickActions,
} from '@/features/census/controllers/patientRowOrbitalQuickActionsController';

describe('patientRowOrbitalQuickActionsController', () => {
  it('builds visible quick action items in the configured display order', () => {
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
      label: 'Documentos',
      iconAsset: 'rongorongo',
    });
    expect(items[1]).toMatchObject({
      label: 'Laboratorio',
      iconAsset: 'mangai',
    });
    expect(items[2]).toMatchObject({
      label: 'Imágenes',
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
