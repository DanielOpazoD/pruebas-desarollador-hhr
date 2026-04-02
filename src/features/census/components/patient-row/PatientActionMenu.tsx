import React from 'react';
import { FileText, MoreHorizontal, User } from 'lucide-react';
import { MedicalButton } from '@/components/ui/base/MedicalButton';
import type { CensusAccessProfile } from '@/features/census/types/censusAccessProfile';
import { PatientRowOrbitalQuickActions } from '@/features/census/components/patient-row/PatientRowOrbitalQuickActions';
import { BaseModal } from '@/components/shared/BaseModal';
import { printMedicalIndicationsPdf } from '@/services/pdf/medicalIndicationsPdfService';
import type {
  PatientActionMenuCallbacks,
  PatientActionMenuIndicators,
} from './patientRowActionContracts';
import type { RowMenuAlign } from './patientRowUiContracts';
import { usePatientActionMenu } from './usePatientActionMenu';
import { PatientActionMenuPanel } from '@/features/census/components/patient-row/PatientActionMenuPanel';

interface PatientActionMenuProps extends PatientActionMenuCallbacks, PatientActionMenuIndicators {
  isBlocked: boolean;
  readOnly?: boolean;
  align?: RowMenuAlign;
  showCmaAction?: boolean;
  accessProfile?: CensusAccessProfile;
  medicalIndicationsPatient?: import('@/components/layout/date-strip/MedicalIndicationsQuickAction').MedicalIndicationsPatientOption;
}

const INDICATIONS_LINES = 15;

const formatBirthDate = (rawDate: string) => {
  if (!rawDate) return '';

  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}-${month}-${year}`;
  }

  const slashMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day}-${month}-${year}`;
  }

  return rawDate;
};

const PatientActionPrimaryIcon: React.FC<{
  indicators: Required<PatientActionMenuIndicators>;
}> = ({ indicators }) => (
  <span className="relative inline-flex items-center justify-center h-5 w-5">
    {indicators.hasClinicalDocument && (
      <FileText
        size={11}
        className="absolute -left-1 bottom-0 text-slate-400"
        strokeWidth={2.1}
        aria-hidden="true"
      />
    )}
    <User size={16} className="relative z-10" />
    {indicators.isNewAdmission && (
      <span
        className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-amber-400 border border-white shadow-sm"
        aria-hidden="true"
      />
    )}
  </span>
);

