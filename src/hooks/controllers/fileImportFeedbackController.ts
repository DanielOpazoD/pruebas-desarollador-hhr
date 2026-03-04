import type { JsonImportResult } from '@/services/exporters/exportImportJson';

type NotificationChannel = 'success' | 'warning' | 'error';

export interface ImportNotification {
  channel: NotificationChannel;
  title: string;
  message?: string;
}

export const buildJsonImportNotifications = (result: JsonImportResult): ImportNotification[] => {
  if (!result.success) {
    return [{ channel: 'error', title: 'Error al importar datos', message: 'Import Error' }];
  }

  const notifications: ImportNotification[] = [
    {
      channel: 'success',
      title: 'Datos importados correctamente',
      message: `${result.importedCount} registro(s) importado(s).`,
    },
  ];

  if (result.repairedCount > 0) {
    notifications.push({
      channel: 'warning',
      title: 'Se corrigieron datos heredados',
      message: `${result.repairedCount} registro(s) fueron reparados automáticamente durante la importación.`,
    });
  }

  if (result.skippedEntries.length > 0) {
    notifications.push({
      channel: 'error',
      title: 'Algunos registros no se importaron',
      message: result.skippedEntries.slice(0, 5).join(', '),
    });
  }

  return notifications;
};
