import { doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { TransferRequest } from '@/types/transfers';
import {
  getTransferHistoryCollection,
  getTransfersCollection,
} from '@/services/transfers/transferFirestoreCollections';
import {
  pickLatestOpenTransferFromSnapshot,
  querySnapshotToTransfers,
  transferDocToEntity,
} from '@/services/transfers/transferSerializationController';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

export const getActiveTransfersQuery = async (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferRequest[]> => {
  await runtime.ready;
  const q = query(
    getTransfersCollection(runtime),
    where('status', '!=', 'TRANSFERRED'),
    orderBy('status'),
    orderBy('requestDate', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshotToTransfers(querySnapshot);
};

export const getTransferByIdQuery = async (
  id: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferRequest | null> => {
  await runtime.ready;
  const activeDocRef = doc(getTransfersCollection(runtime), id);
  const activeSnapshot = await getDoc(activeDocRef);

  if (activeSnapshot.exists()) {
    return transferDocToEntity(activeSnapshot.data() as Record<string, unknown>, id);
  }

  const historyDocRef = doc(getTransferHistoryCollection(runtime), id);
  const historySnapshot = await getDoc(historyDocRef);

  if (historySnapshot.exists()) {
    return transferDocToEntity(historySnapshot.data() as Record<string, unknown>, id);
  }

  return null;
};

export const getLatestOpenTransferRequestByBedIdQuery = async (
  bedId: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferRequest | null> => {
  await runtime.ready;
  const q = query(getTransfersCollection(runtime), where('bedId', '==', bedId));
  const querySnapshot = await getDocs(q);
  return pickLatestOpenTransferFromSnapshot(querySnapshot);
};

export const getLatestOpenTransferRequestByPatientRutQuery = async (
  patientRut: string,
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): Promise<TransferRequest | null> => {
  const normalizedRut = patientRut.trim();
  if (!normalizedRut) {
    return null;
  }

  await runtime.ready;
  const q = query(
    getTransfersCollection(runtime),
    where('patientSnapshot.rut', '==', normalizedRut)
  );
  const querySnapshot = await getDocs(q);
  return pickLatestOpenTransferFromSnapshot(querySnapshot);
};
