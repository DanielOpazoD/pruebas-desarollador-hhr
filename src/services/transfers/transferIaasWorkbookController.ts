import type { Workbook } from 'exceljs';

import type { QuestionnaireResponse, TransferPatientData } from '@/types/transferDocuments';

import { getCurrentDate } from './documentGeneratorUtils';
import { getQuestionnaireResponseText } from './transferQuestionnaireResponseController';

export const populateTransferIaasWorkbook = (
  workbook: Workbook,
  patientData: TransferPatientData,
  responses: QuestionnaireResponse
): void => {
  const sheet = workbook.addWorksheet('Formulario IAAS');

  sheet.getColumn('A').width = 40;
  sheet.getColumn('B').width = 50;

  sheet.mergeCells('A1:B1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'HOSPITAL DEL SALVADOR - FORMULARIO IAAS';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  titleCell.alignment = { horizontal: 'center' };

  const dataRows = [
    ['Nombre:', patientData.patientName],
    ['Rut:', patientData.rut],
    ['Precauciones:', getQuestionnaireResponseText(responses, 'tipoPrecauciones') || 'Estándar'],
    ['Estudio Micro:', getQuestionnaireResponseText(responses, 'estudioMicrobiologico')],
    [
      'Resultados:',
      getQuestionnaireResponseText(responses, 'resultadosMicrobiologicos') || 'Pendientes',
    ],
    ['Fecha Emisión:', getCurrentDate()],
  ];

  dataRows.forEach(row => {
    const worksheetRow = sheet.addRow(row);
    worksheetRow.getCell(1).font = { bold: true };
  });
};
