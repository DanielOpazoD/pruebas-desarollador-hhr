import type { BedDefinition, BedType, PatientData } from '@/types/core';

export type DiagnosisMode = 'free' | 'cie10';

export interface OccupiedBedRow {
  id: string;
  bed: BedDefinition;
  data: PatientData;
  isSubRow: boolean;
}

export interface CensusBedRows {
  occupiedRows: OccupiedBedRow[];
  emptyBeds: BedDefinition[];
}

export type BedTypesById = Record<string, BedType>;
