/**
 * Transfer Service
 * Handles Firestore operations for transfer requests
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { TransferRequest, TransferStatus, StatusChange } from '@/types/transfers';

import { getActiveHospitalId, COLLECTIONS } from '@/constants/firestorePaths';

// Collection paths
const getTransfersCollection = () =>
  collection(db, COLLECTIONS.HOSPITALS, getActiveHospitalId(), 'transferRequests');

const getTransferHistoryCollection = () =>
  collection(db, COLLECTIONS.HOSPITALS, getActiveHospitalId(), 'transferHistory');

const CLOSED_TRANSFER_STATUSES: readonly TransferStatus[] = [
  'TRANSFERRED',
  'CANCELLED',
  'REJECTED',
  'NO_RESPONSE',
];

const isClosedTransferStatus = (status: TransferStatus): boolean =>
  CLOSED_TRANSFER_STATUSES.includes(status);

/**
 * Generate a unique ID for new transfer requests
 */
const generateTransferId = (): string => {
  return `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Convert Firestore document to TransferRequest
 */
const docToTransfer = (docData: Record<string, unknown>, docId: string): TransferRequest => {
  const normalizeLegacyStatus = (rawStatus: string | null | undefined): TransferStatus => {
    if (rawStatus === 'SENT') return 'RECEIVED';
    return (rawStatus || 'REQUESTED') as TransferStatus;
  };

  const normalizeHistoryFrom = (rawStatus: string | null | undefined): TransferStatus | null => {
    if (rawStatus === null || rawStatus === undefined) return null;
    return normalizeLegacyStatus(rawStatus);
  };

  const status = normalizeLegacyStatus(docData.status as string | undefined);

  return {
    ...(docData as unknown as TransferRequest),
    id: docId,
    status,
    statusHistory: ((docData.statusHistory as StatusChange[]) || []).map(history => ({
      ...history,
      from: normalizeHistoryFrom(history.from as string | null | undefined),
      to: normalizeLegacyStatus(history.to as string | undefined),
    })),
    requestDate:
      docData.requestDate instanceof Timestamp
        ? docData.requestDate.toDate().toISOString().split('T')[0]
        : (docData.requestDate as string),
    createdAt:
      docData.createdAt instanceof Timestamp
        ? docData.createdAt.toDate().toISOString()
        : (docData.createdAt as string),
    updatedAt:
      docData.updatedAt instanceof Timestamp
        ? docData.updatedAt.toDate().toISOString()
        : (docData.updatedAt as string),
  };
};

/**
 * Create a new transfer request
 */
export const createTransferRequest = async (
  data: Omit<TransferRequest, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>
): Promise<TransferRequest> => {
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

  const docRef = doc(getTransfersCollection(), id);
  await setDoc(docRef, {
    ...transfer,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // console.info('✅ Transfer request created:', id);
  return transfer;
};

/**
 * Update an existing transfer request
 */
export const updateTransferRequest = async (
  id: string,
  data: Partial<TransferRequest>
): Promise<void> => {
  const docRef = doc(getTransfersCollection(), id);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // console.info('✅ Transfer request updated:', id);
};

/**
 * Change the status of a transfer request
 */
export const changeTransferStatus = async (
  id: string,
  newStatus: TransferStatus,
  userId: string,
  notes?: string
): Promise<void> => {
  const docRef = doc(getTransfersCollection(), id);
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

  // console.info(`✅ Transfer ${id} status changed: ${current.status} → ${newStatus}`);
};

/**
 * Mark a transfer as completed and move to history
 */
export const completeTransfer = async (id: string, userId: string): Promise<void> => {
  const docRef = doc(getTransfersCollection(), id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Transfer request ${id} not found`);
  }

  const transfer = docSnap.data() as TransferRequest;

  // Add final status change
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

  // Move to history collection
  const historyRef = doc(getTransferHistoryCollection(), id);
  await setDoc(historyRef, completedTransfer);

  // Delete from active collection
  await deleteDoc(docRef);

  // console.info(`✅ Transfer ${id} completed and archived`);
};

/**
 * Get all active transfer requests
 */
