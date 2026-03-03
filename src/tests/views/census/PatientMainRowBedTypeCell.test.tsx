import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BedType } from '@/types';
import { PatientMainRowBedTypeCell } from '@/features/census/components/patient-row/PatientMainRowBedTypeCell';

const mockUseBedActiveTransferQuery = vi.fn();

vi.mock('@/features/census/components/patient-row/useBedActiveTransferQuery', () => ({
  useBedActiveTransferQuery: (...args: unknown[]) => mockUseBedActiveTransferQuery(...args),
}));

describe('PatientMainRowBedTypeCell', () => {
  it('shows active-transfer icon when the bed has an open transfer request', () => {
    mockUseBedActiveTransferQuery.mockReturnValue({
      data: { id: 'TR-1', status: 'REQUESTED' },
    });

    render(
      <table>
        <tbody>
          <tr>
            <PatientMainRowBedTypeCell
              bedId="R1"
              bedType={BedType.UTI}
              hasPatient={true}
              canToggleBedType={false}
              onToggleBedType={() => undefined}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.getByLabelText('Gestión de traslado activa')).toBeInTheDocument();
  });

  it('shows a green plane when the transfer case is accepted', () => {
    mockUseBedActiveTransferQuery.mockReturnValue({
      data: { id: 'TR-2', status: 'ACCEPTED' },
    });

    render(
      <table>
        <tbody>
          <tr>
            <PatientMainRowBedTypeCell
              bedId="R1"
              bedType={BedType.UTI}
              hasPatient={true}
              canToggleBedType={false}
              onToggleBedType={() => undefined}
            />
          </tr>
        </tbody>
      </table>
    );

    const indicator = screen.getByLabelText('Traslado aceptado');
    expect(indicator.className).toContain('bg-emerald-100');
    expect(indicator.className).toContain('text-emerald-600');
  });

  it('hides active-transfer icon when there is no open transfer request', () => {
    mockUseBedActiveTransferQuery.mockReturnValue({
      data: null,
    });

    render(
      <table>
        <tbody>
          <tr>
            <PatientMainRowBedTypeCell
              bedId="R1"
              bedType={BedType.MEDIA}
              hasPatient={true}
              canToggleBedType={false}
              onToggleBedType={() => undefined}
            />
          </tr>
        </tbody>
      </table>
    );

    expect(screen.queryByLabelText('Gestión de traslado activa')).not.toBeInTheDocument();
  });
});
