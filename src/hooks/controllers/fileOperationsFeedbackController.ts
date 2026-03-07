export interface FileOperationNotification {
  channel: 'success' | 'error';
  title: string;
  message?: string;
}

export const buildExportJsonNotification = (
  outcome: 'success' | 'error'
): FileOperationNotification =>
  outcome === 'success'
    ? {
        channel: 'success',
        title: 'JSON exportado',
        message: 'Se generó el respaldo JSON correctamente.',
      }
    : {
        channel: 'error',
        title: 'Exportación fallida',
        message: 'No se pudo generar el respaldo JSON.',
      };

export const buildExportCsvNotification = (
  outcome: 'success' | 'error'
): FileOperationNotification =>
  outcome === 'success'
    ? {
        channel: 'success',
        title: 'CSV exportado',
        message: 'Se generó el archivo CSV correctamente.',
      }
    : {
        channel: 'error',
        title: 'Exportación fallida',
        message: 'No se pudo generar el archivo CSV.',
      };

export const buildImportFileErrorNotification = (
  reason: 'invalid_format' | 'import_failed' | 'processing_failed'
): FileOperationNotification => {
  switch (reason) {
    case 'invalid_format':
      return {
        channel: 'error',
        title: 'Formato no compatible',
        message: 'Selecciona un archivo .json válido.',
      };
    case 'processing_failed':
      return {
        channel: 'error',
        title: 'Importación fallida',
        message: 'No se pudo procesar el archivo seleccionado.',
      };
    default:
      return {
        channel: 'error',
        title: 'Importación fallida',
        message: 'No se pudieron importar los datos.',
      };
  }
};
