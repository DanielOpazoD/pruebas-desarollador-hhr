import { LEGACY_NURSES_DOC_PATHS, LEGACY_TENS_DOC_PATHS } from './legacyFirebasePaths';
import { getCatalogFromPaths } from './legacyFirebaseCatalogReads';

export const getLegacyNurseCatalog = async (): Promise<string[]> =>
  getCatalogFromPaths(LEGACY_NURSES_DOC_PATHS);

export const getLegacyTensCatalog = async (): Promise<string[]> =>
  getCatalogFromPaths(LEGACY_TENS_DOC_PATHS);
