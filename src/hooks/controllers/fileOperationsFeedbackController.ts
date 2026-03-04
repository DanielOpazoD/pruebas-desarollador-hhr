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
        title: 'Datos exportados exitosamente',
        message: 'Export JSON',
      }
    : {
        channel: 'error',
        title: 'Error al exportar datos',
        message: 'Export Error',
      };

export const buildExportCsvNotification = (
  outcome: 'success' | 'error'
): FileOperationNotification =>
  outcome === 'success'
    ? {
        channel: 'success',
        title: 'CSV exportado exitosamente',
        message: 'Export CSV',
      }
    : {
        channel: 'error',
        title: 'Error al exportar CSV',
        message: 'Export Error',
      };

export const buildImportFileErrorNotification = (
  reason: 'invalid_format' | 'import_failed' | 'processing_failed'
): FileOperationNotification => {
  switch (reason) {
    case 'invalid_format':
      return {
        channel: 'error',
        title: 'Por favor seleccione un archivo .json válido',
        message: 'Formato Inválido',
      };
    case 'processing_failed':
      return {
        channel: 'error',
        title: 'Error al procesar archivo',
        message: 'Import Error',
      };
    default:
      return {
        channel: 'error',
        title: 'Error al importar datos',
        message: 'Import Error',
      };
  }
};
