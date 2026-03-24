import { collection } from 'firebase/firestore';
import { getActiveHospitalId, COLLECTIONS } from '@/constants/firestorePaths';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

export const getTransfersCollection = (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
) => collection(runtime.getDb(), COLLECTIONS.HOSPITALS, getActiveHospitalId(), 'transferRequests');

export const getTransferHistoryCollection = (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
) => collection(runtime.getDb(), COLLECTIONS.HOSPITALS, getActiveHospitalId(), 'transferHistory');
