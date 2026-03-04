import React, { useEffect, useRef, useState } from 'react';
import { useDailyRecordData } from '@/context/DailyRecordContext';
import { useDailyRecordHandoffActions } from '@/context/useDailyRecordScopedActions';
import { useStaffContext } from '@/context/StaffContext';
import { MessageSquare, Stethoscope, Activity } from 'lucide-react';
import { HandoffHeader } from './HandoffHeader';
import { HandoffChecklistSection } from './HandoffChecklistSection';
import { HandoffNovedades } from './HandoffNovedades';
import { HandoffCudyrPrint } from './HandoffCudyrPrint';
import { HandoffPrintHeader } from './HandoffPrintHeader';
import { MedicalHandoffHeader } from './MedicalHandoffHeader';
import { MedicalHandoffTabs } from './MedicalHandoffTabs';
import { MovementsSummary } from './MovementsSummary';
import { HandoffPatientTable } from './HandoffPatientTable';

import { useNotification } from '@/context/UIContext';
import { useHandoffLogic } from '@/hooks';
import { useAuditContext } from '@/context/AuditContext';
import { getAttributedAuthors } from '@/services/admin/attributionService';
import { useUIState, UseUIStateReturn } from '@/hooks/useUIState';
import { useAuth } from '@/context';
import {
  buildMedicalSpecialtyLink,
  collectMedicalSpecialties,
  filterBedsByMedicalScope,
  filterBedsBySelectedMedicalSpecialty,
  hasVisibleMedicalPatients,
  resolveInitialMedicalSpecialtyFromSearch,
  resolveMedicalHandoffScope,
  resolveScopedMedicalHandoffSentAt,
  resolveScopedMedicalSignature,
  type MedicalHandoffScope,
  resolveHandoffDocumentTitle,
  resolveHandoffNovedadesValue,
  resolveHandoffTableHeaderClass,
  resolveHandoffTitle,
  shouldShowNightCudyrActions,
} from '@/features/handoff/controllers';
import { ACTIONS, canDoAction } from '@/utils/permissions';
import { Specialty } from '@/types';

interface HandoffViewProps {
  type?: 'nursing' | 'medical';
  readOnly?: boolean;
  ui?: UseUIStateReturn;
  medicalScope?: MedicalHandoffScope;
}

