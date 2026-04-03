import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MovementsSummary } from '@/features/handoff/components/MovementsSummary';
import type { DailyRecord } from '@/domain/handoff/recordContracts';

const buildRecord = (): DailyRecord =>
  ({
    date: '2026-03-29',
    beds: {},
    discharges: [
      {
        id: 'd1',
        bedName: 'H1C1',
        patientName: 'Paciente Día',
        rut: '1-9',
        diagnosis: 'Dx 1',
        dischargeType: 'Domicilio',
        status: 'Vivo',
        time: '10:00',
      },
      {
        id: 'd2',
        bedName: 'H1C2',
        patientName: 'Paciente Noche',
        rut: '2-7',
        diagnosis: 'Dx 2',
        dischargeType: 'Domicilio',
        status: 'Vivo',
        time: '22:00',
      },
    ],
    transfers: [
      {
        id: 't1',
        bedName: 'H2C1',
        patientName: 'Traslado Día',
        rut: '3-5',
        diagnosis: 'Dx 3',
        evacuationMethod: 'Ambulancia',
        receivingCenter: 'Hospital',
        transferEscort: 'TENS',
        time: '11:30',
      },
    ],
    cma: [
      {
        id: 'c1',
        bedName: 'CMA1',
        patientName: 'Paciente CMA',
        rut: '4-4',
        diagnosis: 'Dx CMA',
        interventionType: 'Control',
      },
    ],
  }) as unknown as DailyRecord;

describe('MovementsSummary', () => {
  it('renders print footer counts for day shift', () => {
    render(<MovementsSummary record={buildRecord()} selectedShift="day" />);

    expect(screen.getByText('Conteo del turno:')).toBeInTheDocument();
    expect(screen.getByText('Altas: 1')).toBeInTheDocument();
    expect(screen.getByText('Traslados: 1')).toBeInTheDocument();
    expect(screen.getByText('CMA: 1')).toBeInTheDocument();
  });

  it('omits CMA count from the footer in night shift', () => {
    render(<MovementsSummary record={buildRecord()} selectedShift="night" />);

    expect(screen.getByText('Conteo del turno:')).toBeInTheDocument();
    expect(screen.getByText('Altas: 1')).toBeInTheDocument();
    expect(screen.getByText('Traslados: 0')).toBeInTheDocument();
    expect(screen.queryByText('CMA: 0')).not.toBeInTheDocument();
  });
});
