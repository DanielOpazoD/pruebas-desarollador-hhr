import type {
  EpisodeAdmissionTracker,
  EpisodeObservedPatient,
} from '../../../../functions/lib/minsal/sharedEpisodeAdmissionTracker.js';
import { createEpisodeAdmissionTracker } from 'virtual:minsal-shared-episode-tracker';

export type { EpisodeAdmissionTracker, EpisodeObservedPatient };
export { createEpisodeAdmissionTracker };