export const HandoffView: React.FC<HandoffViewProps> = ({
  type = 'nursing',
  readOnly = false,
  ui: propUi,
  medicalScope = 'all',
}) => {
  const initialMedicalSpecialtyFromUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return 'all' as Specialty | 'all';
    return resolveInitialMedicalSpecialtyFromSearch(window.location.search);
  }, []);
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
  const { logEvent } = useAuditContext();
  const { role } = useAuth();
  const logEventRef = useRef(logEvent);
  const recordRef = useRef(record);
  const [selectedMedicalSpecialty, setSelectedMedicalSpecialty] = useState<Specialty | 'all'>(
    initialMedicalSpecialtyFromUrl
  );

  useEffect(() => {
    logEventRef.current = logEvent;
  }, [logEvent]);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  // Use prop UI state (shared) or local UI state (if direct mount)
  const localUi = useUIState();
  const ui = propUi || localUi;

  const {
    selectedShift,
    setSelectedShift,
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
    handleMedicalEntryAdd,
    handleMedicalEntryDelete,
    handleMedicalEntryNoteChange,
    handleMedicalEntrySpecialtyChange,
    handleMedicalContinuityConfirm,
    handleShareLink,
    handleSendWhatsAppManual,
    formatPrintDate,
    // Clinical Events handlers
    handleClinicalEventAdd,
    handleClinicalEventUpdate,
    handleClinicalEventDelete,
  } = useHandoffLogic({
    type,
    selectedShift: ui.selectedShift,
    setSelectedShift: ui.setSelectedShift,
    onSuccess: success,
  });

  const scopedMedicalScope = resolveMedicalHandoffScope(medicalScope);
  const filteredMedicalBeds = React.useMemo(() => {
    return filterBedsByMedicalScope(visibleBeds, record, isMedical, scopedMedicalScope);
  }, [isMedical, scopedMedicalScope, visibleBeds, record]);
  const effectiveVisibleBeds = isMedical ? filteredMedicalBeds : visibleBeds;
  const medicalSpecialties = React.useMemo(() => {
    return collectMedicalSpecialties(effectiveVisibleBeds, record, isMedical);
  }, [effectiveVisibleBeds, isMedical, record]);
  useEffect(() => {
    if (
      selectedMedicalSpecialty !== 'all' &&
      !medicalSpecialties.includes(selectedMedicalSpecialty)
    ) {
      setSelectedMedicalSpecialty('all');
    }
  }, [medicalSpecialties, selectedMedicalSpecialty]);
  const specialtyFilteredBeds = React.useMemo(() => {
    return filterBedsBySelectedMedicalSpecialty(
      effectiveVisibleBeds,
      record,
      isMedical,
      selectedMedicalSpecialty
    );
  }, [effectiveVisibleBeds, isMedical, record, selectedMedicalSpecialty]);
  const scopedMedicalSignature = isMedical
    ? resolveScopedMedicalSignature(record, scopedMedicalScope)
    : null;
  const scopedMedicalHandoffSentAt = isMedical
    ? resolveScopedMedicalHandoffSentAt(record, scopedMedicalScope)
    : null;
  const hasAnyVisiblePatients = hasVisibleMedicalPatients(
    specialtyFilteredBeds,
    record,
    shouldShowPatient
  );

  // MINSAL Traceability: Log when clinical data is viewed
  const { userId } = useAuditContext();
  const recordDate = record?.date;
  useEffect(() => {
    if (recordDate) {
      const currentRecord = recordRef.current;
      if (!currentRecord) return;

      // Attribution logic for shared accounts (MINSAL requirement)
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
    }
  }, [recordDate, type, selectedShift, isMedical, userId]); // Only log when essential state changes

  // Update document title for PDF export filename
  useEffect(() => {
    const nextTitle = resolveHandoffDocumentTitle({
      isMedical,
      selectedShift,
      recordDate: record?.date,
    });
    if (!nextTitle) return;
    document.title = nextTitle;

    // Cleanup: Reset title when unmounting
    return () => {
      document.title = 'Hospital Hanga Roa';
    };
  }, [record?.date, selectedShift, isMedical]);

  const title = resolveHandoffTitle({ isMedical, selectedShift });
  const canSendMedicalHandoff = canDoAction(role, ACTIONS.HANDOFF_SEND_WHATSAPP);

  const handleOpenCudyr = () => {
    if (ui) ui.setCurrentModule('CUDYR');
  };
  const Icon = isMedical ? Stethoscope : MessageSquare;
  // Removed unused headerColor
  const tableHeaderClass = resolveHandoffTableHeaderClass({ isMedical, selectedShift });

  if (!record) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        Seleccione una fecha para ver la Entrega de Turno.
      </div>
    );
  }

  return (
    <div className="space-y-3 print:space-y-2 animate-fade-in pb-20 font-sans max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 print:max-w-none print:w-full print:px-0 print:pb-0">
      {/* Print-only Header */}
      <HandoffPrintHeader
        title={title}
        dateString={formatPrintDate()}
        Icon={Icon}
        isMedical={isMedical}
        schedule={schedule}
        selectedShift={selectedShift}
        deliversList={deliversList}
        receivesList={receivesList}
        tensList={tensList}
      />

      {/* Main Header (Visible) with integrated Shift Switcher & Actions */}
      <HandoffHeader
        isMedical={isMedical}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
        readOnly={readOnly}
        showMedicalShareActions={canSendMedicalHandoff}
        medicalSignature={scopedMedicalSignature}
        medicalHandoffSentAt={scopedMedicalHandoffSentAt}
        onSendWhatsApp={handleSendWhatsAppManual}
        onShareLink={handleShareLink}
        extraAction={
          shouldShowNightCudyrActions({ isMedical, selectedShift }) ? (
            <button
              onClick={handleOpenCudyr}
              className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
            >
              <Activity size={14} />
              CUDYR
            </button>
          ) : undefined
        }
      />

      {/* Medical Handoff Header (Doctor to Doctor) */}
      {isMedical && (
        <MedicalHandoffHeader
          record={{
            ...record,
            medicalSignature: scopedMedicalSignature || undefined,
            medicalHandoffSentAt: scopedMedicalHandoffSentAt || undefined,
          }}
          visibleBeds={effectiveVisibleBeds}
          readOnly={readOnly}
          canRestoreSignatures={role === 'admin'}
          updateMedicalHandoffDoctor={updateMedicalHandoffDoctor}
          markMedicalHandoffAsSent={markMedicalHandoffAsSent}
          resetMedicalHandoffState={resetMedicalHandoffState}
        />
      )}

      {/* Compact Staff & Checklist Section (Monitor view) */}
      <HandoffChecklistSection
        isMedical={isMedical}
        selectedShift={selectedShift}
        record={record}
        deliversList={deliversList}
        receivesList={receivesList}
        nursesList={nursesList}
        readOnly={readOnly}
        onUpdateStaff={updateHandoffStaff}
        onUpdateChecklist={updateHandoffChecklist}
      />

      {/* Patient Table - Tabbed UPC/Non-UPC for Medical Handoff */}
      {isMedical ? (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-sky-100 p-3 print:hidden">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Especialidad
              </div>
              <button
                type="button"
                onClick={async () => {
                  const url = buildMedicalSpecialtyLink(
                    window.location.origin,
                    window.location.pathname,
                    record.date,
                    selectedMedicalSpecialty
                  );
                  if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    success('Link copiado', 'Comparte este enlace con el especialista autorizado.');
                  }
                }}
                className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-200 transition-colors"
              >
                Copiar link especialista
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedMedicalSpecialty('all')}
                className={
                  selectedMedicalSpecialty === 'all'
                    ? 'px-3 py-2 rounded-lg bg-sky-100 text-sky-800 text-sm font-semibold'
                    : 'px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium'
                }
              >
                Todos
              </button>
              {medicalSpecialties.map(specialty => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => setSelectedMedicalSpecialty(specialty)}
                  className={
                    selectedMedicalSpecialty === specialty
                      ? 'px-3 py-2 rounded-lg bg-sky-100 text-sky-800 text-sm font-semibold'
                      : 'px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium'
                  }
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          <MedicalHandoffTabs
            visibleBeds={specialtyFilteredBeds}
            record={record}
            noteField={noteField}
            onNoteChange={handleNursingNoteChange}
            onMedicalEntryNoteChange={handleMedicalEntryNoteChange}
            onMedicalEntrySpecialtyChange={handleMedicalEntrySpecialtyChange}
            onMedicalEntryAdd={handleMedicalEntryAdd}
            onMedicalEntryDelete={handleMedicalEntryDelete}
            onMedicalContinuityConfirm={handleMedicalContinuityConfirm}
            tableHeaderClass={tableHeaderClass}
            readOnly={readOnly}
            isMedical={isMedical}
            shouldShowPatient={shouldShowPatient}
            fixedScope={scopedMedicalScope === 'all' ? null : scopedMedicalScope}
            hasAnyPatients={hasAnyVisiblePatients}
          />
        </div>
      ) : (
        <HandoffPatientTable
          visibleBeds={visibleBeds}
          record={record}
          noteField={noteField}
          onNoteChange={handleNursingNoteChange}
          onMedicalEntryNoteChange={handleMedicalEntryNoteChange}
          onMedicalEntrySpecialtyChange={handleMedicalEntrySpecialtyChange}
          onMedicalEntryAdd={handleMedicalEntryAdd}
          onMedicalEntryDelete={handleMedicalEntryDelete}
          onMedicalContinuityConfirm={handleMedicalContinuityConfirm}
          tableHeaderClass={tableHeaderClass}
          readOnly={readOnly}
          isMedical={isMedical}
          hasAnyPatients={hasAnyPatients}
          shouldShowPatient={shouldShowPatient}
          // Clinical Events
          onClinicalEventAdd={handleClinicalEventAdd}
          onClinicalEventUpdate={handleClinicalEventUpdate}
          onClinicalEventDelete={handleClinicalEventDelete}
        />
      )}

      <div className="hidden print:block print:h-4" aria-hidden="true" />
      {/* Print-only spacer */}

      {/* Additional Sections for Nursing Handoff (Altas, Traslados, CMA) */}
      {!isMedical && <MovementsSummary record={record} selectedShift={selectedShift} />}

      {!isMedical && (
        <HandoffNovedades
          value={resolveHandoffNovedadesValue({ isMedical, selectedShift, record })}
          onChange={val => updateHandoffNovedades(isMedical ? 'medical' : selectedShift, val)}
          readOnly={readOnly}
        />
      )}

      {/* CUDYR - Night Nursing Print Only */}
      {shouldShowNightCudyrActions({ isMedical, selectedShift }) && (
        <div className="print:break-before-page">
          <HandoffCudyrPrint />
        </div>
      )}
    </div>
  );
};
