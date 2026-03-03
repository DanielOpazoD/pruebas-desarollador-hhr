export type MedicalHandoffScope = 'all' | 'upc' | 'no-upc';

const VALID_SCOPES: MedicalHandoffScope[] = ['all', 'upc', 'no-upc'];

export const resolveMedicalHandoffScope = (
  rawScope: string | null | undefined
): MedicalHandoffScope => {
  if (rawScope && VALID_SCOPES.includes(rawScope as MedicalHandoffScope)) {
    return rawScope as MedicalHandoffScope;
  }

  return 'all';
};

export const buildMedicalHandoffSignatureLink = (
  origin: string,
  date: string,
  scope: MedicalHandoffScope
): string => `${origin}?mode=signature&date=${date}&scope=${scope}`;
