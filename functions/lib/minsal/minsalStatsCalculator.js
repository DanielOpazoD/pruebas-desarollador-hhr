const { createEmptySpecialtyBucket, normalizeSpecialty } = require('./minsalSpecialty');

const calculateMinsalStatistics = ({ records, hospitalCapacity, startDate, endDate }) => {
  if (!records || records.length === 0) {
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalDays: 0,
      diasCamaDisponibles: 0,
      diasCamaOcupados: 0,
      egresosTotal: 0,
      egresosVivos: 0,
      egresosFallecidos: 0,
      egresosTraslados: 0,
      tasaOcupacion: 0,
      promedioDiasEstada: 0,
      mortalidadHospitalaria: 0,
      indiceRotacion: 0,
      pacientesActuales: 0,
      camasOcupadas: 0,
      camasBloqueadas: 0,
      camasDisponibles: hospitalCapacity,
      camasLibres: hospitalCapacity,
      tasaOcupacionActual: 0,
      porEspecialidad: [],
      message: 'No records found for the given range.',
    };
  }

  let totalDiasCamaDisponibles = 0;
  let totalDiasCamaOcupados = 0;
  let totalEgresosVivos = 0;
  let totalEgresosFallecidos = 0;
  let totalEgresosTraslados = 0;

  const specialtyData = new Map();

  records.forEach(record => {
    const beds = record.beds || {};
    let ocupadas = 0;
    let bloqueadas = 0;

    Object.keys(beds).forEach(bedId => {
      const bed = beds[bedId];
      if (bed.isBlocked) {
        bloqueadas++;
        return;
      }
      if (!(bed.patientName && bed.patientName.trim())) {
        return;
      }

      ocupadas++;
      const specialty = normalizeSpecialty(bed.specialty);
      const existing = specialtyData.get(specialty) || createEmptySpecialtyBucket();
      existing.diasOcupados++;
      specialtyData.set(specialty, existing);

      if (bed.clinicalCrib && bed.clinicalCrib.patientName && bed.clinicalCrib.patientName.trim()) {
        ocupadas++;
        const cribSpecialty = normalizeSpecialty(bed.clinicalCrib.specialty);
        const cribExisting = specialtyData.get(cribSpecialty) || createEmptySpecialtyBucket();
        cribExisting.diasOcupados++;
        specialtyData.set(cribSpecialty, cribExisting);
      }
    });

    totalDiasCamaDisponibles += hospitalCapacity - bloqueadas;
    totalDiasCamaOcupados += ocupadas;

    if (record.discharges) {
      record.discharges.forEach(discharge => {
        const specialty = normalizeSpecialty(discharge.originalData?.specialty);
        const existing = specialtyData.get(specialty) || createEmptySpecialtyBucket();
        existing.egresos++;
        if (discharge.status === 'Fallecido') {
          totalEgresosFallecidos++;
          existing.fallecidos++;
        } else {
          totalEgresosVivos++;
        }
        specialtyData.set(specialty, existing);
      });
    }

    if (record.transfers) {
      totalEgresosTraslados += record.transfers.length;
      record.transfers.forEach(transfer => {
        const specialty = normalizeSpecialty(transfer.originalData?.specialty);
        const existing = specialtyData.get(specialty) || createEmptySpecialtyBucket();
        existing.traslados++;
        specialtyData.set(specialty, existing);
      });
    }
  });

  const egresosTotal = totalEgresosVivos + totalEgresosFallecidos + totalEgresosTraslados;
  const tasaOcupacion =
    totalDiasCamaDisponibles > 0 ? (totalDiasCamaOcupados / totalDiasCamaDisponibles) * 100 : 0;
  const promedioDiasEstada = egresosTotal > 0 ? totalDiasCamaOcupados / egresosTotal : 0;
  const totalDaysInRange = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;
  const avgAvailableBeds =
    records.length > 0 ? totalDiasCamaDisponibles / records.length : hospitalCapacity;
  const indiceRotacion =
    avgAvailableBeds > 0 && totalDaysInRange > 0
      ? (egresosTotal / avgAvailableBeds) * (30 / totalDaysInRange)
      : 0;

  const porEspecialidad = Array.from(specialtyData.entries())
    .map(([specialty, bucket]) => {
      const egresosEsp = bucket.egresos || 0;
      return {
        specialty,
        egresos: bucket.egresos,
        fallecidos: bucket.fallecidos,
        traslados: bucket.traslados,
        diasOcupados: bucket.diasOcupados,
        contribucionRelativa:
          totalDiasCamaOcupados > 0 ? (bucket.diasOcupados / totalDiasCamaOcupados) * 100 : 0,
        tasaMortalidad: egresosEsp > 0 ? (bucket.fallecidos / egresosEsp) * 100 : 0,
        promedioDiasEstada: egresosEsp > 0 ? bucket.diasOcupados / egresosEsp : 0,
      };
    })
    .sort((a, b) => b.diasOcupados - a.diasOcupados);

  return {
    periodStart: startDate,
    periodEnd: endDate,
    totalDays: records.length,
    diasCamaDisponibles: totalDiasCamaDisponibles,
    diasCamaOcupados: totalDiasCamaOcupados,
    egresosTotal,
    egresosVivos: totalEgresosVivos,
    egresosFallecidos: totalEgresosFallecidos,
    egresosTraslados: totalEgresosTraslados,
    tasaOcupacion: Math.round(tasaOcupacion * 10) / 10,
    promedioDiasEstada: Math.round(promedioDiasEstada * 10) / 10,
    mortalidadHospitalaria:
      egresosTotal > 0 ? Math.round((totalEgresosFallecidos / egresosTotal) * 1000) / 10 : 0,
    indiceRotacion: Math.round(indiceRotacion * 10) / 10,
    pacientesActuales: 0,
    camasLibres: 0,
    porEspecialidad,
  };
};

module.exports = {
  calculateMinsalStatistics,
};
