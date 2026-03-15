import {
  getDisplayMedicalHandoffEntries,
  getPatientMedicalHandoffEntries,
} from '@/features/handoff/controllers';
import type { MedicalBadgeVariant } from '@/components/ui/base/MedicalBadge';
import type { PatientData } from '@/types';
import { PatientStatus } from '@/types';

export const resolveHandoffStatusVariant = (
  status: PatientStatus | string | undefined
): MedicalBadgeVariant =>
  status === PatientStatus.GRAVE ? 'red' : status === PatientStatus.DE_CUIDADO ? 'orange' : 'green';

export const canToggleClinicalEvents = ({
  isSubRow,
  hasEvents,
  canEditEvents,
}: {
  isSubRow: boolean;
  hasEvents: boolean;
  canEditEvents: boolean;
}): boolean => !isSubRow && (canEditEvents || hasEvents);

export const shouldRenderClinicalEventsPanel = ({
  showEvents,
  canAdd,
  canUpdate,
  canDelete,
}: {
  showEvents: boolean;
  canAdd: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}): boolean => showEvents && canAdd && canUpdate && canDelete;

export const resolveMedicalObservationEntries = ({
  patient,
  isFieldReadOnly,
  hasCreatePrimaryEntryAction,
}: {
  patient: PatientData;
  isFieldReadOnly: boolean;
  hasCreatePrimaryEntryAction: boolean;
}) => {
  const persistedEntries = getPatientMedicalHandoffEntries(patient);
  if (persistedEntries.length > 0) {
    return persistedEntries;
  }

  if (!isFieldReadOnly && !hasCreatePrimaryEntryAction) {
    return getDisplayMedicalHandoffEntries(patient, true);
  }

  return [];
};
