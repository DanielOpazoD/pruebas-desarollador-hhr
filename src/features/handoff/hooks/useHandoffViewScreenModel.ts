import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Stethoscope } from 'lucide-react';

import { useDailyRecordData } from '@/context/DailyRecordContext';
import { useDailyRecordHandoffActions } from '@/context/useDailyRecordScopedActions';
import { useStaffContext } from '@/context/StaffContext';
import { useNotification } from '@/context/UIContext';
import { useAuditContext } from '@/context/AuditContext';
import { useAuth } from '@/context';
import { useHandoffLogic } from '@/hooks';
import { useUIState, type UseUIStateReturn } from '@/hooks/useUIState';
import { getAttributedAuthors } from '@/services/admin/attributionService';
import {
  resolveInitialMedicalScopeFromSearch,
  resolveInitialMedicalSpecialtyFromSearch,
} from '@/domain/handoff/view';
import {
  buildHandoffClinicalEventActions,
  buildHandoffMedicalActions,
  resolveHandoffMedicalBindings,
} from '@/features/handoff/controllers/handoffViewBindingsController';
import { resolveMedicalHandoffCapabilities } from '@/features/handoff/controllers/medicalHandoffAccessController';
import {
  resolveHandoffDocumentTitle,
  resolveHandoffTableHeaderClass,
  resolveHandoffTitle,
} from '@/features/handoff/controllers/handoffViewController';
import { canEditMedicalHandoffForDate } from '@/shared/access/operationalAccessPolicy';
import type { Specialty } from '@/types/domain/base';
import type { MedicalHandoffScope } from '@/types/medicalHandoff';
import type {
  HandoffClinicalEventActions,
  HandoffMedicalActions,
} from '../components/handoffRowContracts';

interface UseHandoffViewScreenModelParams {
  type?: 'nursing' | 'medical';
  readOnly?: boolean;
  ui?: UseUIStateReturn;
  medicalScope?: MedicalHandoffScope;
}

