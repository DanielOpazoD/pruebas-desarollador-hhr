export interface FirestoreReadyRuntimePort {
  ready?: Promise<void>;
}

export const ensureFirestoreRuntimeReady = async (
  runtime: FirestoreReadyRuntimePort
): Promise<void> => {
  if (runtime.ready) {
    await runtime.ready;
  }
};

export const runWithFirestoreRuntime = async <TRuntime extends FirestoreReadyRuntimePort, TResult>(
  runtime: TRuntime,
  operation: () => Promise<TResult>
): Promise<TResult> => {
  await ensureFirestoreRuntimeReady(runtime);
  return operation();
};
