import { describe, expect, it } from 'vitest';
import { buildJsonImportNotifications } from '@/hooks/controllers/fileImportFeedbackController';

describe('fileImportFeedbackController', () => {
  it('builds success, repair and skipped notifications', () => {
    const notifications = buildJsonImportNotifications({
      success: true,
      outcome: 'partial',
      importedCount: 3,
      repairedCount: 1,
      skippedEntries: ['2026-03-01', '2026-03-02'],
    });

    expect(notifications).toEqual([
      {
        channel: 'warning',
        title: 'Importación completada con observaciones',
        message: '3 registro(s) importado(s), 1 reparado(s) y 2 omitido(s).',
      },
      {
        channel: 'error',
        title: 'Algunos registros no se importaron',
        message: '2026-03-01, 2026-03-02',
      },
    ]);
  });
});