export const PatientActionMenu: React.FC<PatientActionMenuProps> = ({
  isBlocked,
  hasClinicalDocument = false,
  isNewAdmission = false,
  onAction,
  onViewDemographics,
  onViewClinicalDocuments,
  onViewExamRequest,
  onViewImagingRequest,
  onViewMedicalIndications,
  onViewHistory,
  readOnly = false,
  align = 'top',
  showCmaAction = true,
  accessProfile = 'default',
  medicalIndicationsPatient,
}) => {
  const [isMedicalIndicationsOpen, setIsMedicalIndicationsOpen] = React.useState(false);
  const [isPrintingMedicalIndications, setIsPrintingMedicalIndications] = React.useState(false);
  const [reposo, setReposo] = React.useState('');
  const [regimen, setRegimen] = React.useState('');
  const [kineType, setKineType] = React.useState<'motora' | 'respiratoria' | 'ambas' | 'ninguna'>(
    'ninguna'
  );
  const [kineTimes, setKineTimes] = React.useState('');
  const [treatingDoctor, setTreatingDoctor] = React.useState('');
  const [pendingNotes, setPendingNotes] = React.useState('');
  const [indicationDraft, setIndicationDraft] = React.useState('');
  const [indications, setIndications] = React.useState<string[]>(() =>
    Array.from({ length: INDICATIONS_LINES }, () => '')
  );
  const isSpecialistAccess = accessProfile === 'specialist';
  const {
    isOpen,
    menuRef,
    binding,
    utilityActions,
    toggle,
    close,
    handleAction,
    handleViewHistory,
    handleViewClinicalDocuments,
    handleViewExamRequest,
    handleViewImagingRequest,
    handleViewMedicalIndications,
  } = usePatientActionMenu({
    isBlocked,
    readOnly,
    accessProfile,
    align,
    showCmaAction,
    indicators: {
      hasClinicalDocument,
      isNewAdmission,
    },
    onAction,
    onViewHistory,
    onViewClinicalDocuments,
    onViewExamRequest,
    onViewImagingRequest,
    onViewMedicalIndications,
  });

  React.useEffect(() => {
    if (!isMedicalIndicationsOpen || !medicalIndicationsPatient) return;
    setTreatingDoctor(medicalIndicationsPatient.treatingDoctor || '');
  }, [isMedicalIndicationsOpen, medicalIndicationsPatient]);

  const buildToday = () => {
    const date = new Date();
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const handlePrintMedicalIndications = async () => {
    if (!medicalIndicationsPatient || isPrintingMedicalIndications) return;

    setIsPrintingMedicalIndications(true);
    try {
      await printMedicalIndicationsPdf({
        paciente_nombre: medicalIndicationsPatient.patientName,
        paciente_rut: medicalIndicationsPatient.rut,
        paciente_diagnostico: medicalIndicationsPatient.diagnosis,
        paciente_edad: medicalIndicationsPatient.age,
        fecha_nacimiento: formatBirthDate(medicalIndicationsPatient.birthDate),
        paciente_alergias: medicalIndicationsPatient.allergies,
        medicotratante: treatingDoctor,
        fecha_ingreso: medicalIndicationsPatient.admissionDate,
        fecha_actual: buildToday(),
        diasEstada: medicalIndicationsPatient.daysOfStay,
        Reposoindicacion: reposo,
        Regimenindicacion: regimen,
        Kinemotora: kineType === 'motora' || kineType === 'ambas' ? 'X' : '',
        Kinerespiratoria: kineType === 'respiratoria' || kineType === 'ambas' ? 'X' : '',
        Kinecantidadvecesdia: kineTimes,
        Pendientes: pendingNotes,
        indicaciones: indications,
      });
    } finally {
      setIsPrintingMedicalIndications(false);
    }
  };

  const activeIndications = React.useMemo(
    () => indications.map(text => text.trim()).filter(Boolean),
    [indications]
  );

  const addIndication = () => {
    const trimmed = indicationDraft.trim();
    if (!trimmed) return;

    setIndications(current => {
      const next = [...current];
      const firstEmptyIndex = next.findIndex(item => !item.trim());
      if (firstEmptyIndex === -1) return next;
      next[firstEmptyIndex] = trimmed;
      return next;
    });
    setIndicationDraft('');
  };

  const removeIndication = (targetIndex: number) => {
    setIndications(current => {
      const next = current.map(text => text.trim()).filter(Boolean);
      next.splice(targetIndex, 1);
      return [...next, ...Array.from({ length: INDICATIONS_LINES - next.length }, () => '')];
    });
  };

  return (
    <div className="flex flex-col items-center gap-0.5 relative py-0.5" ref={menuRef}>
      <PatientRowOrbitalQuickActions
        showClinicalDocumentsAction={binding.availability.showClinicalDocumentsAction}
        showExamRequestAction={binding.availability.showExamRequestAction}
        showImagingRequestAction={binding.availability.showImagingRequestAction}
        showMedicalIndicationsAction={binding.availability.showMedicalIndicationsAction}
        onViewClinicalDocuments={handleViewClinicalDocuments}
        onViewExamRequest={handleViewExamRequest}
        onViewImagingRequest={handleViewImagingRequest}
        onViewMedicalIndications={() => {
          handleViewMedicalIndications();
          setIsMedicalIndicationsOpen(true);
        }}
      />

      {binding.availability.showDemographicsAction && (
        <div className="flex items-center gap-0.5">
          <MedicalButton
            onClick={isSpecialistAccess ? undefined : onViewDemographics}
            variant="ghost"
            size="xs"
            className="!px-1.5 !py-0.5 rounded-md text-medical-500 hover:text-medical-700"
            title="Datos del Paciente"
            icon={<PatientActionPrimaryIcon indicators={binding.indicators} />}
          />
        </div>
      )}
      {binding.availability.showMenuTrigger && (
        <MedicalButton
          onClick={toggle}
          variant="secondary"
          size="xs"
          className="!px-1 !py-0.5 rounded-md text-slate-500"
          title="Acciones"
          icon={<MoreHorizontal size={12} />}
        />
      )}

      <PatientActionMenuPanel
        isOpen={isOpen}
        binding={binding}
        utilityActions={utilityActions}
        onClose={close}
        onAction={handleAction}
        onViewHistory={handleViewHistory}
      />

      <BaseModal
        isOpen={isMedicalIndicationsOpen}
        onClose={() => setIsMedicalIndicationsOpen(false)}
        title="Indicaciones médicas"
        size="3xl"
        variant="white"
      >
        {!medicalIndicationsPatient ? null : (
          <>
            <div className="grid grid-cols-2 gap-4 p-1">
              <div className="col-span-2 text-xs font-semibold text-slate-600">
                Paciente hospitalizado
                <div className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm font-normal text-slate-700">
                  {medicalIndicationsPatient.label}
                </div>
              </div>
              <label className="text-xs font-semibold text-slate-600">
                Fecha de nacimiento
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-600"
                  value={formatBirthDate(medicalIndicationsPatient.birthDate)}
                  readOnly
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Médico tratante
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={treatingDoctor}
                  onChange={event => setTreatingDoctor(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Reposo
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={reposo}
                  onChange={event => setReposo(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Régimen
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={regimen}
                  onChange={event => setRegimen(event.target.value)}
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Kinesiología
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={kineType}
                  onChange={event =>
                    setKineType(
                      event.target.value as 'motora' | 'respiratoria' | 'ambas' | 'ninguna'
                    )
                  }
                >
                  <option value="ninguna">Sin indicación</option>
                  <option value="motora">Motora</option>
                  <option value="respiratoria">Respiratoria</option>
                  <option value="ambas">Motora y respiratoria</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Veces por día
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={kineTimes}
                  onChange={event => setKineTimes(event.target.value)}
                />
              </label>
              <label className="col-span-2 text-xs font-semibold text-slate-600">
                Pendientes
                <input
                  className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  value={pendingNotes}
                  onChange={event => setPendingNotes(event.target.value)}
                />
              </label>
              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-xs font-semibold text-slate-700">Indicaciones clínicas</p>
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
                    value={indicationDraft}
                    onChange={event => setIndicationDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addIndication();
                      }
                    }}
                    placeholder="Escribe una indicación y presiona Enter"
                  />
                  <button
                    type="button"
                    onClick={addIndication}
                    disabled={
                      !indicationDraft.trim() || activeIndications.length >= INDICATIONS_LINES
                    }
                    className="px-3 py-2 rounded-md bg-medical-600 text-white text-sm disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
                <div className="mt-3 grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {activeIndications.length === 0 ? (
                    <p className="text-xs text-slate-500">Aún no hay indicaciones agregadas.</p>
                  ) : (
                    activeIndications.map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-medical-700">{`Indicacion${index + 1}: `}</span>
                          {item}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeIndication(index)}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setIsMedicalIndicationsOpen(false)}
                className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm"
              >
                Cerrar
              </button>
              <button
                onClick={() => void handlePrintMedicalIndications()}
                disabled={isPrintingMedicalIndications}
                className="px-3 py-1.5 rounded-md bg-medical-600 text-white text-sm disabled:opacity-60"
              >
                {isPrintingMedicalIndications ? 'Generando PDF...' : 'PDF'}
              </button>
            </div>
          </>
        )}
      </BaseModal>
    </div>
  );
};
