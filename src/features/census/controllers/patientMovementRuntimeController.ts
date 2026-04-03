import { createCensusDialogRuntime } from '@/features/census/controllers/censusBrowserRuntimeAdapter';
import { patientMovementRuntimeLogger } from '@/hooks/controllers/hookControllerLoggers';

export interface PatientMovementRuntime {
  alert: (message: string) => void;
  warn?: (message: string) => void;
}

const censusDialogRuntime = createCensusDialogRuntime();

export const patientMovementBrowserRuntime: PatientMovementRuntime = {
  alert: (message: string) => {
    censusDialogRuntime.alert(message);
  },
  warn: (message: string) => {
    patientMovementRuntimeLogger.warn(message);
  },
};
