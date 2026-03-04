/**
 * useTransferManagement Hook
 * Manages transfer requests state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { TransferRequest, TransferFormData, TransferStatus } from '@/types/transfers';
import {
  subscribeToTransfers,
  createTransferRequest,
  updateTransferRequest,
  changeTransferStatus,
  completeTransfer,
  deleteTransferRequest,
  deleteStatusHistoryEntry,
} from '@/services/transfers/transferService';
import { getNextStatus } from '@/constants/transferConstants';
import { useAuth } from '@/context/AuthContext';
import { useDailyRecordData } from '@/context/DailyRecordContext';
import {
  useDailyRecordBedActions,
  useDailyRecordMovementActions,
} from '@/context/useDailyRecordScopedActions';
import { getLocalDateInputValue } from '@/features/transfers/utils/localDate';
import {
  buildCreateTransferPayload,
  buildHospitalizedPatients,
  countActiveTransfers,
  filterVisibleTransfers,
  resolvePreviousTransferStatus,
} from '@/hooks/controllers/transferManagementController';
import {
  buildTransferCompletionTimestamp,
  getTransferActionErrorMessage,
  getTransferAuthError,
  getTransferCreationPreconditionError,
  getTransferStatusAdvanceError,
} from '@/hooks/controllers/transferManagementFeedbackController';

interface UseTransferManagementReturn {
  // State
  transfers: TransferRequest[];
  isLoading: boolean;
  error: string | null;

  // Operations
  createTransfer: (data: TransferFormData) => Promise<void>;
  updateTransfer: (id: string, data: Partial<TransferFormData>) => Promise<void>;
  advanceStatus: (transfer: TransferRequest) => Promise<void>;
  setTransferStatus: (transfer: TransferRequest, status: TransferStatus) => Promise<void>;
  markAsTransferred: (transfer: TransferRequest, transferMethod: string) => Promise<void>;
  cancelTransfer: (transfer: TransferRequest, reason: string) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  undoTransfer: (transfer: TransferRequest) => Promise<void>;
  archiveTransfer: (transfer: TransferRequest) => Promise<void>;
  deleteHistoryEntry: (transfer: TransferRequest, historyIndex: number) => Promise<void>;

  // Helpers
  getHospitalizedPatients: () => { id: string; name: string; bedId: string; diagnosis: string }[];
  activeCount: number;
}

export const useTransferManagement = (): UseTransferManagementReturn => {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { record } = useDailyRecordData();
  const { addTransfer } = useDailyRecordMovementActions();
  const { clearPatient } = useDailyRecordBedActions();

  const runTransferAction = useCallback(
    async (
      action: Parameters<typeof getTransferActionErrorMessage>[0],
      task: () => Promise<void>
    ) => {
      try {
        await task();
        setError(null);
      } catch (err) {
        console.error(`Error in transfer action "${action}":`, err);
        setError(getTransferActionErrorMessage(action));
      }
    },
    []
  );

  // Subscribe to transfers on mount
  useEffect(() => {
    // isLoading initialized to true
    const unsubscribe = subscribeToTransfers(data => {
      setTransfers(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get list of hospitalized patients for the selector
  const getHospitalizedPatients = useCallback(() => {
    return buildHospitalizedPatients(record?.beds);
  }, [record]);

  // Create a new transfer request
  const createTransfer = useCallback(
    async (data: TransferFormData) => {
      const actorEmail = user?.email ?? null;
      const patient = record?.beds?.[data.bedId];
      const preconditionError = getTransferCreationPreconditionError({
        hasUserEmail: Boolean(actorEmail),
        hasBeds: Boolean(record?.beds),
        hasPatient: Boolean(patient),
      });
      if (preconditionError || !actorEmail || !record || !patient) {
        setError(preconditionError);
        return;
      }

      await runTransferAction('create', async () => {
        await createTransferRequest(
          buildCreateTransferPayload(
            data,
            patient,
            record.date,
            actorEmail,
            data.requestDate || getLocalDateInputValue()
          )
        );
      });
    },
    [user, record, runTransferAction]
  );

  // Update an existing transfer
  const updateTransfer = useCallback(
    async (id: string, data: Partial<TransferFormData>) => {
      await runTransferAction('update', async () => {
        await updateTransferRequest(id, data);
      });
    },
    [runTransferAction]
  );

  // Advance to next status
  const advanceStatus = useCallback(
    async (transfer: TransferRequest) => {
      const actorEmail = user?.email ?? null;
      const nextStatus = getNextStatus(transfer.status);
      const preconditionError = getTransferStatusAdvanceError(Boolean(actorEmail), nextStatus);
      if (preconditionError || !actorEmail || !nextStatus) {
        setError(preconditionError);
        return;
      }

      await runTransferAction('advance', async () => {
        await changeTransferStatus(transfer.id, nextStatus, actorEmail);
      });
    },
    [user, runTransferAction]
  );

  // Set a specific status
  const setTransferStatus = useCallback(
    async (transfer: TransferRequest, status: TransferStatus) => {
      const actorEmail = user?.email ?? null;
      const authError = getTransferAuthError(Boolean(actorEmail));
      if (authError || !actorEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('set_status', async () => {
        await changeTransferStatus(transfer.id, status, actorEmail);
      });
    },
    [user, runTransferAction]
  );

  // Mark as transferred (complete) and integrate with daily census
  const markAsTransferred = useCallback(
    async (transfer: TransferRequest, transferMethod: string) => {
      const actorEmail = user?.email ?? null;
      const authError = getTransferAuthError(Boolean(actorEmail));
      if (authError || !actorEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('complete', async () => {
        // 1. Complete the transfer request in Firestore
        await completeTransfer(transfer.id, actorEmail);

        // 2. Add to daily census transfers array
        addTransfer(
          transfer.bedId,
          transferMethod,
          transfer.destinationHospital,
          '', // centerOther - not needed as hospital is already selected
          undefined, // escort
          buildTransferCompletionTimestamp()
        );

        // 3. Clear the patient from the bed (bed is now free)
        clearPatient(transfer.bedId);
      });
    },
    [user, addTransfer, clearPatient, runTransferAction]
  );

  // Cancel a transfer request
  const cancelTransfer = useCallback(
    async (transfer: TransferRequest, reason: string) => {
      const actorEmail = user?.email ?? null;
      const authError = getTransferAuthError(Boolean(actorEmail));
      if (authError || !actorEmail) {
        setError(authError);
        return;
      }

      await runTransferAction('cancel', async () => {
        await changeTransferStatus(transfer.id, 'CANCELLED', actorEmail, reason);
      });
    },
    [user, runTransferAction]
  );

  // Delete a transfer request
  const deleteTransfer = useCallback(
    async (id: string) => {
      await runTransferAction('delete', async () => {
        await deleteTransferRequest(id);
      });
    },
    [runTransferAction]
  );

  // Undo a transfer (revert to previous status, typically ACCEPTED)
  const undoTransfer = useCallback(
    async (transfer: TransferRequest) => {
      const actorEmail = user?.email ?? null;
      const authError = getTransferAuthError(Boolean(actorEmail));
      if (authError || !actorEmail) {
        setError(authError);
        return;
      }

      // Find the previous status from history
      const prevStatus = resolvePreviousTransferStatus(transfer);

      await runTransferAction('undo', async () => {
        await changeTransferStatus(transfer.id, prevStatus, actorEmail, 'Traslado deshecho');
      });
    },
    [user, runTransferAction]
  );

  // Archive a transfer (hide from list until next day auto-cleanup)
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

  // Delete a specific history entry (for correcting mistakes)
  const deleteHistoryEntry = useCallback(
    async (transfer: TransferRequest, historyIndex: number) => {
      await runTransferAction('delete_history', async () => {
        await deleteStatusHistoryEntry(transfer.id, historyIndex);
      });
    },
    [runTransferAction]
  );

  // Keep archived transfers hidden from operational views.
  const visibleTransfers = filterVisibleTransfers(transfers);
  const activeCount = countActiveTransfers(visibleTransfers);

  return {
    transfers: visibleTransfers,
    isLoading,
    error,
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
    getHospitalizedPatients,
    activeCount,
  };
};
