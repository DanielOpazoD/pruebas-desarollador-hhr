import React from 'react';
import type { BedDefinition } from '@/types/domain/beds';
import type { Specialty } from '@/types/domain/patientClassification';
import type { DailyRecord } from '@/domain/handoff/recordContracts';
import type { MedicalHandoffScope } from '@/types/medicalHandoff';
import type { HandoffClinicalEventActions, HandoffMedicalActions } from './handoffRowContracts';
import {
  defaultBrowserWindowRuntime,
  writeClipboardText,
} from '@/shared/runtime/browserWindowRuntime';
import {
  buildMedicalSpecialtyFilterChips,
  resolveMedicalSpecialistLink,
} from '@/features/handoff/controllers/handoffMedicalContentController';
import { MedicalHandoffHeader } from './MedicalHandoffHeader';
import { MedicalShareActions } from './MedicalShareActions';
import { MedicalHandoffTabs } from './MedicalHandoffTabs';
import type { MedicalHandoffScope as ScopeType } from '@/types/medicalHandoff';

interface HandoffMedicalContentProps {
  record: DailyRecord;
  effectiveVisibleBeds: BedDefinition[];
  specialtyFilteredBeds: BedDefinition[];
  readOnly: boolean;
  role?: string;
  canCopySpecialistLink: boolean;
  scopedMedicalSignature: { doctorName: string; signedAt: string } | null;
  scopedMedicalHandoffSentAt: string | null;
  showDeliverySection: boolean;
  canEditDoctorName: boolean;
  canSignMedicalHandoff: boolean;
  updateMedicalHandoffDoctor?: (doctorName: string) => Promise<void>;
  markMedicalHandoffAsSent?: (doctorName?: string, scope?: ScopeType) => Promise<void>;
  resetMedicalHandoffState?: () => Promise<void>;
  selectedMedicalSpecialty: Specialty | 'all';
  setSelectedMedicalSpecialty: (specialty: Specialty | 'all') => void;
  medicalSpecialties: Specialty[];
  success: (message: string, description?: string) => void;
  noteField: 'handoffNoteDayShift' | 'handoffNoteNightShift' | 'medicalHandoffNote';
  onNoteChange: (bedId: string, value: string, isNested: boolean) => void;
  medicalActions: HandoffMedicalActions;
  clinicalEventActions: HandoffClinicalEventActions;
  tableHeaderClass: string;
  shouldShowPatient: (bedId: string) => boolean;
  scopedMedicalScope: MedicalHandoffScope;
  hasAnyVisiblePatients: boolean;
  onSendWhatsApp?: () => void;
  onShareLink?: (scope: MedicalHandoffScope) => void;
}

export const HandoffMedicalContent: React.FC<HandoffMedicalContentProps> = ({
  record,
  effectiveVisibleBeds,
  specialtyFilteredBeds,
  readOnly,
  role: _role,
  canCopySpecialistLink,
  scopedMedicalSignature,
  scopedMedicalHandoffSentAt,
  showDeliverySection,
  canEditDoctorName,
  canSignMedicalHandoff,
  updateMedicalHandoffDoctor,
  markMedicalHandoffAsSent,
  resetMedicalHandoffState,
  selectedMedicalSpecialty,
  setSelectedMedicalSpecialty,
  medicalSpecialties,
  success,
  noteField,
  onNoteChange,
  medicalActions,
  clinicalEventActions,
  tableHeaderClass,
  shouldShowPatient,
  scopedMedicalScope,
  hasAnyVisiblePatients,
  onSendWhatsApp,
  onShareLink,
}) => {
  const filterChips = buildMedicalSpecialtyFilterChips(
    selectedMedicalSpecialty,
    medicalSpecialties
  );

  return (
    <div className="space-y-3">
      <MedicalHandoffHeader
        record={{
          ...record,
          medicalSignature: scopedMedicalSignature || undefined,
          medicalHandoffSentAt: scopedMedicalHandoffSentAt || undefined,
        }}
        visibleBeds={effectiveVisibleBeds}
        readOnly={readOnly}
        canRestoreSignatures={Boolean(resetMedicalHandoffState)}
        showDeliverySection={showDeliverySection}
        canEditDoctorName={canEditDoctorName}
        canSignMedicalHandoff={canSignMedicalHandoff}
        updateMedicalHandoffDoctor={updateMedicalHandoffDoctor}
        markMedicalHandoffAsSent={markMedicalHandoffAsSent}
        resetMedicalHandoffState={resetMedicalHandoffState}
        shareActions={
          onSendWhatsApp && onShareLink ? (
            <MedicalShareActions
              medicalSignature={scopedMedicalSignature}
              onSendWhatsApp={onSendWhatsApp}
              onShareLink={onShareLink}
            />
          ) : undefined
        }
      />

      <div className="bg-white rounded-xl border border-sky-100/80 p-3 print:hidden ring-1 ring-black/[0.02]">
        <div className="mb-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            Especialidad
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterChips.map(chip => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setSelectedMedicalSpecialty(chip.key)}
              className={
                chip.isActive
                  ? 'px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 text-[13px] font-semibold ring-1 ring-sky-200/50 shadow-sm'
                  : 'px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-[13px] font-medium hover:bg-slate-100 transition-colors'
              }
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <MedicalHandoffTabs
        visibleBeds={specialtyFilteredBeds}
        record={record}
        noteField={noteField}
        onNoteChange={onNoteChange}
        medicalActions={medicalActions}
        clinicalEventActions={clinicalEventActions}
        tableHeaderClass={tableHeaderClass}
        readOnly={readOnly}
        isMedical={true}
        shouldShowPatient={shouldShowPatient}
        fixedScope={scopedMedicalScope === 'all' ? null : scopedMedicalScope}
        hasAnyPatients={hasAnyVisiblePatients}
      />
    </div>
  );
};
