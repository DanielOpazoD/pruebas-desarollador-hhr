import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MinsalKPICards } from '@/features/analytics/components/components/MinsalKPICards';
import type { MinsalStatistics } from '@/types/minsalTypes';

const stats: MinsalStatistics = {
  periodStart: '2026-03-01',
  periodEnd: '2026-03-31',
  totalDays: 31,
  calendarDays: 31,
  diasCamaDisponibles: 558,
  diasCamaOcupados: 390,
  tasaOcupacion: 69.9,
  promedioDiasEstada: 4.2,
  egresosTotal: 40,
  egresosVivos: 36,
  egresosFallecidos: 2,
  egresosTraslados: 2,
  mortalidadHospitalaria: 5,
  indiceRotacion: 2.1,
  pacientesActuales: 13,
  camasOcupadas: 13,
  camasBloqueadas: 0,
  camasDisponibles: 18,
  camasLibres: 5,
  tasaOcupacionActual: 72.2,
  porEspecialidad: [],
};

describe('MinsalKPICards', () => {
  it('labels the occupancy KPI as a period average', () => {
    render(<MinsalKPICards stats={stats} />);

    expect(screen.getByText('Ocupación del período')).toBeInTheDocument();
    expect(screen.getByText('Promedio del rango seleccionado')).toBeInTheDocument();
    expect(screen.getByText('69.9%')).toBeInTheDocument();
  });
});