export const getActiveTransfers = async (): Promise<TransferRequest[]> => {
  const q = query(
    getTransfersCollection(),
    where('status', '!=', 'TRANSFERRED'),
    orderBy('status'),
    orderBy('requestDate', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => docToTransfer(doc.data(), doc.id));
};

/**
 * Subscribe to transfer requests (real-time)
 * Merges active and history collections to enable month/year navigation.
 */
export const subscribeToTransfers = (
  callback: (transfers: TransferRequest[]) => void
): (() => void) => {
  const activeQuery = query(getTransfersCollection(), orderBy('requestDate', 'desc'));
  const historyQuery = query(getTransferHistoryCollection(), orderBy('requestDate', 'desc'));

  let activeTransfers: TransferRequest[] = [];
  let historyTransfers: TransferRequest[] = [];

  const emitMergedTransfers = () => {
    const mergedById = new Map<string, TransferRequest>();
    [...historyTransfers, ...activeTransfers].forEach(transfer => {
      mergedById.set(transfer.id, transfer);
    });
    const merged = [...mergedById.values()].sort((a, b) => {
      const requestDateOrder = b.requestDate.localeCompare(a.requestDate);
      if (requestDateOrder !== 0) {
        return requestDateOrder;
      }
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
    callback(merged);
  };

  const unsubscribeActive = onSnapshot(
    activeQuery,
    snapshot => {
      activeTransfers = snapshot.docs.map(doc => docToTransfer(doc.data(), doc.id));
      emitMergedTransfers();
    },
    error => {
      console.error('❌ Error subscribing to active transfers:', error);
      activeTransfers = [];
      emitMergedTransfers();
    }
  );

  const unsubscribeHistory = onSnapshot(
    historyQuery,
    snapshot => {
      historyTransfers = snapshot.docs.map(doc => docToTransfer(doc.data(), doc.id));
      emitMergedTransfers();
    },
    error => {
      console.error('❌ Error subscribing to transfer history:', error);
      historyTransfers = [];
      emitMergedTransfers();
    }
  );

  return () => {
    unsubscribeActive();
    unsubscribeHistory();
  };
};

/**
 * Get a single transfer request by ID
 */
export const getTransferById = async (id: string): Promise<TransferRequest | null> => {
  const docRef = doc(getTransfersCollection(), id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docToTransfer(docSnap.data(), id);
  }
  return null;
};

/**
 * Find latest active (non-closed, non-archived) transfer request by bed ID.
 */
export const getLatestOpenTransferRequestByBedId = async (
  bedId: string
): Promise<TransferRequest | null> => {
  const q = query(getTransfersCollection(), where('bedId', '==', bedId));
  const querySnapshot = await getDocs(q);

  const candidates = querySnapshot.docs
    .map(doc => docToTransfer(doc.data(), doc.id))
    .filter(transfer => !transfer.archived && !isClosedTransferStatus(transfer.status))
    .sort((a, b) => {
      const aTimestamp = a.updatedAt || a.createdAt || '';
      const bTimestamp = b.updatedAt || b.createdAt || '';
      return bTimestamp.localeCompare(aTimestamp);
    });

  return candidates[0] || null;
};

/**
 * Delete a transfer request (admin only)
 */
export const deleteTransferRequest = async (id: string): Promise<void> => {
  const docRef = doc(getTransfersCollection(), id);
  await deleteDoc(docRef);
  // console.info('🗑️ Transfer request deleted:', id);
};

/**
 * Delete a specific status history entry (for correcting mistakes)
 * Never allows deleting the first entry (creation)
 */
export const deleteStatusHistoryEntry = async (id: string, historyIndex: number): Promise<void> => {
  const docRef = doc(getTransfersCollection(), id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Transfer request ${id} not found`);
  }

  const current = docSnap.data() as TransferRequest;
  const history = current.statusHistory || [];

  // Never delete the first entry
  if (historyIndex === 0 || historyIndex >= history.length) {
    throw new Error('Cannot delete this history entry');
  }

  // Remove the entry and update status to the previous entry's "to" value
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

  // console.info(`✅ Transfer ${id} history entry ${historyIndex} deleted, status reverted to ${newStatus}`);
};
