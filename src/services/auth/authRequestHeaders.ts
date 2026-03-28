import { type AuthRuntime, defaultAuthRuntime } from '@/services/firebase-runtime/authRuntime';

interface AuthRuntimeOptions {
  authRuntime?: AuthRuntime;
}

const resolveAuthRuntime = ({ authRuntime }: AuthRuntimeOptions = {}): AuthRuntime =>
  authRuntime ?? defaultAuthRuntime;

export const resolveCurrentUserBearerToken = async (
  options?: AuthRuntimeOptions
): Promise<string | null> => {
  const authRuntime = resolveAuthRuntime(options);
  await authRuntime.ready;

  const currentUser = authRuntime.getCurrentUser();
  if (!currentUser || currentUser.isAnonymous) {
    return null;
  }

  return currentUser.getIdToken();
};

export const resolveCurrentUserAuthHeaders = async (
  options?: AuthRuntimeOptions
): Promise<Record<string, string>> => {
  const token = await resolveCurrentUserBearerToken(options);
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};
