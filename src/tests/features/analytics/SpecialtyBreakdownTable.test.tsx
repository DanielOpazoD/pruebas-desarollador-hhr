import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows diagnosis in the traceability dialog for period event details', () => {
    render(
      <SpecialtyBreakdownTable
        data={[
          {
            specialty: 'Medicina',
            pacientesActuales: 3,
            egresos: 1,
            fallecidos: 0,
            traslados: 0,
            aerocardal: 0,
            fach: 0,
            diasOcupados: 9,
            contribucionRelativa: 50,
            tasaMortalidad: 0,
            promedioDiasEstada: 4.5,
            diasOcupadosList: [],
            egresosList: [
              {
                name: 'Paciente Demo',
                rut: '11.111.111-1',
                diagnosis: 'Neumonía adquirida en la comunidad',
                date: '2026-03-01',
                bedName: 'UTI 1',
              },
            ],
            trasladosList: [],
            aerocardalList: [],
            fachList: [],
            fallecidosList: [],
          },
        ]}
        records={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '1' }));

    expect(screen.getByText('Diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('Neumonía adquirida en la comunidad')).toBeInTheDocument();
  });
});
