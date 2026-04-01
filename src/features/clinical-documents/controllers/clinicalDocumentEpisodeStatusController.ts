import type { UserRole } from '@/types/auth';
import type {
  ClinicalDocumentsEpisodeClosureKind,
  PatientData,
} from '@/features/clinical-documents/contracts/clinicalDocumentsPatientContract';

interface ClinicalDocumentEpisodeClosureState {
  isClosed: boolean;
  closureKind?: ClinicalDocumentsEpisodeClosureKind;
  closureDate?: string;
}

const resolveClinicalDocumentsEpisodeClosureKind = (
  patient: PatientData
): ClinicalDocumentsEpisodeClosureKind | undefined => {
  if (patient.episodeClosureKind) {
    return patient.episodeClosureKind;
  }

  if (patient.transferDate) {
    return 'transfer';
  }

  if (patient.dischargeDate) {
    return 'discharge';
  }

  return undefined;
};

export const resolveClinicalDocumentsEpisodeClosure = (
  patient: PatientData
): ClinicalDocumentEpisodeClosureState => {
  const closureKind = resolveClinicalDocumentsEpisodeClosureKind(patient);
  const closureDate = patient.episodeClosureDate || patient.transferDate || patient.dischargeDate;

  return {
    isClosed: Boolean(closureKind || closureDate),
    closureKind,
    closureDate,
  };
};

export const canMutateClinicalDocumentsEpisode = (
  patient: PatientData,
  role: UserRole | undefined
): boolean => {
  const closure = resolveClinicalDocumentsEpisodeClosure(patient);
  if (!closure.isClosed) {
    return true;
  }

  return role === 'admin';
};

export const buildClinicalDocumentsReadOnlyMessage = (
  patient: PatientData,
  role: UserRole | undefined,
  canEditByRole: boolean
): string | null => {
  if (!canEditByRole) {
    return 'Perfil en solo lectura: puedes revisar e imprimir, pero no crear nuevos documentos.';
  }

  const closure = resolveClinicalDocumentsEpisodeClosure(patient);
  if (!closure.isClosed || role === 'admin') {
    return null;
  }

  const episodeLabel = closure.closureKind === 'transfer' ? 'traslado' : 'alta';
  return `Episodio cerrado por ${episodeLabel}: solo ADMIN puede crear, editar o eliminar documentos.`;
};

export const resolveClinicalDocumentPersistReason = (
  patient: PatientData,
  role: UserRole | undefined
): 'autosave' | 'admin_fix' => {
  if (role === 'admin' && resolveClinicalDocumentsEpisodeClosure(patient).isClosed) {
    return 'admin_fix';
  }

  return 'autosave';
};
