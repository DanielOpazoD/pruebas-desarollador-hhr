import { useCallback } from 'react';
import type { TransferRequest, TransferFormData, TransferStatus } from '@/types/transfers';
import {
  changeTransferStatus,
  completeTransfer,
  createTransferRequest,
  deleteStatusHistoryEntry,
  deleteTransferRequest,
  updateTransferRequest,
} from '@/services/transfers/transferService';
import { getNextStatus } from '@/constants/transferConstants';
import {
  buildCreateTransferPayload,
  resolvePreviousTransferStatus,
} from '@/hooks/controllers/transferManagementController';
import { getLocalDateInputValue } from '@/utils/localDate';
import {
  buildTransferCompletionTimestamp,
  getTransferActionErrorMessage,
  getTransferAuthError,
  getTransferCreationPreconditionError,
  getTransferStatusAdvanceError,
} from '@/hooks/controllers/transferManagementFeedbackController';
import type { DailyRecord } from '@/types';
import type { DailyRecordActionsContextType } from '@/hooks/useDailyRecordTypes';
import { logger } from '@/services/utils/loggerService';

const transferManagementLogger = logger.child('useTransferManagementActions');

interface UseTransferManagementActionsParams {
  userEmail: string | null;
  record: DailyRecord | null;
  addTransfer: DailyRecordActionsContextType['addTransfer'];
  clearPatient: DailyRecordActionsContextType['clearPatient'];
  setError: (value: string | null) => void;
}

export const useTransferManagementActions = ({
  userEmail,
  record,
  addTransfer,
  clearPatient,
  setError,
}: UseTransferManagementActionsParams) => {
  const runTransferAction = useCallback(
    async (
      action: Parameters<typeof getTransferActionErrorMessage>[0],
      task: () => Promise<void>
    ) => {
      try {
        await task();
        setError(null);
      } catch (err) {
        transferManagementLogger.error(`Transfer action "${action}" failed`, err);
        setError(getTransferActionErrorMessage(action));
      }
    },
    [setError]
  );

  const createTransfer = useCallback(
    async (data: TransferFormData) => {
      const patient = record?.beds?.[data.bedId];
      const preconditionError = getTransferCreationPreconditionError({
        hasUserEmail: Boolean(userEmail),
        hasBeds: Boolean(record?.beds),
        hasPatient: Boolean(patient),
      });
      if (preconditionError || !userEmail || !record || !patient) {
        setError(preconditionError);
        return;
      }

      await runTransferAction('create', async () => {
        await createTransferRequest(
          buildCreateTransferPayload(
            data,
            patient,
            record.date,
            userEmail,
            data.requestDate || getLocalDateInputValue()
          )
        );
      });
    },
    [record, runTransferAction, setError, userEmail]
  );

  const updateTransfer = useCallback(
    async (id: string, data: Partial<TransferFormData>) => {
      await runTransferAction('update', async () => {
        await updateTransferRequest(id, data);
      });
    },
    [runTransferAction]
  );

  const advanceStatus = useCallback(
    async (transfer: TransferRequest) => {
      const nextStatus = getNextStatus(transfer.status);
      const preconditionError = getTransferStatusAdvanceError(Boolean(userEmail), nextStatus);
      if (preconditionError || !userEmail || !nextStatus) {
        setError(preconditionError);
        return;
      }

      await runTransferAction('advance', async () => {
        await changeTransferStatus(transfer.id, nextStatus, userEmail);
      });
    },
    [runTransferAction, setError, userEmail]
  );

  const setTransferStatus = useCallback(
    async (transfer: TransferRequest, status: TransferStatus) => {
      const authError = getTransferAuthError(Boolean(userEmail));
      if (authError || !userEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('set_status', async () => {
        await changeTransferStatus(transfer.id, status, userEmail);
      });
    },
    [runTransferAction, setError, userEmail]
  );

  const markAsTransferred = useCallback(
    async (transfer: TransferRequest, transferMethod: string) => {
      const authError = getTransferAuthError(Boolean(userEmail));
      if (authError || !userEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('complete', async () => {
        await completeTransfer(transfer.id, userEmail);
        addTransfer(
          transfer.bedId,
          transferMethod,
          transfer.destinationHospital,
          '',
          undefined,
          buildTransferCompletionTimestamp()
        );
        clearPatient(transfer.bedId);
      });
    },
    [addTransfer, clearPatient, runTransferAction, setError, userEmail]
  );

  const cancelTransfer = useCallback(
    async (transfer: TransferRequest, reason: string) => {
      const authError = getTransferAuthError(Boolean(userEmail));
      if (authError || !userEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('cancel', async () => {
        await changeTransferStatus(transfer.id, 'CANCELLED', userEmail, reason);
      });
    },
    [runTransferAction, setError, userEmail]
  );

  const deleteTransfer = useCallback(
    async (id: string) => {
      await runTransferAction('delete', async () => {
        await deleteTransferRequest(id);
      });
    },
    [runTransferAction]
  );

  const undoTransfer = useCallback(
    async (transfer: TransferRequest) => {
      const authError = getTransferAuthError(Boolean(userEmail));
      if (authError || !userEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('undo', async () => {
        await changeTransferStatus(
          transfer.id,
          resolvePreviousTransferStatus(transfer),
          userEmail,
          'Traslado deshecho'
        );
      });
    },
    [runTransferAction, setError, userEmail]
  );

  const archiveTransfer = useCallback(
    async (transfer: TransferRequest) => {
      await runTransferAction('archive', async () => {
        await updateTransferRequest(transfer.id, {
          archived: true,
          archivedAt: new Date().toISOString(),
        } as Partial<TransferRequest>);
      });
    },
    [runTransferAction]
  );

  const deleteHistoryEntry = useCallback(
    async (transfer: TransferRequest, historyIndex: number) => {
      await runTransferAction('delete_history', async () => {
        await deleteStatusHistoryEntry(transfer.id, historyIndex);
      });
    },
    [runTransferAction]
  );

  return {
    createTransfer,
    updateTransfer,
    advanceStatus,
    setTransferStatus,
    markAsTransferred,
    cancelTransfer,
    deleteTransfer,
    undoTransfer,
    archiveTransfer,
    deleteHistoryEntry,
  };
};
