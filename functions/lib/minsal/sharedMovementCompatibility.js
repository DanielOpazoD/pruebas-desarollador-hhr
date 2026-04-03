const resolveTraceabilityDiagnosis = value => {
  if (typeof value !== 'string') return undefined;
  const diagnosis = value.trim();
  return diagnosis || undefined;
};

const normalizeMovementReportingSnapshot = movement => ({
  ...movement,
  specialty: movement?.specialty || movement?.originalData?.specialty,
  admissionDate: movement?.admissionDate || movement?.originalData?.admissionDate,
  diagnosis: resolveTraceabilityDiagnosis(movement?.diagnosis || movement?.originalData?.pathology),
});

module.exports = {
  normalizeMovementReportingSnapshot,
};
