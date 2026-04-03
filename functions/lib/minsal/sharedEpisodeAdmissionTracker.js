const normalizeDateOnly = value => {
  if (!value || typeof value !== 'string') return undefined;
  const datePart = value.split('T')[0].trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : undefined;
};

const normalizeRutKey = rut =>
  (rut || '')
    .replace(/[.\-\s]/g, '')
    .trim()
    .toUpperCase();

const hasPatientIdentity = patient =>
  Boolean(
    patient &&
    !patient.isBlocked &&
    patient.patientName &&
    patient.patientName.trim() &&
    patient.rut &&
    patient.rut.trim()
  );

const resolveEpisodeAnchorDate = (recordDate, admissionDate) =>
  normalizeDateOnly(recordDate) || normalizeDateOnly(admissionDate) || '';

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
const createEpisodeAdmissionTracker = () => {
  const statesByRut = new Map();

  const observePatient = (patient, recordDate) => {
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
    }
  };

  const observeBed = (bed, recordDate) => {
    if (!bed) return;
    observePatient(bed, recordDate);
    observePatient(bed.clinicalCrib, recordDate);
  };

  const resolveAdmissionDate = (rut, fallbackAdmissionDate) => {
    const rutKey = normalizeRutKey(rut);
    if (rutKey) {
      const admissionDate = statesByRut.get(rutKey)?.admissionDate;
      if (admissionDate) return admissionDate;
    }

    return normalizeDateOnly(fallbackAdmissionDate);
  };

  const resolveEpisodeStartDate = (rut, fallbackAdmissionDate) => {
    const rutKey = normalizeRutKey(rut);
    if (rutKey) {
      const admissionDate = statesByRut.get(rutKey)?.firstSeenDate;
      if (admissionDate) return admissionDate;
    }

    return normalizeDateOnly(fallbackAdmissionDate);
  };

  const closeEpisode = rut => {
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

module.exports = {
  createEpisodeAdmissionTracker,
};
