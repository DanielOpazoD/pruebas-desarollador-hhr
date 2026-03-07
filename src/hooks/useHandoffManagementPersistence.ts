import { useCallback } from 'react';
import type { RefObject } from 'react';
import type { DailyRecord, MedicalHandoffActor, MedicalSpecialty } from '@/types';
import type { AuditAction, AuditLogEntry } from '@/types/audit';
import { getAttributedAuthors } from '@/services/admin/attributionService';
import type { MedicalHandoffScope } from '@/features/handoff/controllers';
import {
  buildChecklistUpdateRecord,
  buildMedicalNoChangesRecord,
  buildMedicalSignatureRecord,
  buildMedicalSpecialtyNoteRecord,
  buildNovedadesUpdateRecord,
  buildResetMedicalHandoffRecord,
  normalizeMedicalHandoffActor,
} from '@/features/handoff/controllers/handoffManagementController';
import type { ConfirmMedicalSpecialtyNoChangesInput } from '@/hooks/handoffManagementTypes';

interface HandoffManagementPersistenceInput {
  recordRef: RefObject<DailyRecord | null>;
  saveAndUpdate: (updatedRecord: DailyRecord) => Promise<void>;
  logEvent: (
    action: AuditAction,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: Record<string, unknown>,
    patientRut?: string,
    recordDate?: string,
    authors?: string
  ) => void;
  logDebouncedEvent: (
    action: AuditAction,
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: Record<string, unknown>,
    patientRut?: string,
    recordDate?: string,
    authors?: string
  ) => void;
  userId: string;
  notifyError: (title: string, message: string) => void;
}

