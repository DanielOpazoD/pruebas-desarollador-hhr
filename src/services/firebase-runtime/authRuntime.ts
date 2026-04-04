import type { Auth, User } from 'firebase/auth';
import {
  defaultFirebaseConfigRuntimeAdapter,
  type FirebaseConfigRuntimeAdapter,
} from '@/services/firebase-runtime/firebaseConfigRuntimeAdapter';

export interface AuthRuntime {
  auth: Auth;
  ready: Promise<unknown>;
  getCurrentUser: () => User | null;
}

export const createAuthRuntime = (
  adapter: FirebaseConfigRuntimeAdapter = defaultFirebaseConfigRuntimeAdapter
): AuthRuntime => ({
  get auth() {
    return adapter.getAuth();
  },
  ready: adapter.ready,
  getCurrentUser: () => adapter.getOptionalAuth()?.currentUser ?? null,
});

export const defaultAuthRuntime: AuthRuntime = createAuthRuntime();
