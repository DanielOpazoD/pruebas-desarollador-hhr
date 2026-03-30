import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeExportHandoffPdf } from '@/application/backup-export/backupExportArchiveUseCases';

describe('backupExportArchiveUseCases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the browser print dialog for local handoff exports', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    const outcome = await executeExportHandoffPdf({
      record: {
        date: '2026-03-29',
      } as never,
      selectedShift: 'day',
      isMedical: false,
    });

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe('success');
  });

  it('fails gracefully when there is no record to print', async () => {
    const outcome = await executeExportHandoffPdf({
      record: null,
      selectedShift: 'day',
    });

    expect(outcome.status).toBe('failed');
  });
});
