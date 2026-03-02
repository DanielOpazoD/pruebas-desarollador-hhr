const functions = require('firebase-functions/v1');

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
});

const normalizeSpecialty = specialty => {
  if (!specialty) return 'Sin Especialidad';
  const normalized = specialty.trim();
  if (GYN_OBSTETRIC_NAMES.some(name => normalized.toLowerCase() === name.toLowerCase())) {
    return 'Ginecobstetricia';
  }
  return normalized || 'Sin Especialidad';
};

const createMinsalFunctions = ({ admin, hospitalCapacity, hasCallableClinicalAccess }) => ({
  calculateMinsalStats: functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const hasAccess = await hasCallableClinicalAccess(context);
    if (!hasAccess) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have access to this operation.'
      );
    }

    const { hospitalId, startDate, endDate } = data;
    if (!hospitalId || !startDate || !endDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: hospitalId, startDate, endDate.'
      );
    }

    const recordsRef = admin
      .firestore()
      .collection('hospitals')
      .doc(hospitalId)
      .collection('dailyRecords');

    try {
      const snapshot = await recordsRef
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      if (snapshot.empty) {
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

      const filteredRecords = [];
      snapshot.forEach(doc => {
        filteredRecords.push(doc.data());
      });

      let totalDiasCamaDisponibles = 0;
      let totalDiasCamaOcupados = 0;
      let totalEgresosVivos = 0;
      let totalEgresosFallecidos = 0;
      let totalEgresosTraslados = 0;

      const specialtyData = new Map();

      filteredRecords.forEach(record => {
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

          if (
            bed.clinicalCrib &&
            bed.clinicalCrib.patientName &&
            bed.clinicalCrib.patientName.trim()
          ) {
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
      const totalDaysInRange =
        (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) + 1;
      const avgAvailableBeds =
        filteredRecords.length > 0
          ? totalDiasCamaDisponibles / filteredRecords.length
          : hospitalCapacity;
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
        totalDays: filteredRecords.length,
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
    } catch (error) {
      console.error('Error calculating statistics:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Error calculating statistics: ${error.message}`
      );
    }
  }),
});

module.exports = {
  createMinsalFunctions,
};
