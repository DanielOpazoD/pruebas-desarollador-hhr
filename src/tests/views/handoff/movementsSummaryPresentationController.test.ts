import { describe, expect, it } from 'vitest';
import {
  resolveMovementEmptyMessage,
  resolveTransferDestinationLabel,
  resolveTransferEscortLabel,
} from '@/features/handoff/controllers/movementsSummaryController';

describe('movementsSummary presentation helpers', () => {
  it('resolves empty messages per section and shift', () => {
    expect(resolveMovementEmptyMessage('discharges', 'day')).toBe(
      'No hay altas registradas en este turno.'
    );
    expect(resolveMovementEmptyMessage('transfers', 'night')).toBe(
      'No hay traslados registrados durante la noche.'
    );
    expect(resolveMovementEmptyMessage('cma', 'night')).toBe('CMA solo aplica para turno de día.');
  });

  it('resolves transfer destination and escort labels', () => {
    expect(
      resolveTransferDestinationLabel({
        receivingCenter: 'Otro',
        receivingCenterOther: 'Hospital Especial',
      })
    ).toBe('Hospital Especial');
    expect(
      resolveTransferEscortLabel({
        evacuationMethod: 'Aerocardal',
        transferEscort: 'Acompañante',
      })
    ).toBe('-');
  });
});
