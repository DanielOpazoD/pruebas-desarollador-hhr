import type { RowMenuAlign } from '@/features/census/components/patient-row/patientRowContracts';
import { resolveIsNewAdmissionForRecord } from '@/features/census/controllers/patientRowNewAdmissionIndicatorController';
import type { CensusTableResolvedOccupiedRow } from '@/features/census/types/censusTableComponentContracts';
import type { OccupiedBedRow } from '@/features/census/types/censusTableTypes';

const MENU_ALIGN_BOTTOM_THRESHOLD = 4;

export const resolvePatientRowMenuAlign = (index: number, totalRows: number): RowMenuAlign => {
  return index >= totalRows - MENU_ALIGN_BOTTOM_THRESHOLD ? 'bottom' : 'top';
};

export const shouldRenderEmptyBedsDivider = (emptyBedsCount: number): boolean => emptyBedsCount > 0;

interface BuildResolvedOccupiedRowsParams {
  occupiedRows: OccupiedBedRow[];
  currentDateString: string;
  clinicalDocumentPresenceByBedId: Record<string, boolean>;
}

export const buildResolvedOccupiedRows = ({
  occupiedRows,
  currentDateString,
  clinicalDocumentPresenceByBedId,
}: BuildResolvedOccupiedRowsParams): CensusTableResolvedOccupiedRow[] =>
  occupiedRows.map((row, index) => ({
    row,
    actionMenuAlign: resolvePatientRowMenuAlign(index, occupiedRows.length),
    indicators: {
      hasClinicalDocument: !row.isSubRow && Boolean(clinicalDocumentPresenceByBedId[row.bed.id]),
      isNewAdmission:
        !row.isSubRow &&
        resolveIsNewAdmissionForRecord({
          recordDate: currentDateString,
          admissionDate: row.data.admissionDate,
          admissionTime: row.data.admissionTime,
        }),
    },
  }));
