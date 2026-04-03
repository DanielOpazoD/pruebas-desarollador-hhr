export interface EpisodeObservedPatient {
  patientName?: string;
  rut?: string;
  admissionDate?: string;
  isBlocked?: boolean;
  clinicalCrib?: EpisodeObservedPatient;
}

export interface EpisodeAdmissionTracker {
  observeBed: (bed: EpisodeObservedPatient | undefined, recordDate: string) => void;
  resolveAdmissionDate: (rut?: string, fallbackAdmissionDate?: string) => string | undefined;
  resolveEpisodeStartDate: (rut?: string, fallbackAdmissionDate?: string) => string | undefined;
  closeEpisode: (rut?: string) => void;
}

export function createEpisodeAdmissionTracker(): EpisodeAdmissionTracker;
