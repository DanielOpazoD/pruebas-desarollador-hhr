import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import { logger } from '@/services/utils/loggerService';

export interface PatientMovementRuntime {
  alert: (message: string) => void;
  warn?: (message: string) => void;
}

const patientMovementRuntimeLogger = logger.child('PatientMovementRuntime');

export const patientMovementBrowserRuntime: PatientMovementRuntime = {
  alert: (message: string) => {
    defaultBrowserWindowRuntime.alert(message);
  },
  warn: (message: string) => {
    patientMovementRuntimeLogger.warn(message);
  },
};
