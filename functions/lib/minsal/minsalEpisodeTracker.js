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

const resolveAdmissionDateValue = (admissionDate, recordDate) =>
  normalizeDateOnly(admissionDate) || normalizeDateOnly(recordDate) || '';

const createEpisodeAdmissionTracker = () => {
  const statesByRut = new Map();

  const observePatient = (patient, recordDate) => {
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
    closeEpisode,
  };
};

module.exports = {
  createEpisodeAdmissionTracker,
};
