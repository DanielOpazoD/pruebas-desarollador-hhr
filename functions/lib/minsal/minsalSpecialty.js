const GYN_OBSTETRIC_NAMES = [
  'Obstetricia',
  'Ginecología',
  'Ginecologia',
  'Obstetricia y Ginecología',
  'Ginecología y Obstetricia',
];

const createEmptySpecialtyBucket = () => ({
  pacientes: 0,
  egresos: 0,
  fallecidos: 0,
  traslados: 0,
  diasOcupados: 0,
  diasOcupadosList: [],
  egresosList: [],
  trasladosList: [],
  fallecidosList: [],
});

const normalizeSpecialty = specialty => {
  if (!specialty) return 'Sin Especialidad';
  const normalized = specialty.trim();
  if (GYN_OBSTETRIC_NAMES.some(name => normalized.toLowerCase() === name.toLowerCase())) {
    return 'Ginecobstetricia';
  }
  return normalized || 'Sin Especialidad';
};

module.exports = {
  createEmptySpecialtyBucket,
  normalizeSpecialty,
};
