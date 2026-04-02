import { normalizeDateOnly } from '@/utils/dateUtils';

/**
 * Shared episode registry for census, statistics, and historical backfill.
 *
 * Business rule:
 * - A discharge or transfer closes the current episode for that RUT.
 * - While an episode is open, the first observed census day anchors the episode.
 * - Statistics, traceability, and backfill all read that same anchored day.
 * - A later correction may update the stored admission date on the first day of
 *   the episode, but not the episode boundary itself.
 */
type EpisodeObservedPatient = {
  patientName?: string;
  rut?: string;
  admissionDate?: string;
  isBlocked?: boolean;
  clinicalCrib?: EpisodeObservedPatient;
};

interface EpisodeState {
  firstSeenDate: string;
  admissionDate: string;
  open: boolean;
}

export interface EpisodeAdmissionTracker {
  observeBed: (bed: EpisodeObservedPatient | undefined, recordDate: string) => void;
  resolveAdmissionDate: (rut?: string, fallbackAdmissionDate?: string) => string | undefined;
  resolveEpisodeStartDate: (rut?: string, fallbackAdmissionDate?: string) => string | undefined;
  closeEpisode: (rut?: string) => void;
}

const normalizeRutKey = (rut?: string): string =>
  (rut || '')
    .replace(/[.\-\s]/g, '')
    .trim()
    .toUpperCase();

const hasPatientIdentity = (patient?: EpisodeObservedPatient): patient is EpisodeObservedPatient =>
  Boolean(patient && !patient.isBlocked && patient.patientName?.trim() && patient.rut?.trim());

const resolveEpisodeAnchorDate = (recordDate?: string, admissionDate?: string): string => {
  return normalizeDateOnly(recordDate) ?? normalizeDateOnly(admissionDate) ?? '';
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

    const nextAdmissionDate = resolveEpisodeAnchorDate(recordDate, patient.admissionDate);
    const currentState = statesByRut.get(rutKey);

    if (!currentState || !currentState.open) {
      statesByRut.set(rutKey, {
        firstSeenDate: nextAdmissionDate,
        admissionDate: nextAdmissionDate,
        open: true,
      });
      return;
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

  const resolveEpisodeStartDate = (
    rut?: string,
    fallbackAdmissionDate?: string
  ): string | undefined => {
    const rutKey = normalizeRutKey(rut);
    if (rutKey) {
      const admissionDate = statesByRut.get(rutKey)?.firstSeenDate;
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
    resolveEpisodeStartDate,
    closeEpisode,
  };
};