export const useHandoffManagementPersistence = ({
  recordRef,
  saveAndUpdate,
  logEvent,
  logDebouncedEvent,
  userId,
  notifyError,
}: HandoffManagementPersistenceInput) => {
  const getCurrentRecord = useCallback(() => recordRef.current, [recordRef]);

  const updateHandoffChecklist = useCallback(
    (shift: 'day' | 'night', field: string, value: boolean | string) => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;
      void saveAndUpdate(buildChecklistUpdateRecord(currentRecord, shift, field, value));
    },
    [getCurrentRecord, saveAndUpdate]
  );

  const updateHandoffNovedades = useCallback(
    (shift: 'day' | 'night' | 'medical', value: string) => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;
      void saveAndUpdate(buildNovedadesUpdateRecord(currentRecord, shift, value));

      const authors = getAttributedAuthors(
        userId,
        currentRecord,
        shift === 'medical' ? undefined : (shift as 'day' | 'night')
      );
      const oldContent =
        shift === 'day'
          ? currentRecord.handoffNovedadesDayShift
          : shift === 'night'
            ? currentRecord.handoffNovedadesNightShift
            : currentRecord.medicalHandoffNovedades;

      logDebouncedEvent(
        'HANDOFF_NOVEDADES_MODIFIED',
        'dailyRecord',
        currentRecord.date,
        {
          shift,
          value,
          changes: {
            novedades: { old: oldContent || '', new: value },
          },
        },
        undefined,
        currentRecord.date,
        authors
      );
    },
    [getCurrentRecord, logDebouncedEvent, saveAndUpdate, userId]
  );

  const updateMedicalSpecialtyNote = useCallback(
    async (specialty: MedicalSpecialty, value: string, actor: Partial<MedicalHandoffActor>) => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;
      const currentNote = currentRecord.medicalHandoffBySpecialty?.[specialty];
      const updatedRecord = buildMedicalSpecialtyNoteRecord(currentRecord, specialty, value, actor);
      await saveAndUpdate(updatedRecord);

      logDebouncedEvent(
        'HANDOFF_NOVEDADES_MODIFIED',
        'dailyRecord',
        currentRecord.date,
        {
          shift: 'medical',
          specialty,
          value,
          operation: 'specialty_note_update',
          changes: {
            novedades: { old: currentNote?.note || '', new: value },
          },
        },
        undefined,
        currentRecord.date
      );
    },
    [getCurrentRecord, logDebouncedEvent, saveAndUpdate]
  );

  const confirmMedicalSpecialtyNoChanges = useCallback(
    async ({ specialty, actor, comment, dateKey }: ConfirmMedicalSpecialtyNoChangesInput) => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;

      const currentNote = currentRecord.medicalHandoffBySpecialty?.[specialty];
      if (!currentNote?.note?.trim()) {
        notifyError(
          'Sin nota base',
          'Primero debe existir una entrega del especialista para confirmar continuidad.'
        );
        return;
      }

      const effectiveDateKey = dateKey || currentRecord.date;
      if (currentNote.updatedAt?.slice(0, 10) === effectiveDateKey) {
        notifyError(
          'Ya actualizado hoy',
          'Esta especialidad ya fue actualizada hoy por un especialista.'
        );
        return;
      }

      const now = new Date().toISOString();
      const normalizedActor = normalizeMedicalHandoffActor(actor, specialty);
      const updatedRecord = buildMedicalNoChangesRecord(
        currentRecord,
        specialty,
        actor,
        comment,
        effectiveDateKey
      );
      await saveAndUpdate(updatedRecord);

      logEvent(
        'HANDOFF_NOVEDADES_MODIFIED',
        'dailyRecord',
        currentRecord.date,
        {
          shift: 'medical',
          specialty,
          operation: 'confirm_no_changes',
          comment:
            updatedRecord.medicalHandoffBySpecialty?.[specialty]?.dailyContinuity?.[
              effectiveDateKey
            ]?.comment,
          confirmedAt: now,
          confirmedBy: normalizedActor.displayName,
        },
        undefined,
        currentRecord.date
      );
    },
    [getCurrentRecord, logEvent, notifyError, saveAndUpdate]
  );

  const updateHandoffStaff = useCallback(
    (shift: 'day' | 'night', type: 'delivers' | 'receives' | 'tens', staffList: string[]) => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;

      const updatedRecord = { ...currentRecord };

      if (shift === 'day') {
        if (type === 'delivers') {
          updatedRecord.nursesDayShift = staffList;
        } else if (type === 'receives') {
          updatedRecord.nursesNightShift = staffList;
        } else if (type === 'tens') {
          updatedRecord.tensDayShift = staffList;
        }
      } else {
        if (type === 'delivers') {
          updatedRecord.nursesNightShift = staffList;
        } else if (type === 'receives') {
          updatedRecord.handoffNightReceives = staffList;
        } else if (type === 'tens') {
          updatedRecord.tensNightShift = staffList;
        }
      }

      updatedRecord.lastUpdated = new Date().toISOString();
      void saveAndUpdate(updatedRecord);
    },
    [getCurrentRecord, saveAndUpdate]
  );

  const updateMedicalSignature = useCallback(
    async (doctorName: string, scope: MedicalHandoffScope = 'all') => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;
      const updatedRecord = buildMedicalSignatureRecord(currentRecord, doctorName, scope);
      await saveAndUpdate(updatedRecord);

      logEvent(
        'MEDICAL_HANDOFF_SIGNED',
        'dailyRecord',
        currentRecord.date,
        {
          doctorName,
          signedAt: updatedRecord.medicalSignatureByScope?.[scope]?.signedAt,
          scope,
        },
        undefined,
        currentRecord.date
      );
    },
    [getCurrentRecord, logEvent, saveAndUpdate]
  );

  const updateMedicalHandoffDoctor = useCallback(
    async (doctorName: string): Promise<void> => {
      const currentRecord = getCurrentRecord();
      if (!currentRecord) return;

      const updatedRecord = { ...currentRecord };
      updatedRecord.medicalHandoffDoctor = doctorName;
      updatedRecord.lastUpdated = new Date().toISOString();
      await saveAndUpdate(updatedRecord);
    },
    [getCurrentRecord, saveAndUpdate]
  );

  const resetMedicalHandoffState = useCallback(async () => {
    const currentRecord = getCurrentRecord();
    if (!currentRecord) return;
    const clearedFields: string[] = [];

    if (currentRecord.medicalHandoffSentAt) {
      clearedFields.push('entrega');
    }

    if (currentRecord.medicalSignature) {
      clearedFields.push('firma');
    }
    const updatedRecord = buildResetMedicalHandoffRecord(currentRecord);
    await saveAndUpdate(updatedRecord);

    logEvent(
      'MEDICAL_HANDOFF_RESTORED',
      'dailyRecord',
      currentRecord.date,
      {
        clearedFields,
        hadMedicalHandoffSentAt: Boolean(currentRecord.medicalHandoffSentAt),
        hadMedicalSignature: Boolean(currentRecord.medicalSignature),
        hadScopedMedicalHandoffSentAt: Boolean(
          currentRecord.medicalHandoffSentAtByScope &&
          Object.keys(currentRecord.medicalHandoffSentAtByScope).length > 0
        ),
        hadScopedMedicalSignature: Boolean(
          currentRecord.medicalSignatureByScope &&
          Object.keys(currentRecord.medicalSignatureByScope).length > 0
        ),
        doctorName: currentRecord.medicalHandoffDoctor || '',
      },
      undefined,
      currentRecord.date
    );
  }, [getCurrentRecord, logEvent, saveAndUpdate]);

  return {
    updateHandoffChecklist,
    updateHandoffNovedades,
    updateMedicalSpecialtyNote,
    confirmMedicalSpecialtyNoChanges,
    updateHandoffStaff,
    updateMedicalSignature,
    updateMedicalHandoffDoctor,
    resetMedicalHandoffState,
  };
};
