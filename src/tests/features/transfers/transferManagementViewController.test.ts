import { describe, expect, it } from 'vitest';

import { buildTransferManagementPeriodModel } from '@/features/transfers/components/controllers/transferManagementViewController';
import type { TransferRequest } from '@/types/transfers';

const buildTransfer = (overrides: Partial<TransferRequest> = {}): TransferRequest =>
  ({
    id: 'TR-1',
    requestDate: '2026-03-10',
    status: 'REQUESTED',
    statusHistory: [],
    ...overrides,
  }) as TransferRequest;

describe('transferManagementViewController', () => {
  it('keeps active requests visible in later months', () => {
    const model = buildTransferManagementPeriodModel({
      transfers: [buildTransfer({ requestDate: '2026-02-15', status: 'REQUESTED' })],
      selectedYear: 2026,
      selectedMonth: 3,
      currentYear: 2026,
    });

    expect(model.activeTransfers).toHaveLength(1);
    expect(model.filteredActiveCount).toBe(1);
  });

  it('keeps finalized requests only when requested or closed inside the selected month', () => {
    const model = buildTransferManagementPeriodModel({
      transfers: [
        buildTransfer({
          id: 'TR-OLD',
          requestDate: '2026-01-10',
          status: 'TRANSFERRED',
          statusHistory: [{ timestamp: '2026-01-11T10:00:00.000Z' }] as never,
        }),
        buildTransfer({
          id: 'TR-CLOSED-IN-PERIOD',
          requestDate: '2026-02-27',
          status: 'TRANSFERRED',
          statusHistory: [{ timestamp: '2026-03-02T10:00:00.000Z' }] as never,
        }),
      ],
      selectedYear: 2026,
      selectedMonth: 3,
      currentYear: 2026,
    });

    expect(model.finalizedTransfers.map(transfer => transfer.id)).toEqual(['TR-CLOSED-IN-PERIOD']);
  });
});
