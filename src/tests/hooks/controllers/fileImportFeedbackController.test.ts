import { describe, expect, it } from 'vitest';
import { buildJsonImportNotifications } from '@/hooks/controllers/fileImportFeedbackController';

describe('fileImportFeedbackController', () => {
  it('builds success, repair and skipped notifications', () => {
    const notifications = buildJsonImportNotifications({
      success: true,
      importedCount: 3,
      repairedCount: 1,
      skippedEntries: ['2026-03-01', '2026-03-02'],
    });

    expect(notifications).toEqual([
      {
        channel: 'success',
        title: 'Datos importados correctamente',
        message: '3 registro(s) importado(s).',
      },
      {
        channel: 'warning',
        title: 'Se corrigieron datos heredados',
        message: '1 registro(s) fueron reparados automáticamente durante la importación.',
      },
      {
        channel: 'error',
        title: 'Algunos registros no se importaron',
        message: '2026-03-01, 2026-03-02',
      },
    ]);
  });
});
