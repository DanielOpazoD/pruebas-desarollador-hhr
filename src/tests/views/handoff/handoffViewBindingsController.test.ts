import { describe, expect, it, vi } from 'vitest';
import {
  buildHandoffClinicalEventActions,
  buildHandoffMedicalActions,
  resolveEffectiveSelectedMedicalSpecialty,
} from '@/features/handoff/controllers/handoffViewBindingsController';
import type { MedicalHandoffCapabilities } from '@/features/handoff/controllers/medicalHandoffAccessController';
import { Specialty } from '@/types';

const buildCapabilities = (
  overrides: Partial<MedicalHandoffCapabilities> = {}
): MedicalHandoffCapabilities => ({
  canCreatePrimaryObservationEntry: true,
  canEditObservationEntries: true,
  canEditObservationEntrySpecialty: true,
  canAddObservationEntries: true,
  canDeleteObservationEntries: true,
  canConfirmObservationContinuity: true,
  canEditClinicalEvents: true,
  canEditDoctorName: true,
  canShowDeliverySection: true,
  canSign: true,
  canRestoreSignatures: true,
  canSendWhatsApp: true,
  canShareSignatureLinks: true,
  canCopySpecialistLink: true,
  canOpenNightCudyr: true,
  ...overrides,
});

describe('handoffViewBindingsController', () => {
  it('falls back to all when the selected specialty is no longer available', () => {
    expect(resolveEffectiveSelectedMedicalSpecialty(Specialty.CIRUGIA, [Specialty.MEDICINA])).toBe(
      'all'
    );
    expect(resolveEffectiveSelectedMedicalSpecialty('all', [Specialty.MEDICINA])).toBe('all');
    expect(
      resolveEffectiveSelectedMedicalSpecialty(Specialty.CIRUGIA, [
        Specialty.MEDICINA,
        Specialty.CIRUGIA,
      ])
    ).toBe(Specialty.CIRUGIA);
  });

  it('gates medical actions through capabilities', () => {
    const actions = buildHandoffMedicalActions({
      capabilities: buildCapabilities({
        canAddObservationEntries: false,
        canDeleteObservationEntries: false,
      }),
      onCreatePrimaryEntry: vi.fn(),
      onEntryNoteChange: vi.fn(),
      onEntrySpecialtyChange: vi.fn(),
      onEntryAdd: vi.fn(),
      onEntryDelete: vi.fn(),
      onContinuityConfirm: vi.fn(),
    });

    expect(actions.onCreatePrimaryEntry).toBeTypeOf('function');
    expect(actions.onEntryNoteChange).toBeTypeOf('function');
    expect(actions.onEntrySpecialtyChange).toBeTypeOf('function');
    expect(actions.onEntryAdd).toBeUndefined();
    expect(actions.onEntryDelete).toBeUndefined();
    expect(actions.onContinuityConfirm).toBeTypeOf('function');
  });

  it('gates clinical event actions through edit capability', () => {
    const editable = buildHandoffClinicalEventActions({
      canEditClinicalEvents: true,
      onAdd: vi.fn(),
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    });
    const readOnly = buildHandoffClinicalEventActions({
      canEditClinicalEvents: false,
      onAdd: vi.fn(),
      onUpdate: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(editable.onAdd).toBeTypeOf('function');
    expect(editable.onUpdate).toBeTypeOf('function');
    expect(editable.onDelete).toBeTypeOf('function');
    expect(readOnly.onAdd).toBeUndefined();
    expect(readOnly.onUpdate).toBeUndefined();
    expect(readOnly.onDelete).toBeUndefined();
  });
});
