const UPC_ELIGIBLE_BED_IDS = new Set(['R1', 'R2', 'R3', 'R4', 'NEO1', 'NEO2']);

export const isUpcEligibleBedId = (bedId?: string | null): boolean =>
  Boolean(bedId && UPC_ELIGIBLE_BED_IDS.has(bedId));

export const resolveNormalizedUpcFlag = (
  bedId: string | undefined | null,
  isUPC: boolean | undefined | null
): boolean => isUpcEligibleBedId(bedId) && Boolean(isUPC);

export const normalizePatientUpcForBed = <T extends { bedId?: string; isUPC?: boolean }>(
  patient: T,
  bedId: string
): T => {
  const normalizedIsUpc = resolveNormalizedUpcFlag(bedId, patient.isUPC);
  if (patient.bedId === bedId && Boolean(patient.isUPC) === normalizedIsUpc) {
    return patient;
  }

  return {
    ...patient,
    bedId,
    isUPC: normalizedIsUpc,
  };
};
