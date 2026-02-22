import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import clsx from 'clsx';
import { PatientData, PatientIdentityStatus } from '@/types';
import { ADMISSION_ORIGIN_OPTIONS } from '@/constants';
import { BaseModal } from '@/components/shared/BaseModal';
import { PatientInputSchema } from '@/schemas/inputSchemas';
import { logPatientView } from '@/services/admin/auditService';

// Type aliases from PatientData for type-safe casting
type BiologicalSex = 'Masculino' | 'Femenino' | 'Indeterminado';
type Insurance = 'Fonasa' | 'Isapre' | 'Particular';
type AdmissionOrigin = 'CAE' | 'APS' | 'Urgencias' | 'Pabellón' | 'Otro';
type Origin = 'Residente' | 'Turista Nacional' | 'Turista Extranjero';
type DocumentType = 'RUT' | 'Pasaporte';

export type DemographicSubset = Pick<
  PatientData,
  | 'patientName'
  | 'firstName'
  | 'lastName'
  | 'secondLastName'
  | 'identityStatus'
  | 'rut'
  | 'documentType'
  | 'age'
  | 'birthDate'
  | 'insurance'
  | 'admissionOrigin'
  | 'admissionOriginDetails'
  | 'origin'
  | 'isRapanui'
  | 'biologicalSex'
>;

interface DemographicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DemographicSubset;
  onSave: (updatedFields: Partial<PatientData>) => void;
  bedId: string;
  recordDate: string;
  isClinicalCribPatient?: boolean;
}

interface LocalDemographicsState {
  firstName: string;
  lastName: string;
  secondLastName: string;
  provisionalName: string;
  identityStatus: PatientIdentityStatus;
  rut: string;
  documentType: DocumentType;
  birthDate: string;
  insurance: Insurance;
  admissionOrigin: AdmissionOrigin | '';
  admissionOriginDetails: string;
  origin: Origin;
  isRapanui: boolean;
  biologicalSex: BiologicalSex;
}

const normalizeNamePart = (value: string): string => value.trim().replace(/\s+/g, ' ');

const composeFullName = (firstName: string, lastName: string, secondLastName: string): string =>
  [firstName, lastName, secondLastName].map(normalizeNamePart).filter(Boolean).join(' ');

const splitFromLegacyName = (
  patientName: string
): { firstName: string; lastName: string; secondLastName: string } => {
  const normalized = normalizeNamePart(patientName);
  if (!normalized) {
    return { firstName: '', lastName: '', secondLastName: '' };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '', secondLastName: '' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], secondLastName: '' };
  }
  return {
    firstName: parts.slice(0, -2).join(' '),
    lastName: parts[parts.length - 2],
    secondLastName: parts[parts.length - 1],
  };
};

const inferIdentityStatus = (
  data: DemographicSubset,
  isClinicalCribPatient: boolean
): PatientIdentityStatus => {
  if (data.identityStatus) {
    return data.identityStatus;
  }

  if (!isClinicalCribPatient) {
    return 'official';
  }

  const hasSplitName = Boolean(
    data.firstName?.trim() || data.lastName?.trim() || data.secondLastName?.trim()
  );
  const normalizedRut = (data.rut || '').trim();
  const hasOfficialRut = normalizedRut.length > 0 && normalizedRut !== '-';

  return hasSplitName || hasOfficialRut ? 'official' : 'provisional';
};

const buildLocalData = (
  data: DemographicSubset,
  isClinicalCribPatient: boolean
): LocalDemographicsState => {
  const initialNameParts =
    data.firstName || data.lastName || data.secondLastName
      ? {
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          secondLastName: data.secondLastName || '',
        }
      : splitFromLegacyName(data.patientName || '');

  return {
    firstName: initialNameParts.firstName,
    lastName: initialNameParts.lastName,
    secondLastName: initialNameParts.secondLastName,
    provisionalName: normalizeNamePart(data.patientName || ''),
    identityStatus: inferIdentityStatus(data, isClinicalCribPatient),
    rut: data.rut || '',
    documentType: (data.documentType || 'RUT') as DocumentType,
    birthDate: data.birthDate || '',
    insurance: (data.insurance || 'Fonasa') as Insurance,
    admissionOrigin: (data.admissionOrigin || '') as AdmissionOrigin | '',
    admissionOriginDetails: data.admissionOriginDetails || '',
    origin: (data.origin || 'Residente') as Origin,
    isRapanui: data.isRapanui || false,
    biologicalSex: (data.biologicalSex || 'Indeterminado') as BiologicalSex,
  };
};

