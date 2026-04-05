import {
  getDoc,
  onSnapshot,
  setDoc,
  type DocumentReference,
  type Firestore,
  type SetOptions,
  type SnapshotListenOptions,
} from 'firebase/firestore';

export interface FirestoreDocumentRuntimePort {
  getDb: () => Firestore;
  ready?: Promise<void>;
}

type FirestoreDocumentRefResolver<TRuntime extends FirestoreDocumentRuntimePort> = (
  runtime: TRuntime
) => DocumentReference;

const ensureFirestoreRuntimeReady = async (
  runtime: FirestoreDocumentRuntimePort
): Promise<void> => {
  if (runtime.ready) {
    await runtime.ready;
  }
};

export const readFirestoreDocument = async <
  TDocument,
  TRuntime extends FirestoreDocumentRuntimePort,
>(
  runtime: TRuntime,
  resolveRef: FirestoreDocumentRefResolver<TRuntime>
): Promise<TDocument | null> => {
  await ensureFirestoreRuntimeReady(runtime);
  const snapshot = await getDoc(resolveRef(runtime));
  return snapshot.exists() ? (snapshot.data() as TDocument) : null;
};

export const saveFirestoreDocument = async <
  TDocument,
  TRuntime extends FirestoreDocumentRuntimePort,
>(
  runtime: TRuntime,
  resolveRef: FirestoreDocumentRefResolver<TRuntime>,
  value: TDocument,
  options?: SetOptions
): Promise<void> => {
  await ensureFirestoreRuntimeReady(runtime);
  if (options) {
    await setDoc(resolveRef(runtime), value as never, options);
    return;
  }
  await setDoc(resolveRef(runtime), value as never);
};

interface SubscribeToFirestoreDocumentInput<
  TDocument,
  TRuntime extends FirestoreDocumentRuntimePort,
> {
  runtime: TRuntime;
  resolveRef: FirestoreDocumentRefResolver<TRuntime>;
  onData: (value: TDocument | null) => void;
  onError: (error: unknown) => void;
  options?: SnapshotListenOptions;
}

export const subscribeToFirestoreDocument = <
  TDocument,
  TRuntime extends FirestoreDocumentRuntimePort,
>({
  runtime,
  resolveRef,
  onData,
  onError,
  options,
}: SubscribeToFirestoreDocumentInput<TDocument, TRuntime>): (() => void) => {
  let active = true;
  let unsubscribeSnapshot = () => {};

  void ensureFirestoreRuntimeReady(runtime)
    .then(() => {
      if (!active) {
        return;
      }

      const next = (snapshot: { exists: () => boolean; data: () => unknown }) => {
        onData(snapshot.exists() ? (snapshot.data() as TDocument) : null);
      };
      const error = (snapshotError: unknown) => {
        onError(snapshotError);
      };

      unsubscribeSnapshot = options
        ? onSnapshot(resolveRef(runtime), options, next, error)
        : onSnapshot(resolveRef(runtime), next, error);
    })
    .catch(error => {
      onError(error);
    });

  return () => {
    active = false;
    unsubscribeSnapshot();
  };
};
