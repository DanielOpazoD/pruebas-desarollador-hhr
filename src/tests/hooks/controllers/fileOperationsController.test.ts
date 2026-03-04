import { describe, expect, it } from 'vitest';
import {
  isJsonImportFile,
  shouldRefreshAfterJsonImport,
} from '@/hooks/controllers/fileOperationsController';

describe('fileOperationsController', () => {
  it('recognizes valid json import files', () => {
    expect(isJsonImportFile(new File(['{}'], 'backup.json'))).toBe(true);
    expect(isJsonImportFile(new File(['x'], 'backup.txt'))).toBe(false);
  });

  it('refreshes only after successful imports', () => {
    expect(
      shouldRefreshAfterJsonImport({
        success: true,
        importedCount: 1,
        repairedCount: 0,
        skippedEntries: [],
      })
    ).toBe(true);
    expect(
      shouldRefreshAfterJsonImport({
        success: false,
        importedCount: 0,
        repairedCount: 0,
        skippedEntries: [],
      })
    ).toBe(false);
  });
});
