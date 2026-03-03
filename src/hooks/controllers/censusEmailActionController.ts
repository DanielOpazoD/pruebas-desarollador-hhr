import type { CensusAccessRole } from '@/types/censusAccess';

export const canRunCensusEmailAction = (status: 'idle' | 'loading' | 'success' | 'error') =>
  status !== 'loading' && status !== 'success';

export const resolveShareLinkRole = (role?: CensusAccessRole): CensusAccessRole => role || 'viewer';

export const buildClipboardCopyMessage = (link: string): string =>
  `Copiado al portapapeles: ${link}`;
