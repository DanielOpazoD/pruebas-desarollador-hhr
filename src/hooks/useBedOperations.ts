/**
 * useBedOperations Hook
 * Handles bed-level operations: block, extra beds, move/copy, clear.
 * Extracted from useBedManagement for better separation of concerns.
 */

import { useCallback } from 'react';
import { DailyRecord } from '@/types';
import { useAuditContext } from '@/context/AuditContext';
import type { DailyRecordPatch } from './useDailyRecordTypes';
import {
  buildActiveExtraBeds,
  buildBlockedReasonPatch,
  buildClearAllBedsPatch,
  buildClearedPatient,
  buildMoveOrCopyPatch,
  buildToggleBedTypePatch,
  buildToggleBlockedPatch,
} from './useBedOperationsController';

// ============================================================================
// Types
// ============================================================================

export interface BedOperationsActions {
  /**
   * Clear patient data from a bed (reset to empty)
   */
  clearPatient: (bedId: string) => void;

  /**
   * Clear all beds in the record
   */
  clearAllBeds: () => void;

  /**
   * Move or copy a patient from one bed to another
   */
  moveOrCopyPatient: (type: 'move' | 'copy', sourceBedId: string, targetBedId: string) => void;

  /**
   * Toggle bed blocked status
   */
  toggleBlockBed: (bedId: string, reason?: string) => void;
  updateBlockedReason: (bedId: string, reason: string) => void;

  /**
   * Toggle extra bed activation
   */
  toggleExtraBed: (bedId: string) => void;

  /**
   * Toggle bed type (UTI/UCI)
   */
  toggleBedType: (bedId: string) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export const useBedOperations = (
  record: DailyRecord | null,
  patchRecord: (partial: DailyRecordPatch) => Promise<void>
): BedOperationsActions => {
  const { logEvent, logPatientCleared } = useAuditContext();

  // ========================================================================
  // Clear Operations
  // ========================================================================

  const clearPatient = useCallback(
    (bedId: string) => {
      if (!record) return;

      const cleanPatient = buildClearedPatient(record, bedId);

      // Audit Log
      const patientName = record.beds[bedId].patientName;
      if (patientName) {
        logPatientCleared(bedId, patientName, record.beds[bedId].rut, record.date);
      }

      // Atomic replace of bed object
      const patch: DailyRecordPatch = {};
      patch[`beds.${bedId}`] = cleanPatient;
      patchRecord(patch);
    },
    [record, patchRecord, logPatientCleared]
  );

  const clearAllBeds = useCallback(() => {
    if (!record) return;
    patchRecord(buildClearAllBedsPatch(record));
  }, [record, patchRecord]);

  // ========================================================================
  // Move/Copy Operations
  // ========================================================================

  const moveOrCopyPatient = useCallback(
    (type: 'move' | 'copy', sourceBedId: string, targetBedId: string) => {
      if (!record) return;
      const sourceData = record.beds[sourceBedId];

      // Validation: Cannot move/copy empty patient
      if (!sourceData.patientName) {
        console.warn(`Cannot ${type} empty patient from ${sourceBedId}`);
        return;
      }

      const patch = buildMoveOrCopyPatch(record, type, sourceBedId, targetBedId);
      if (!patch) {
        return;
      }

      if (type === 'move') {
        patchRecord(patch);

        // Audit
        logEvent(
          'PATIENT_MODIFIED',
          'patient',
          targetBedId,
          {
            action: 'move',
            sourceBed: sourceBedId,
            targetBed: targetBedId,
            patientName: sourceData.patientName,
            changes: {
              location: {
                old: record.beds[sourceBedId].location,
                new: record.beds[targetBedId].location,
              },
            },
          },
          sourceData.rut,
          record.date
        );
      } else {
        patchRecord(patch);

        // Audit
        logEvent(
          'PATIENT_MODIFIED',
          'patient',
          targetBedId,
          {
            action: 'copy',
            sourceBed: sourceBedId,
            targetBed: targetBedId,
            patientName: sourceData.patientName,
            changes: {
              location: { old: 'N/A', new: record.beds[targetBedId].location },
            },
          },
          sourceData.rut,
          record.date
        );
      }
    },
    [record, patchRecord, logEvent]
  );

  // ========================================================================
  // Block/Extra Bed Operations
  // ========================================

  const toggleBlockBed = useCallback(
    (bedId: string, reason?: string) => {
      if (!record) return;
      const { patch, newIsBlocked } = buildToggleBlockedPatch(record, bedId, reason);
      patchRecord(patch);

      // Audit Log
      logEvent(
        newIsBlocked ? 'BED_BLOCKED' : 'BED_UNBLOCKED',
        'patient',
        bedId,
        { bedId, reason: newIsBlocked ? reason || '' : '' },
        undefined,
        record.date
      );
    },
    [record, patchRecord, logEvent]
  );

  /**
   * Update the blocked reason for an already blocked bed without toggling the block state.
   */
  const updateBlockedReason = useCallback(
    (bedId: string, reason: string) => {
      if (!record) return;
      const currentBed = record.beds[bedId];
      if (!currentBed.isBlocked) return; // Only update if already blocked

      patchRecord(buildBlockedReasonPatch(bedId, reason));

      // Audit Log
      logEvent(
        'BED_BLOCKED',
        'patient',
        bedId,
        { bedId, reason: reason || '', updateOnly: true },
        undefined,
        record.date
      );
    },
    [record, patchRecord, logEvent]
  );

  const toggleExtraBed = useCallback(
    (bedId: string) => {
      if (!record) return;
      const currentExtras = record.activeExtraBeds || [];
      const newExtras = buildActiveExtraBeds(currentExtras, bedId);
      const isActive = newExtras.includes(bedId);

      patchRecord({ activeExtraBeds: newExtras });

      // Audit Log
      logEvent(
        'EXTRA_BED_TOGGLED',
        'dailyRecord',
        record.date,
        { bedId, active: isActive },
        undefined,
        record.date
      );
    },
    [record, patchRecord, logEvent]
  );

  const toggleBedType = useCallback(
    (bedId: string) => {
      if (!record) return;
      const togglePatch = buildToggleBedTypePatch(record, bedId);
      if (!togglePatch) return;

      patchRecord(togglePatch.patch);

      // Audit Log
      logEvent(
        'PATIENT_MODIFIED',
        'patient',
        bedId,
        { action: 'toggle_bed_type', from: togglePatch.currentType, to: togglePatch.nextType },
        record.beds[bedId]?.rut,
        record.date
      );
    },
    [record, patchRecord, logEvent]
  );

  // ========================================================================
  // Return API
  // ========================================================================

  return {
    clearPatient,
    clearAllBeds,
    moveOrCopyPatient,
    toggleBlockBed,
    updateBlockedReason,
    toggleExtraBed,
    toggleBedType,
  };
};
