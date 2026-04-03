import { deleteDoc, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import type { StatusChange, TransferRequest, TransferStatus } from '@/types/transfers';
import {
  getTransferHistoryCollection,
  getTransfersCollection,
} from '@/services/transfers/transferFirestoreCollections';
import {
  buildTransferOperationError,
  resolveTransferOperationErrorKind,
  type TransferOperationErrorKind,
} from '@/services/transfers/transferErrorPolicy';
import { transferMutationsLogger } from '@/services/transfers/transferLoggers';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

export type TransferMutationResult<T = null> =
  | { status: 'success'; data: T }
  | {
      status: TransferOperationErrorKind;
      error: unknown;
      data: null;
      userSafeMessage: string;
    };

const generateTransferId = (): string =>
  `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const buildTransferFailureResult = <T = null>(
  error: unknown,
  userSafeMessage: string
): TransferMutationResult<T> => {
  const kind = resolveTransferOperationErrorKind(error);
  const operationError = buildTransferOperationError(kind, userSafeMessage);

  return {
    status: kind,
    error: operationError,
    data: null,
    userSafeMessage: operationError.userSafeMessage,
  };
};

export const createTransferMutationsService = (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
) => {
  const createTransferRequestWithResult = async (
    data: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
  ): Promise<TransferMutationResult<TransferRequest>> => {
    await runtime.ready;
    const id = generateTransferId();
    const now = new Date().toISOString();

    const transfer: TransferRequest = {
      ...data,
      id,
      status: 'REQUESTED',
      statusHistory: [
        {
          from: null,
          to: 'REQUESTED',
          timestamp: now,
          userId: data.createdBy,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = doc(getTransfersCollection(runtime), id);
      await setDoc(docRef, {
        ...transfer,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      transferMutationsLogger.info('Created transfer request', { transferId: id });
      return { status: 'success', data: transfer };
    } catch (error) {
      transferMutationsLogger.error('Error creating transfer request', error);
      return buildTransferFailureResult(error, 'No se pudo crear la solicitud de traslado.');
    }
  };

  const createTransferRequest = async (
    data: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
  ): Promise<TransferRequest> => {
    const result = await createTransferRequestWithResult(data);
    if (result.status !== 'success') throw result.error;
    return result.data;
  };

  const updateTransferRequestWithResult = async (
    id: string,
    data: Partial<TransferRequest>
  ): Promise<TransferMutationResult> => {
    try {
      await runtime.ready;
      const docRef = doc(getTransfersCollection(runtime), id);
      await setDoc(
        docRef,
        {
          ...data,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      transferMutationsLogger.info('Updated transfer request', {
        transferId: id,
        fields: Object.keys(data),
      });
      return { status: 'success', data: null };
    } catch (error) {
      transferMutationsLogger.error('Error updating transfer request', error);
      return buildTransferFailureResult(error, 'No se pudo actualizar la solicitud de traslado.');
    }
  };

  const updateTransferRequest = async (
    id: string,
    data: Partial<TransferRequest>
  ): Promise<void> => {
    const result = await updateTransferRequestWithResult(id, data);
    if (result.status !== 'success') throw result.error;
  };

  const changeTransferStatusWithResult = async (
    id: string,
    newStatus: TransferStatus,
    userId: string,
    notes?: string
  ): Promise<TransferMutationResult> => {
    await runtime.ready;
    const docRef = doc(getTransfersCollection(runtime), id);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Transfer request ${id} not found`);
      }
      const current = docSnap.data() as TransferRequest;
      const statusChange: StatusChange = {
        from: current.status,
        to: newStatus,
        timestamp: new Date().toISOString(),
        userId,
        notes,
      };

      await setDoc(
        docRef,
        {
          status: newStatus,
          statusHistory: [...(current.statusHistory || []), statusChange],
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      transferMutationsLogger.info('Changed transfer status', { transferId: id, to: newStatus });
      return { status: 'success', data: null };
    } catch (error) {
      transferMutationsLogger.error('Error changing transfer status', error);
      return buildTransferFailureResult(error, 'No se pudo cambiar el estado del traslado.');
    }
  };

  const changeTransferStatus = async (
    id: string,
    newStatus: TransferStatus,
    userId: string,
    notes?: string
  ): Promise<void> => {
    const result = await changeTransferStatusWithResult(id, newStatus, userId, notes);
    if (result.status !== 'success') throw result.error;
  };

  const completeTransferWithResult = async (
    id: string,
    userId: string
  ): Promise<TransferMutationResult> => {
    await runtime.ready;
    const docRef = doc(getTransfersCollection(runtime), id);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Transfer request ${id} not found`);
      }

      const transfer = docSnap.data() as TransferRequest;
      const statusChange: StatusChange = {
        from: transfer.status,
        to: 'TRANSFERRED',
        timestamp: new Date().toISOString(),
        userId,
      };

      const completedTransfer = {
        ...transfer,
        status: 'TRANSFERRED' as TransferStatus,
        statusHistory: [...(transfer.statusHistory || []), statusChange],
        updatedAt: Timestamp.now(),
      };

      const historyRef = doc(getTransferHistoryCollection(runtime), id);
      await setDoc(historyRef, completedTransfer);
      await deleteDoc(docRef);
      transferMutationsLogger.info('Completed transfer request', { transferId: id });
      return { status: 'success', data: null };
    } catch (error) {
      transferMutationsLogger.error('Error completing transfer request', error);
      return buildTransferFailureResult(error, 'No se pudo completar el traslado.');
    }
  };

  const completeTransfer = async (id: string, userId: string): Promise<void> => {
    const result = await completeTransferWithResult(id, userId);
    if (result.status !== 'success') throw result.error;
  };

  const deleteTransferRequestWithResult = async (id: string): Promise<TransferMutationResult> => {
    try {
      await runtime.ready;
      const docRef = doc(getTransfersCollection(runtime), id);
      await deleteDoc(docRef);
      transferMutationsLogger.info('Deleted transfer request', { transferId: id });
      return { status: 'success', data: null };
    } catch (error) {
      transferMutationsLogger.error('Error deleting transfer request', error);
      return buildTransferFailureResult(error, 'No se pudo eliminar la solicitud de traslado.');
    }
  };

  const deleteTransferRequest = async (id: string): Promise<void> => {
    const result = await deleteTransferRequestWithResult(id);
    if (result.status !== 'success') throw result.error;
  };

  const deleteStatusHistoryEntryWithResult = async (
    id: string,
    historyIndex: number
  ): Promise<TransferMutationResult> => {
    await runtime.ready;
    const docRef = doc(getTransfersCollection(runtime), id);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error(`Transfer request ${id} not found`);
      }

      const current = docSnap.data() as TransferRequest;
      const history = current.statusHistory || [];

      if (historyIndex === 0 || historyIndex >= history.length) {
        throw new Error('Cannot delete this history entry');
      }

      const newHistory = history.filter((_, idx) => idx !== historyIndex);
      const newStatus = newHistory[newHistory.length - 1]?.to || 'REQUESTED';

      await setDoc(
        docRef,
        {
          status: newStatus,
          statusHistory: newHistory,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      transferMutationsLogger.info('Deleted transfer history entry', {
        transferId: id,
        historyIndex,
      });
      return { status: 'success', data: null };
    } catch (error) {
      transferMutationsLogger.error('Error deleting transfer history entry', error);
      return buildTransferFailureResult(
        error,
        'No se pudo eliminar el registro del historial de traslado.'
      );
    }
  };

  const deleteStatusHistoryEntry = async (id: string, historyIndex: number): Promise<void> => {
    const result = await deleteStatusHistoryEntryWithResult(id, historyIndex);
    if (result.status !== 'success') throw result.error;
  };

  return {
    createTransferRequest,
    createTransferRequestWithResult,
    updateTransferRequest,
    updateTransferRequestWithResult,
    changeTransferStatus,
    changeTransferStatusWithResult,
    completeTransfer,
    completeTransferWithResult,
    deleteTransferRequest,
    deleteTransferRequestWithResult,
    deleteStatusHistoryEntry,
    deleteStatusHistoryEntryWithResult,
  };
};

const defaultTransferMutationsService = createTransferMutationsService();

export const createTransferRequestMutation = async (
  data: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
): Promise<TransferRequest> => defaultTransferMutationsService.createTransferRequest(data);

export const createTransferRequestMutationWithResult = async (
  data: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult<TransferRequest>> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).createTransferRequestWithResult(data);

export const updateTransferRequestMutation = async (
  id: string,
  data: Partial<TransferRequest>
): Promise<void> => defaultTransferMutationsService.updateTransferRequest(id, data);

export const updateTransferRequestMutationWithResult = async (
  id: string,
  data: Partial<TransferRequest>,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).updateTransferRequestWithResult(id, data);

export const changeTransferStatusMutation = async (
  id: string,
  newStatus: TransferStatus,
  userId: string,
  notes?: string
): Promise<void> =>
  defaultTransferMutationsService.changeTransferStatus(id, newStatus, userId, notes);

export const changeTransferStatusMutationWithResult = async (
  id: string,
  newStatus: TransferStatus,
  userId: string,
  notes?: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).changeTransferStatusWithResult(id, newStatus, userId, notes);

export const completeTransferMutation = async (id: string, userId: string): Promise<void> =>
  defaultTransferMutationsService.completeTransfer(id, userId);

export const completeTransferMutationWithResult = async (
  id: string,
  userId: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).completeTransferWithResult(id, userId);

export const deleteTransferRequestMutation = async (id: string): Promise<void> =>
  defaultTransferMutationsService.deleteTransferRequest(id);

export const deleteTransferRequestMutationWithResult = async (
  id: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).deleteTransferRequestWithResult(id);

export const deleteStatusHistoryEntryMutation = async (
  id: string,
  historyIndex: number
): Promise<void> => defaultTransferMutationsService.deleteStatusHistoryEntry(id, historyIndex);

export const deleteStatusHistoryEntryMutationWithResult = async (
  id: string,
  historyIndex: number,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferMutationResult> =>
  (runtime === defaultFirestoreServiceRuntime
    ? defaultTransferMutationsService
    : createTransferMutationsService(runtime)
  ).deleteStatusHistoryEntryWithResult(id, historyIndex);
