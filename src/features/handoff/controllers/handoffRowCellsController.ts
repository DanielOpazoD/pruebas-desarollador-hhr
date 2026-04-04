import { resolveMedicalObservationEntries } from '@/domain/handoff/patientView';
import { PatientStatus } from '@/domain/handoff/patientContracts';
import type { MedicalBadgeVariant } from '@/shared/ui/medicalBadgeContracts';

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

export { resolveMedicalObservationEntries };
