import {
  createDegradedNotice,
  type OperationalNotice,
} from '@/shared/feedback/operationalNoticePolicy';

const STORAGE_AUTO_RECOVERY_KEY = 'hhr_storage_auto_recovery_attempted_v1';
const STORAGE_PERSISTENT_FALLBACK_COUNT_KEY = 'hhr_storage_persistent_fallback_count_v1';
export const STORAGE_FALLBACK_UI_DELAY_MS = 12_000;

export type StorageFallbackUiCopy = {
  title: string;
  summary: string;
  detail: string;
  primaryActionLabel: string;
  advancedActionLabel: string;
};

export const getStorageAutoRecoveryKey = (): string => STORAGE_AUTO_RECOVERY_KEY;
export const getStoragePersistentFallbackCountKey = (): string =>
  STORAGE_PERSISTENT_FALLBACK_COUNT_KEY;

export const getStorageFallbackUiDelayMs = (): number => STORAGE_FALLBACK_UI_DELAY_MS;

export const hasAttemptedStorageAutoRecovery = (): boolean => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }

  return window.sessionStorage.getItem(STORAGE_AUTO_RECOVERY_KEY) === 'true';
};

export const markStorageAutoRecoveryAttempted = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.setItem(STORAGE_AUTO_RECOVERY_KEY, 'true');
};

export const clearStorageAutoRecoveryAttempt = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_AUTO_RECOVERY_KEY);
  window.sessionStorage.removeItem(STORAGE_PERSISTENT_FALLBACK_COUNT_KEY);
};

export const getStoragePersistentFallbackCount = (): number => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return 0;
  }

  const raw = window.sessionStorage.getItem(STORAGE_PERSISTENT_FALLBACK_COUNT_KEY);
  const parsed = Number(raw || '0');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const markStoragePersistentFallbackObserved = (): void => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return;
  }

  const nextCount = getStoragePersistentFallbackCount() + 1;
  window.sessionStorage.setItem(STORAGE_PERSISTENT_FALLBACK_COUNT_KEY, String(nextCount));
};

export const shouldAttemptStorageAutoRecovery = (isFallback: boolean): boolean =>
  isFallback && !hasAttemptedStorageAutoRecovery();

export const shouldShowStorageFallbackUi = (isFallback: boolean): boolean =>
  isFallback && hasAttemptedStorageAutoRecovery() && getStoragePersistentFallbackCount() >= 1;

export const getStorageFallbackUiCopy = (): StorageFallbackUiCopy => ({
  title: 'Guardado local limitado',
  summary:
    'La app sigue funcionando. Si acabas de borrar datos del sitio, recargar una vez suele resolverlo.',
  detail:
    'Esto suele pasar cuando el navegador acaba de limpiar o bloquear temporalmente el guardado local. Normalmente basta con recargar una vez. Solo si el aviso aparece varias veces seguidas conviene reiniciar el guardado local de esta app.',
  primaryActionLabel: 'Recargar',
  advancedActionLabel: 'Reiniciar guardado local',
});

export const getStorageFallbackNotice = (): OperationalNotice => {
  const copy = getStorageFallbackUiCopy();
  return createDegradedNotice(copy.title, copy.summary);
};
