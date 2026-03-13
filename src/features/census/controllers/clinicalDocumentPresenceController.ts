import { buildPatientPresenceSnapshot } from '@/application/patient-flow/clinicalEpisode';
import type { OccupiedBedRow } from '@/features/census/types/censusTableTypes';

type ClinicalDocumentPresenceRecord = {
  status: string;
  episodeKey: string;
};

export interface BedEpisodeBinding {
  bedId: string;
  episodeKey: string;
}

export const buildBedEpisodeBindings = (occupiedRows: OccupiedBedRow[]): BedEpisodeBinding[] =>
  occupiedRows
    .filter(row => !row.isSubRow)
    .flatMap(row => {
      const snapshot = buildPatientPresenceSnapshot(row.data, row.bed.id);
      if (!snapshot) {
        return [];
      }

      return [
        {
          bedId: snapshot.bedId,
          episodeKey: snapshot.episodeKey,
        },
      ];
    });

export const buildActiveClinicalDocumentEpisodeKeys = (
  records: ClinicalDocumentPresenceRecord[] | undefined
): Set<string> =>
  new Set(
    (records || []).filter(record => record.status !== 'archived').map(record => record.episodeKey)
  );

export const buildClinicalDocumentPresenceByBed = (
  bindings: BedEpisodeBinding[],
  activeEpisodeKeys: Set<string>
): Record<string, boolean> => {
  const next: Record<string, boolean> = {};

  bindings.forEach(binding => {
    next[binding.bedId] = activeEpisodeKeys.has(binding.episodeKey);
  });

  return next;
};
