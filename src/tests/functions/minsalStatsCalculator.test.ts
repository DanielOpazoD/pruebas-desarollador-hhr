import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  calculateMinsalStatistics,
} = require('../../../functions/lib/minsal/minsalStatsCalculator.js');

describe('functions minsalStatsCalculator', () => {
  it('returns empty statistics when records are missing', () => {
    const result = calculateMinsalStatistics({
      records: [],
      hospitalCapacity: 12,
      startDate: '2026-02-01',
      endDate: '2026-02-07',
    });

    expect(result.totalDays).toBe(0);
    expect(result.camasDisponibles).toBe(12);
    expect(result.message).toContain('No records');
  });

  it('aggregates occupancy and specialties including clinical cribs', () => {
    const result = calculateMinsalStatistics({
      hospitalCapacity: 10,
      startDate: '2026-02-01',
      endDate: '2026-02-02',
      records: [
        {
          beds: {
            b1: {
              patientName: 'Paciente',
              pathology: 'Diagnóstico cama',
              specialty: 'Obstetricia',
              clinicalCrib: {
                patientName: 'RN',
                pathology: 'Diagnóstico RN',
                specialty: 'Obstetricia',
              },
            },
            b2: { isBlocked: true },
          },
          discharges: [
            {
              patientName: 'Paciente',
              rut: '11.111.111-1',
              diagnosis: 'Diagnóstico egreso',
              status: 'Fallecido',
              originalData: { specialty: 'Obstetricia' },
            },
          ],
          transfers: [
            {
              patientName: 'Paciente',
              rut: '11.111.111-1',
              diagnosis: 'Diagnóstico traslado',
              originalData: { specialty: 'Obstetricia' },
            },
          ],
        },
      ],
    });

    expect(result.diasCamaOcupados).toBe(2);
    expect(result.diasCamaDisponibles).toBe(9);
    expect(result.egresosFallecidos).toBe(1);
    expect(result.egresosTraslados).toBe(1);
    expect(result.porEspecialidad[0]).toMatchObject({
      specialty: 'Ginecobstetricia',
      diasOcupados: 2,
      fallecidos: 1,
      traslados: 1,
    });
    expect(result.porEspecialidad[0].fallecidosList?.[0]?.diagnosis).toBe('Diagnóstico egreso');
    expect(result.porEspecialidad[0].trasladosList?.[0]?.diagnosis).toBe('Diagnóstico traslado');
  });
});
