import type { Workbook } from 'exceljs';

import { validateExcelExport, XLSX_MIME_TYPE } from './excelValidation';

export interface DownloadWorkbookOptions {
  workbook: Workbook;
  filename: string;
  invalidAlertMessage?: string;
  successLogMessage?: (byteLength: number) => string;
}

export const downloadWorkbookFile = async ({
  workbook,
  filename,
  invalidAlertMessage,
  successLogMessage,
}: DownloadWorkbookOptions): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const validation = validateExcelExport(buffer, filename);

  if (!validation.valid) {
    console.error(`❌ Validación de Excel fallida: ${validation.error}`);
    if (invalidAlertMessage) {
      alert(
        `${invalidAlertMessage}\n${validation.error}\n\nPor favor, recarga la página e intenta de nuevo.`
      );
      return;
    }
    throw new Error(validation.error || 'Archivo Excel inválido.');
  }

  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const { saveAs } = await import('file-saver');
  saveAs(blob, filename);

  if (successLogMessage) {
    console.warn(successLogMessage(buffer.byteLength));
  }
};
