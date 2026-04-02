import { normalizeDateOnly } from '@/utils/dateUtils';

type EpisodeObservedPatient = {
  patientName?: string;
  rut?: string;
  admissionDate?: string;
  isBlocked?: boolean;
  clinicalCrib?: EpisodeObservedPatient;
};

interface EpisodeState {
  admissionDate: string;
  open: boolean;
}

export interface EpisodeAdmissionTracker {
  observeBed: (bed: EpisodeObservedPatient | undefined, recordDate: string) => void;
  resolveAdmissionDate: (rut?: string, fallbackAdmissionDate?: string) => string | undefined;
  closeEpisode: (rut?: string) => void;
}

const normalizeRutKey = (rut?: string): string =>
  (rut || '')
    .replace(/[.\-\s]/g, '')
    .trim()
    .toUpperCase();

const hasPatientIdentity = (patient?: EpisodeObservedPatient): patient is EpisodeObservedPatient =>
  Boolean(patient && !patient.isBlocked && patient.patientName?.trim() && patient.rut?.trim());

const resolveAdmissionDateValue = (admissionDate?: string, recordDate?: string): string => {
  return normalizeDateOnly(admissionDate) ?? normalizeDateOnly(recordDate) ?? '';
};

export const createEpisodeAdmissionTracker = (): EpisodeAdmissionTracker => {
  const statesByRut = new Map<string, EpisodeState>();

  const observePatient = (
    patient: EpisodeObservedPatient | undefined,
    recordDate: string
  ): void => {
    if (!hasPatientIdentity(patient)) return;

    const rutKey = normalizeRutKey(patient.rut);
    if (!rutKey) return;

    const nextAdmissionDate = resolveAdmissionDateValue(patient.admissionDate, recordDate);
    const currentState = statesByRut.get(rutKey);

    if (!currentState || !currentState.open) {
      statesByRut.set(rutKey, {
        admissionDate: nextAdmissionDate,
        open: true,
      });
      return;
    }

    if (nextAdmissionDate) {
      currentState.admissionDate = nextAdmissionDate;
    }
  };

  const observeBed = (bed: EpisodeObservedPatient | undefined, recordDate: string): void => {
    if (!bed) return;
    observePatient(bed, recordDate);
    observePatient(bed.clinicalCrib, recordDate);
  };

  const resolveAdmissionDate = (
    rut?: string,
    fallbackAdmissionDate?: string
  ): string | undefined => {
    const rutKey = normalizeRutKey(rut);
    if (rutKey) {
      const admissionDate = statesByRut.get(rutKey)?.admissionDate;
      if (admissionDate) {
        return admissionDate;
      }
    }

    return normalizeDateOnly(fallbackAdmissionDate);
  };

  const closeEpisode = (rut?: string): void => {
    const rutKey = normalizeRutKey(rut);
    if (!rutKey) return;

    const currentState = statesByRut.get(rutKey);
    if (currentState) {
      currentState.open = false;
    }
  };

  return {
    observeBed,
    resolveAdmissionDate,
    closeEpisode,
  };
};
