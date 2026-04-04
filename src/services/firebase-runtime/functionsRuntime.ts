import type { Functions } from 'firebase/functions';
import {
  defaultFirebaseConfigRuntimeAdapter,
  type FirebaseConfigRuntimeAdapter,
} from '@/services/firebase-runtime/firebaseConfigRuntimeAdapter';

export interface FunctionsRuntime {
  ready: Promise<unknown>;
  getFunctions: () => Promise<Functions>;
}

export const createFunctionsRuntime = (
  adapter: FirebaseConfigRuntimeAdapter = defaultFirebaseConfigRuntimeAdapter
): FunctionsRuntime => ({
  ready: adapter.ready,
  getFunctions: () => adapter.getFunctions(),
});

export const defaultFunctionsRuntime: FunctionsRuntime = createFunctionsRuntime();
