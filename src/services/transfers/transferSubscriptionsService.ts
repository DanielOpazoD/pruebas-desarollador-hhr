import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { TransferRequest } from '@/types/transfers';
import {
  getTransferHistoryCollection,
  getTransfersCollection,
} from '@/services/transfers/transferFirestoreCollections';
import { querySnapshotToTransfers } from '@/services/transfers/transferSerializationController';
import {
  buildTransferSubscriptionErrorMessage,
  createInitialTransferSubscriptionState,
  mergeSubscribedTransfers,
} from '@/services/transfers/transferSubscriptionController';
import { recordOperationalErrorTelemetry } from '@/services/observability/operationalTelemetryService';

interface SubscribeToTransfersOptions {
  onError?: (message: string, error: unknown) => void;
}

export const subscribeToTransfersRealtime = (
  callback: (transfers: TransferRequest[]) => void,
  options: SubscribeToTransfersOptions = {}
): (() => void) => {
  const activeQuery = query(getTransfersCollection(), orderBy('requestDate', 'desc'));
  const historyQuery = query(getTransferHistoryCollection(), orderBy('requestDate', 'desc'));

  const state = createInitialTransferSubscriptionState();
  const emitMergedTransfers = () => {
    callback(mergeSubscribedTransfers(state));
  };

  const handleSubscriptionError = (source: 'active' | 'history', error: unknown) => {
    if (source === 'active') {
      state.activeTransfers = [];
    } else {
      state.historyTransfers = [];
    }

    options.onError?.(buildTransferSubscriptionErrorMessage(source, error), error);
    recordOperationalErrorTelemetry('transfers', `subscribe_transfers_${source}`, error, {
      code: `transfer_${source}_subscription_failed`,
      message: buildTransferSubscriptionErrorMessage(source, error),
      severity: 'warning',
      userSafeMessage: buildTransferSubscriptionErrorMessage(source, error),
      context: {
        source,
      },
    });
    emitMergedTransfers();
  };

  const unsubscribeActive = onSnapshot(
    activeQuery,
    snapshot => {
      state.activeTransfers = querySnapshotToTransfers(snapshot);
      emitMergedTransfers();
    },
    error => handleSubscriptionError('active', error)
  );

  const unsubscribeHistory = onSnapshot(
    historyQuery,
    snapshot => {
      state.historyTransfers = querySnapshotToTransfers(snapshot);
      emitMergedTransfers();
    },
    error => handleSubscriptionError('history', error)
  );

  return () => {
    unsubscribeActive();
    unsubscribeHistory();
  };
};
