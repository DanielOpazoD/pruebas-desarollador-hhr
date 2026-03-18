import type { DischargeData, TransferData } from '@/types/domain/movements';

export interface MovementSummaryModel {
  totalDeaths: number;
  totalDischarges: number;
  totalTransfers: number;
  cmaCount: number;
  newAdmissions: number;
}

export const buildMovementSummaryModel = (
  discharges: DischargeData[] = [],
  transfers: TransferData[] = [],
  cmaCount: number = 0,
  newAdmissions: number = 0
): MovementSummaryModel => ({
  totalDeaths: discharges.filter(discharge => discharge.status === 'Fallecido').length,
  totalDischarges: discharges.length,
  totalTransfers: transfers.length,
  cmaCount,
  newAdmissions,
});
