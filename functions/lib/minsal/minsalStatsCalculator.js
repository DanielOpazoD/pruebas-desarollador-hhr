const { createEmptySpecialtyBucket, normalizeSpecialty } = require('./minsalSpecialty');

const resolveTraceabilityDiagnosis = value => {
  if (typeof value !== 'string') return undefined;
  const diagnosis = value.trim();
  return diagnosis || undefined;
};

const normalizeIsoDate = value => {
  if (!value || typeof value !== 'string') return undefined;
  const datePart = value.split('T')[0].trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : undefined;
};

const resolveAdmissionDateForEvent = (patientRut, fallbackAdmissionDate, admissionDatesByRut) => {
  const normalizedRut = patientRut ? patientRut.trim() : '';
  if (normalizedRut && admissionDatesByRut.has(normalizedRut)) {
    return admissionDatesByRut.get(normalizedRut);
  }

  return normalizeIsoDate(fallbackAdmissionDate);
};

const calculateHospitalizedDays = (admissionDate, dischargeDate) => {
  const admission = normalizeIsoDate(admissionDate);
  const discharge = normalizeIsoDate(dischargeDate);
  if (!admission || !discharge) return null;

  const [aYear, aMonth, aDay] = admission.split('-').map(Number);
  const [dYear, dMonth, dDay] = discharge.split('-').map(Number);
  const start = Date.UTC(aYear, aMonth - 1, aDay, 12, 0, 0);
  const end = Date.UTC(dYear, dMonth - 1, dDay, 12, 0, 0);
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays < 1 ? 1 : diffDays;
};

const buildStaySummary = durations => {
  if (!durations || durations.length === 0) {
    return { minimum: 0, maximum: 0 };
  }

  return {
    minimum: Math.min(...durations),
    maximum: Math.max(...durations),
  };
};

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
      promedioDiasEstadaMinima: 0,
      promedioDiasEstadaMaxima: 0,
      message: 'No records found for the given range.',
    };
  }

  const orderedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const admissionDatesByRut = new Map();

  let totalDiasCamaDisponibles = 0;
  let totalDiasCamaOcupados = 0;
  let totalEgresosVivos = 0;
  let totalEgresosFallecidos = 0;
  let totalEgresosTraslados = 0;
  const totalStayDurations = [];

  const specialtyData = new Map();

  orderedRecords.forEach(record => {
    Object.values(record.beds || {}).forEach(bed => {
      if (!bed || bed.isBlocked || !(bed.patientName && bed.patientName.trim())) {
        return;
      }

      const primaryRut = (bed.rut || '').trim();
      const admissionDate = normalizeIsoDate(bed.admissionDate);
      if (primaryRut && admissionDate) {
        admissionDatesByRut.set(primaryRut, admissionDate);
      }

      const crib = bed.clinicalCrib;
      const cribRut = crib && crib.rut ? crib.rut.trim() : '';
      const cribAdmissionDate = normalizeIsoDate(crib && crib.admissionDate);
      if (cribRut && cribAdmissionDate) {
        admissionDatesByRut.set(cribRut, cribAdmissionDate);
      }
    });

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
      existing.diasOcupadosList.push({
        name: bed.patientName,
        rut: bed.rut,
        diagnosis: resolveTraceabilityDiagnosis(bed.pathology),
        date: record.date,
        bedName: bed.bedName,
        admissionDate: bed.admissionDate,
      });
      specialtyData.set(specialty, existing);

      if (bed.clinicalCrib && bed.clinicalCrib.patientName && bed.clinicalCrib.patientName.trim()) {
        ocupadas++;
        const cribSpecialty = normalizeSpecialty(bed.clinicalCrib.specialty);
        const cribExisting = specialtyData.get(cribSpecialty) || createEmptySpecialtyBucket();
        cribExisting.diasOcupados++;
        cribExisting.diasOcupadosList.push({
          name: bed.clinicalCrib.patientName,
          rut: bed.clinicalCrib.rut,
          diagnosis: resolveTraceabilityDiagnosis(bed.clinicalCrib.pathology),
          date: record.date,
          bedName: bed.clinicalCrib.bedName || bed.bedName,
          admissionDate: bed.clinicalCrib.admissionDate,
        });
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
        const resolvedAdmissionDate = resolveAdmissionDateForEvent(
          discharge.rut,
          discharge.originalData && discharge.originalData.admissionDate,
          admissionDatesByRut
        );
        const stayDays = calculateHospitalizedDays(resolvedAdmissionDate, record.date);
        if (stayDays !== null) {
          existing.stayDurations.push(stayDays);
          totalStayDurations.push(stayDays);
        }

        const traceData = {
          name: discharge.patientName,
          rut: discharge.rut,
          diagnosis: resolveTraceabilityDiagnosis(
            discharge.diagnosis || discharge.originalData?.pathology
          ),
          date: record.date,
          bedName: discharge.bedName,
          admissionDate: resolvedAdmissionDate,
        };
        existing.egresosList.push(traceData);
        if (discharge.status === 'Fallecido') {
          totalEgresosFallecidos++;
          existing.fallecidos++;
          existing.fallecidosList.push(traceData);
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
        const resolvedAdmissionDate = resolveAdmissionDateForEvent(
          transfer.rut,
          transfer.originalData && transfer.originalData.admissionDate,
          admissionDatesByRut
        );
        const stayDays = calculateHospitalizedDays(resolvedAdmissionDate, record.date);
        if (stayDays !== null) {
          existing.stayDurations.push(stayDays);
          totalStayDurations.push(stayDays);
        }

        existing.trasladosList.push({
          name: transfer.patientName,
          rut: transfer.rut,
          diagnosis: resolveTraceabilityDiagnosis(
            transfer.diagnosis || transfer.originalData?.pathology
          ),
          date: record.date,
          bedName: transfer.bedName,
          admissionDate: resolvedAdmissionDate,
        });
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
      const staySummary = buildStaySummary(bucket.stayDurations);
      return {
        specialty,
        egresos: bucket.egresos,
        fallecidos: bucket.fallecidos,
        traslados: bucket.traslados,
        diasOcupados: bucket.diasOcupados,
        diasOcupadosList: bucket.diasOcupadosList,
        egresosList: bucket.egresosList,
        trasladosList: bucket.trasladosList,
        fallecidosList: bucket.fallecidosList,
        contribucionRelativa:
          totalDiasCamaOcupados > 0 ? (bucket.diasOcupados / totalDiasCamaOcupados) * 100 : 0,
        tasaMortalidad: egresosEsp > 0 ? (bucket.fallecidos / egresosEsp) * 100 : 0,
        promedioDiasEstada: egresosEsp > 0 ? bucket.diasOcupados / egresosEsp : 0,
        promedioDiasEstadaMinima: staySummary.minimum,
        promedioDiasEstadaMaxima: staySummary.maximum,
      };
    })
    .sort((a, b) => b.diasOcupados - a.diasOcupados);

  const totalStaySummary = buildStaySummary(totalStayDurations);

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
    promedioDiasEstadaMinima: totalStaySummary.minimum,
    promedioDiasEstadaMaxima: totalStaySummary.maximum,
    porEspecialidad,
  };
};

module.exports = {
  calculateMinsalStatistics,
};