export const useHandoffViewScreenModel = ({
  type = 'nursing',
  readOnly = false,
  ui: propUi,
  medicalScope,
}: UseHandoffViewScreenModelParams) => {
  const initialMedicalSpecialtyFromUrl = useMemo(
    () =>
      typeof window === 'undefined'
        ? ('all' as Specialty | 'all')
        : resolveInitialMedicalSpecialtyFromSearch(window.location.search),
    []
  );
  const initialMedicalScopeFromUrl = useMemo(
    () =>
      typeof window === 'undefined'
        ? ('all' as MedicalHandoffScope)
        : resolveInitialMedicalScopeFromSearch(window.location.search),
    []
  );
  const effectiveMedicalScope = medicalScope ?? initialMedicalScopeFromUrl;
  const { record } = useDailyRecordData();
  const {
    updateHandoffChecklist,
    updateHandoffNovedades,
    updateHandoffStaff,
    updateMedicalHandoffDoctor,
    markMedicalHandoffAsSent,
    resetMedicalHandoffState,
  } = useDailyRecordHandoffActions();
  const { nursesList } = useStaffContext();
  const { success } = useNotification();
  const { logEvent, userId } = useAuditContext();
  const { role } = useAuth();
  const logEventRef = useRef(logEvent);
  const recordRef = useRef(record);
  const [selectedMedicalSpecialty, setSelectedMedicalSpecialty] = useState<Specialty | 'all'>(
    initialMedicalSpecialtyFromUrl
  );

  useEffect(() => void (logEventRef.current = logEvent), [logEvent]);
  useEffect(() => void (recordRef.current = record), [record]);

  const localUi = useUIState();
  const ui = propUi || localUi;

  const handoffLogic = useHandoffLogic({
    type,
    selectedShift: ui.selectedShift,
    setSelectedShift: ui.setSelectedShift,
    onSuccess: success,
  });

  const {
    selectedShift,
    isMedical,
    visibleBeds,
    hasAnyPatients,
    schedule,
    noteField,
    deliversList,
    receivesList,
    tensList,
    shouldShowPatient,
    handleNursingNoteChange,
    handleMedicalPrimaryEntryCreate,
    handleMedicalEntryAdd,
    handleMedicalEntryDelete,
    handleMedicalEntryNoteChange,
    handleMedicalEntrySpecialtyChange,
    handleMedicalRefreshAsCurrent,
    handleShareLink,
    handleSendWhatsAppManual,
    formatPrintDate,
    handleClinicalEventAdd,
    handleClinicalEventUpdate,
    handleClinicalEventDelete,
  } = handoffLogic;

  const medicalBindings = useMemo(
    () =>
      resolveHandoffMedicalBindings({
        visibleBeds,
        record,
        isMedical,
        medicalScope: effectiveMedicalScope,
        selectedMedicalSpecialty,
        shouldShowPatient,
      }),
    [
      effectiveMedicalScope,
      isMedical,
      record,
      selectedMedicalSpecialty,
      shouldShowPatient,
      visibleBeds,
    ]
  );

  const recordDate = record?.date;

  useEffect(() => {
    if (!recordDate) {
      return;
    }

    const currentRecord = recordRef.current;
    if (!currentRecord) {
      return;
    }

    const authors = getAttributedAuthors(
      userId,
      currentRecord,
      isMedical ? undefined : (selectedShift as 'day' | 'night')
    );

    logEventRef.current(
      isMedical ? 'VIEW_MEDICAL_HANDOFF' : 'VIEW_NURSING_HANDOFF',
      'dailyRecord',
      recordDate,
      {
        view: isMedical ? 'medical_handoff' : 'nursing_handoff',
        shift: selectedShift,
      },
      undefined,
      recordDate,
      authors
    );
  }, [isMedical, recordDate, selectedShift, userId]);

  useEffect(() => {
    const nextTitle = resolveHandoffDocumentTitle({
      isMedical,
      selectedShift,
      recordDate: record?.date,
    });
    if (!nextTitle) {
      return;
    }

    document.title = nextTitle;
    return () => void (document.title = 'Hospital Hanga Roa');
  }, [isMedical, record?.date, selectedShift]);

  const title = resolveHandoffTitle({ isMedical, selectedShift });
  const effectiveReadOnly =
    readOnly ||
    (isMedical &&
      !canEditMedicalHandoffForDate({
        role,
        readOnly,
        recordDate: record?.date,
      }));

  const medicalCapabilities = useMemo(
    () =>
      resolveMedicalHandoffCapabilities({
        role,
        readOnly: effectiveReadOnly,
        recordDate: record?.date,
      }),
    [effectiveReadOnly, record?.date, role]
  );

  const medicalActions: HandoffMedicalActions = useMemo(
    () =>
      buildHandoffMedicalActions({
        capabilities: medicalCapabilities,
        onCreatePrimaryEntry: handleMedicalPrimaryEntryCreate,
        onEntryNoteChange: handleMedicalEntryNoteChange,
        onEntrySpecialtyChange: handleMedicalEntrySpecialtyChange,
        onEntryAdd: handleMedicalEntryAdd,
        onEntryDelete: handleMedicalEntryDelete,
        onRefreshAsCurrent: handleMedicalRefreshAsCurrent,
      }),
    [
      handleMedicalEntryAdd,
      handleMedicalEntryDelete,
      handleMedicalEntryNoteChange,
      handleMedicalEntrySpecialtyChange,
      handleMedicalPrimaryEntryCreate,
      handleMedicalRefreshAsCurrent,
      medicalCapabilities,
    ]
  );

  const clinicalEventActions: HandoffClinicalEventActions = useMemo(
    () =>
      buildHandoffClinicalEventActions({
        canEditClinicalEvents: medicalCapabilities.canEditClinicalEvents,
        onAdd: handleClinicalEventAdd,
        onUpdate: handleClinicalEventUpdate,
        onDelete: handleClinicalEventDelete,
      }),
    [
      handleClinicalEventAdd,
      handleClinicalEventDelete,
      handleClinicalEventUpdate,
      medicalCapabilities.canEditClinicalEvents,
    ]
  );

  return {
    ui,
    record,
    isMedical,
    role,
    title,
    readOnly: effectiveReadOnly,
    nursesList,
    success,
    schedule,
    noteField,
    deliversList,
    receivesList,
    tensList,
    hasAnyPatients,
    visibleBeds,
    selectedShift,
    setSelectedShift: ui.setSelectedShift,
    selectedMedicalSpecialty: medicalBindings.effectiveSelectedMedicalSpecialty,
    setSelectedMedicalSpecialty,
    medicalBindings,
    medicalCapabilities,
    medicalActions,
    clinicalEventActions,
    formatPrintDate,
    shouldShowPatient,
    handleNursingNoteChange,
    handleShareLink,
    handleSendWhatsAppManual,
    updateHandoffChecklist,
    updateHandoffNovedades,
    updateHandoffStaff,
    updateMedicalHandoffDoctor,
    markMedicalHandoffAsSent,
    resetMedicalHandoffState,
    tableHeaderClass: resolveHandoffTableHeaderClass({ isMedical, selectedShift }),
    Icon: isMedical ? Stethoscope : MessageSquare,
  };
};
