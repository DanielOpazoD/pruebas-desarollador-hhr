import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildClinicalEpisodeKey } from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import type { OccupiedBedRow } from '@/features/census/types/censusTableTypes';
import { ClinicalDocumentRepository } from '@/services/repositories/ClinicalDocumentRepository';

interface UseClinicalDocumentPresenceByBedParams {
  occupiedRows: OccupiedBedRow[];
  currentDateString: string;
}

interface BedEpisodeBinding {
  bedId: string;
  episodeKey: string;
}

const buildBedEpisodeBindings = (occupiedRows: OccupiedBedRow[]): BedEpisodeBinding[] =>
  occupiedRows
    .filter(row => !row.isSubRow)
    .flatMap(row => {
      const patientRut = row.data.rut?.trim();
      const admissionDate = row.data.admissionDate?.trim();
      if (!patientRut || !admissionDate) {
        return [];
      }

      return [
        {
          bedId: row.bed.id,
          episodeKey: buildClinicalEpisodeKey(patientRut, admissionDate),
        },
      ];
    });

const buildPresenceMap = (
  bindings: BedEpisodeBinding[],
  activeEpisodeKeys: Set<string>
): Record<string, boolean> => {
  const next: Record<string, boolean> = {};
  bindings.forEach(binding => {
    next[binding.bedId] = activeEpisodeKeys.has(binding.episodeKey);
  });
  return next;
};

export const useClinicalDocumentPresenceByBed = ({
  occupiedRows,
  currentDateString,
}: UseClinicalDocumentPresenceByBedParams): Record<string, boolean> => {
  const bindings = useMemo(() => buildBedEpisodeBindings(occupiedRows), [occupiedRows]);
  const episodeKeys = useMemo(
    () => Array.from(new Set(bindings.map(binding => binding.episodeKey))).sort(),
    [bindings]
  );

  const query = useQuery({
    queryKey: ['clinicalDocuments', 'presenceByBed', currentDateString, ...episodeKeys],
    enabled: episodeKeys.length > 0,
    queryFn: async () => ClinicalDocumentRepository.listByEpisodeKeys(episodeKeys),
    staleTime: 30 * 1000,
    refetchInterval: 45 * 1000,
  });

  return useMemo(() => {
    if (bindings.length === 0) {
      return {};
    }

    const activeEpisodeKeys = new Set(
      (query.data || [])
        .filter(document => document.status !== 'archived')
        .map(document => document.episodeKey)
    );

    return buildPresenceMap(bindings, activeEpisodeKeys);
  }, [bindings, query.data]);
};
