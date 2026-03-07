import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpecialtyBreakdownTable } from '@/features/analytics/components/components/SpecialtyBreakdownTable';

describe('SpecialtyBreakdownTable', () => {
  it('labels the first metric as period bed-days instead of current patients', () => {
    render(<SpecialtyBreakdownTable data={[]} records={[]} />);

    expect(
      screen.getByText('No hay datos de especialidades para el período seleccionado.')
    ).toBeInTheDocument();
  });

  it('uses explicit period wording in the specialty header row', () => {
    render(
      <SpecialtyBreakdownTable
        data={[
          {
            specialty: 'Medicina',
            pacientesActuales: 3,
            egresos: 2,
            fallecidos: 1,
            traslados: 0,
            aerocardal: 0,
            fach: 0,
            diasOcupados: 9,
            contribucionRelativa: 50,
            tasaMortalidad: 50,
            promedioDiasEstada: 4.5,
            diasOcupadosList: [],
            egresosList: [],
            trasladosList: [],
            aerocardalList: [],
            fachList: [],
            fallecidosList: [],
          },
        ]}
        records={[]}
      />
    );

    expect(screen.getByText('Días-cama del período')).toBeInTheDocument();
    expect(screen.queryByText('Pacientes (Días-Cama del período)')).not.toBeInTheDocument();
  });
});