export const DemographicsModal: React.FC<DemographicsModalProps> = ({
  isOpen,
  onClose,
  data,
  onSave,
  bedId,
  recordDate,
  isClinicalCribPatient = false,
}) => {
  const [localData, setLocalData] = useState<LocalDemographicsState>(() =>
    buildLocalData(data, isClinicalCribPatient)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && data.patientName) {
      logPatientView(bedId, data.patientName, data.rut, recordDate);
    }
  }, [isOpen, data.patientName, data.rut, bedId, recordDate]);

  const calculateFormattedAge = (dob: string) => {
    if (!dob) return '';
    const birth = new Date(dob);
    const today = new Date();

    const diffTime = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '';

    if (diffDays < 30) {
      return `${diffDays}d`;
    }

    let months =
      (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) {
      months--;
    }

    if (months <= 24) {
      return `${months}m`;
    }

    const years = Math.floor(months / 12);
    return `${years}a`;
  };

  const isProvisionalRnMode = isClinicalCribPatient && localData.identityStatus === 'provisional';

  const displayName = useMemo(() => {
    if (isProvisionalRnMode) {
      return normalizeNamePart(localData.provisionalName) || 'RN provisional';
    }
    return (
      composeFullName(localData.firstName, localData.lastName, localData.secondLastName) ||
      normalizeNamePart(data.patientName || '') ||
      'Paciente Nuevo'
    );
  }, [
    data.patientName,
    isProvisionalRnMode,
    localData.firstName,
    localData.lastName,
    localData.provisionalName,
    localData.secondLastName,
  ]);

  const displayRut = isProvisionalRnMode
    ? 'Sin RUT (RN provisional)'
    : localData.rut || 'RUT No especificado';

  const handleSave = () => {
    if (localData.birthDate) {
      const birthDateValidation = PatientInputSchema.pick({ birthDate: true }).safeParse({
        birthDate: localData.birthDate,
      });
      if (!birthDateValidation.success) {
        setError(birthDateValidation.error.issues[0].message);
        return;
      }
    }

    const age = localData.birthDate ? calculateFormattedAge(localData.birthDate) : data.age;

    if (isProvisionalRnMode) {
      const provisionalName = normalizeNamePart(localData.provisionalName);
      const nameValidation = PatientInputSchema.pick({ patientName: true }).safeParse({
        patientName: provisionalName,
      });
      if (!nameValidation.success) {
        setError(nameValidation.error.issues[0].message);
        return;
      }

      onSave({
        identityStatus: 'provisional',
        patientName: provisionalName,
        firstName: '',
        lastName: '',
        secondLastName: '',
        rut: '',
        documentType: 'RUT',
        birthDate: localData.birthDate,
        insurance: localData.insurance as Insurance,
        admissionOrigin: localData.admissionOrigin as AdmissionOrigin,
        admissionOriginDetails: localData.admissionOriginDetails,
        origin: localData.origin as Origin,
        isRapanui: localData.isRapanui,
        biologicalSex: localData.biologicalSex as BiologicalSex,
        age,
      });
      onClose();
      return;
    }

    const fullName = composeFullName(
      localData.firstName,
      localData.lastName,
      localData.secondLastName
    );
    if (fullName) {
      const nameValidation = PatientInputSchema.pick({ patientName: true }).safeParse({
        patientName: fullName,
      });
      if (!nameValidation.success) {
        setError(nameValidation.error.issues[0].message);
        return;
      }
    }

    onSave({
      identityStatus: 'official',
      firstName: normalizeNamePart(localData.firstName),
      lastName: normalizeNamePart(localData.lastName),
      secondLastName: normalizeNamePart(localData.secondLastName),
      patientName: fullName,
      rut: localData.rut.trim(),
      documentType: localData.documentType,
      birthDate: localData.birthDate,
      insurance: localData.insurance as Insurance,
      admissionOrigin: localData.admissionOrigin as AdmissionOrigin,
      admissionOriginDetails: localData.admissionOriginDetails,
      origin: localData.origin as Origin,
      isRapanui: localData.isRapanui,
      biologicalSex: localData.biologicalSex as BiologicalSex,
      age,
    });
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Datos Demográficos"
      icon={<User size={18} />}
      size="2xl"
      headerIconColor="text-blue-600"
      variant="white"
      bodyClassName="p-4 space-y-3 max-h-[86vh] overflow-y-auto"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100/80">
          <div>
            <p className="text-base font-display font-black text-slate-900 leading-tight tracking-tight">
              {displayName}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {displayRut}
            </p>
          </div>
          {data.age && (
            <div className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-blue-100">
              {data.age}
            </div>
          )}
        </div>

        {isClinicalCribPatient && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={clsx(
                'px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors',
                localData.identityStatus === 'provisional'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
              onClick={() =>
                setLocalData(prev => ({
                  ...prev,
                  identityStatus: 'provisional',
                  documentType: 'RUT',
                  rut: '',
                }))
              }
            >
              RN provisional
            </button>
            <button
              type="button"
              className={clsx(
                'px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors',
                localData.identityStatus === 'official'
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
              onClick={() =>
                setLocalData(prev => ({
                  ...prev,
                  identityStatus: 'official',
                }))
              }
            >
              Identidad oficial
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
              <User size={14} className="text-blue-500" />
              Información Personal
            </h4>

            <div className="space-y-3">
              {isProvisionalRnMode ? (
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                    Nombre provisional RN
                  </label>
                  <input
                    type="text"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] transition-all shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="RN de Nombre Apellido Madre"
                    value={localData.provisionalName}
                    onChange={e => {
                      setLocalData({ ...localData, provisionalName: e.target.value });
                      setError(null);
                    }}
                  />
                  <p className="text-[9px] text-amber-700 font-semibold ml-1">
                    Usa este modo cuando el RN aun no tiene nombre oficial ni RUT.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                      Nombre
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] transition-all shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Nombre"
                        value={localData.firstName}
                        onChange={e => {
                          setLocalData({ ...localData, firstName: e.target.value });
                          setError(null);
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                      Apellidos
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] transition-all shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Apellido paterno"
                        value={localData.lastName}
                        onChange={e => {
                          setLocalData({ ...localData, lastName: e.target.value });
                          setError(null);
                        }}
                      />
                      <input
                        type="text"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] transition-all shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Apellido materno"
                        value={localData.secondLastName}
                        onChange={e => {
                          setLocalData({ ...localData, secondLastName: e.target.value });
                          setError(null);
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Documento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:opacity-70"
                    value={localData.documentType}
                    disabled={isProvisionalRnMode}
                    onChange={e => {
                      setLocalData({ ...localData, documentType: e.target.value as DocumentType });
                      setError(null);
                    }}
                  >
                    <option value="RUT">RUT</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                  <input
                    type="text"
                    className="w-full sm:col-span-2 px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] transition-all shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-70"
                    placeholder={
                      isProvisionalRnMode
                        ? 'Pendiente'
                        : localData.documentType === 'Pasaporte'
                          ? 'N° Pasaporte'
                          : '12.345.678-9'
                    }
                    value={isProvisionalRnMode ? '' : localData.rut}
                    disabled={isProvisionalRnMode}
                    onChange={e => {
                      setLocalData({ ...localData, rut: e.target.value });
                      setError(null);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  className={clsx(
                    'w-full px-2.5 py-1.5 bg-slate-50 border rounded-lg text-[13px] transition-all shadow-sm',
                    'focus:bg-white focus:ring-2 focus:ring-blue-500/20 ease-out duration-200',
                    error
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-transparent focus:border-blue-500'
                  )}
                  value={localData.birthDate}
                  onChange={e => {
                    setLocalData({ ...localData, birthDate: e.target.value });
                    setError(null);
                  }}
                />
                {error && <p className="text-[9px] text-red-500 font-bold ml-1">{error}</p>}
                {!error && localData.birthDate && calculateFormattedAge(localData.birthDate) && (
                  <p className="text-[9px] text-emerald-600 font-bold ml-1">
                    Edad calculada: {calculateFormattedAge(localData.birthDate)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Previsión
                </label>
                <div className="relative">
                  <select
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer shadow-sm transition-all"
                    value={localData.insurance}
                    onChange={e =>
                      setLocalData({ ...localData, insurance: e.target.value as Insurance })
                    }
                  >
                    <option value="Fonasa">Fonasa</option>
                    <option value="Isapre">Isapre</option>
                    <option value="Particular">Particular</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-[11px] font-bold text-slate-800 uppercase tracking-wider pb-1.5 border-b border-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Origen y Estadía
            </h4>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Origen del Ingreso
                </label>
                <div className="space-y-1.5">
                  <div className="relative">
                    <select
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer shadow-sm transition-all"
                      value={localData.admissionOrigin}
                      onChange={e =>
                        setLocalData({
                          ...localData,
                          admissionOrigin: e.target.value as AdmissionOrigin,
                        })
                      }
                    >
                      <option value="">-- Seleccionar --</option>
                      {ADMISSION_ORIGIN_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {localData.admissionOrigin === 'Otro' && (
                    <input
                      type="text"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner"
                      placeholder="Especifique origen..."
                      value={localData.admissionOriginDetails}
                      onChange={e =>
                        setLocalData({ ...localData, admissionOriginDetails: e.target.value })
                      }
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Condición
                </label>
                <div className="relative">
                  <select
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent rounded-lg text-[13px] text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer shadow-sm transition-all"
                    value={localData.origin}
                    onChange={e => setLocalData({ ...localData, origin: e.target.value as Origin })}
                  >
                    <option value="Residente">Residente</option>
                    <option value="Turista Nacional">Turista Nacional</option>
                    <option value="Turista Extranjero">Turista Extranjero</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label
                  className={clsx(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none',
                    localData.isRapanui
                      ? 'bg-amber-50 border-amber-200 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <div
                    className={clsx(
                      'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                      localData.isRapanui
                        ? 'bg-amber-500 border-amber-600'
                        : 'bg-white border-slate-300'
                    )}
                  >
                    {localData.isRapanui && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={localData.isRapanui}
                      onChange={e => setLocalData({ ...localData, isRapanui: e.target.checked })}
                    />
                  </div>
                  <div>
                    <span
                      className={clsx(
                        'text-[13px] font-bold block',
                        localData.isRapanui ? 'text-amber-900' : 'text-slate-700'
                      )}
                    >
                      Pertenencia Rapanui
                    </span>
                  </div>
                </label>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide ml-1">
                  Sexo Biológico
                </label>
                <div className="flex gap-2">
                  {(['Masculino', 'Femenino', 'Indeterminado'] as const).map(sex => (
                    <label
                      key={sex}
                      className={clsx(
                        'cursor-pointer px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all border select-none flex-1 text-center',
                        localData.biologicalSex === sex
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <input
                        type="radio"
                        name="biologicalSex"
                        className="sr-only"
                        checked={localData.biologicalSex === sex}
                        onChange={() =>
                          setLocalData({ ...localData, biologicalSex: sex as BiologicalSex })
                        }
                      />
                      {sex === 'Masculino' ? 'M' : sex === 'Femenino' ? 'F' : '?'}
                      <span className="hidden sm:inline sm:ml-1 text-[9px] font-normal opacity-80">
                        {sex === 'Indeterminado' ? '' : sex.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur pt-2 mt-1 flex justify-end items-center gap-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-[13px] font-bold transition-colors px-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0 flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Guardar Cambios
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
