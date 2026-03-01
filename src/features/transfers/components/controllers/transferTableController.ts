import type { TransferRequest, TransferStatus } from '@/types/transfers';

export type TransferTableMode = 'active' | 'finalized';

export const ACTIVE_TRANSFER_STATUSES: readonly TransferStatus[] = [
  'REQUESTED',
  'RECEIVED',
  'ACCEPTED',
] as const;

export const FINALIZED_TRANSFER_STATUSES: readonly TransferStatus[] = [
  'TRANSFERRED',
  'REJECTED',
  'CANCELLED',
  'NO_RESPONSE',
] as const;

export const isTransferActiveStatus = (status: TransferStatus): boolean =>
  ACTIVE_TRANSFER_STATUSES.includes(status);

export const isTransferFinalizedStatus = (status: TransferStatus): boolean =>
  FINALIZED_TRANSFER_STATUSES.includes(status);

export const isTransferredStatus = (status: TransferStatus): boolean => status === 'TRANSFERRED';

export interface TransferRowActionState {
  canEditInline: boolean;
  canPrepareDocuments: boolean;
  canViewDocuments: boolean;
  canUndoTransfer: boolean;
  canArchiveTransfer: boolean;
  canCancelTransfer: boolean;
}

export const getTransferRowActionState = (
  transfer: TransferRequest,
  mode: TransferTableMode,
  hasDocumentSupport: boolean
): TransferRowActionState => {
  const isActiveRow = mode === 'active' && isTransferActiveStatus(transfer.status);
  const isFinalizedTransferredRow = mode === 'finalized' && isTransferredStatus(transfer.status);

  return {
    canEditInline: isActiveRow,
    canPrepareDocuments: isActiveRow && hasDocumentSupport,
    canViewDocuments: isActiveRow && !!transfer.questionnaireResponses && hasDocumentSupport,
    canUndoTransfer: isFinalizedTransferredRow,
    canArchiveTransfer: isFinalizedTransferredRow,
    canCancelTransfer: isActiveRow,
  };
};

export const getTransferTableDateLabel = (value: string): string =>
  new Date(value).toLocaleDateString('es-CL');
