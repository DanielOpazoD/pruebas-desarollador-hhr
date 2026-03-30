import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeExportHandoffPdf } from '@/application/backup-export/backupExportArchiveUseCases';

const generateHandoffPdf = vi.fn();

vi.mock('@/services/pdf/handoffPdfGenerator', () => ({
  generateHandoffPdf,
}));

describe('backupExportArchiveUseCases', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    generateHandoffPdf.mockReset();
  });

  it('generates the paginated handoff PDF for local exports', async () => {
    const outcome = await executeExportHandoffPdf({
      record: {
        date: '2026-03-29',
        handoffNovedadesDayShift: '',
        handoffNovedadesNightShift: '',
      } as never,
      selectedShift: 'day',
      isMedical: false,
    });

    expect(generateHandoffPdf).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-03-29' }),
      false,
      'day',
      expect.any(Object)
    );
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
