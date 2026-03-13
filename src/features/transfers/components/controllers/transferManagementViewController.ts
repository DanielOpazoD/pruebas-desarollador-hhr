import type { TransferRequest, TransferStatus } from '@/types/transfers';
import {
  ACTIVE_TRANSFER_STATUSES,
  FINALIZED_TRANSFER_STATUSES,
} from '@/features/transfers/components/controllers/transferTableController';

export const TRANSFER_MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

const parseTransferDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export interface TransferManagementPeriodModel {
  availableYears: number[];
  selectedPeriodStart: Date;
  selectedPeriodEnd: Date;
  filteredTransfers: TransferRequest[];
  filteredActiveCount: number;
  activeTransfers: TransferRequest[];
  finalizedTransfers: TransferRequest[];
}

export const buildTransferManagementPeriodModel = ({
  transfers,
  selectedYear,
  selectedMonth,
  currentYear,
}: {
  transfers: TransferRequest[];
  selectedYear: number;
  selectedMonth: number;
  currentYear: number;
}): TransferManagementPeriodModel => {
  const closedStatuses = new Set<TransferStatus>(FINALIZED_TRANSFER_STATUSES);
  const selectedPeriodStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0);
  const selectedPeriodEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
  const availableYears = Array.from(
    transfers.reduce((years, transfer) => {
      years.add(currentYear);
      const requestDate = parseTransferDate(transfer.requestDate);
      if (requestDate) years.add(requestDate.getFullYear());
      const latestStatusDate = parseTransferDate(transfer.statusHistory.at(-1)?.timestamp);
      if (latestStatusDate) years.add(latestStatusDate.getFullYear());
      return years;
    }, new Set<number>())
  ).sort((left, right) => right - left);

  const filteredTransfers = transfers
    .filter(transfer => {
      const requestDate = parseTransferDate(transfer.requestDate);
      if (!requestDate) {
        return false;
      }

      const isClosed = closedStatuses.has(transfer.status);
      if (!isClosed) {
        return requestDate <= selectedPeriodEnd;
      }

      const requestInPeriod =
        requestDate >= selectedPeriodStart && requestDate <= selectedPeriodEnd;
      const latestStatusDate = parseTransferDate(transfer.statusHistory.at(-1)?.timestamp);
      const closedInPeriod = latestStatusDate
        ? latestStatusDate >= selectedPeriodStart && latestStatusDate <= selectedPeriodEnd
        : false;

      return requestInPeriod || closedInPeriod;
    })
    .sort((left, right) => right.requestDate.localeCompare(left.requestDate));

  return {
    availableYears,
    selectedPeriodStart,
    selectedPeriodEnd,
    filteredTransfers,
    filteredActiveCount: filteredTransfers.filter(transfer => !closedStatuses.has(transfer.status))
      .length,
    activeTransfers: filteredTransfers.filter(transfer =>
      ACTIVE_TRANSFER_STATUSES.includes(transfer.status)
    ),
    finalizedTransfers: filteredTransfers.filter(transfer =>
      FINALIZED_TRANSFER_STATUSES.includes(transfer.status)
    ),
  };
};
