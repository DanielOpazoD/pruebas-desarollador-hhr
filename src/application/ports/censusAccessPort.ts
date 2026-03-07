import { logAccess } from '@/services/census/censusAccessService';
import type { CensusAccessLog } from '@/types/censusAccess';

export interface CensusAccessPort {
  logAccess: (config: Omit<CensusAccessLog, 'id' | 'timestamp'>) => Promise<void>;
}

export const defaultCensusAccessPort: CensusAccessPort = {
  logAccess: async config => logAccess(config),
};
