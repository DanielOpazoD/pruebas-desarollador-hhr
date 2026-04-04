import type { Worksheet } from 'exceljs';

import { formatDateDDMMYYYY } from '@/services/exporters/excel/formatters';

import type { UpcPatientPresentation } from './censusHiddenSheetsContracts';
import {
  applyHeaderRow,
  getExcelColumnName,
  setMergedTitle,
  setRowFill,
} from './censusHiddenSheetsExcelHelpers';
import { solidFill, THIN_BORDER, toArgb } from './censusHiddenSheetsStyles';

export interface RenderUpcSheetInput {
  sheet: Worksheet;
  patients: UpcPatientPresentation[];
  monthName: string;
  year: string;
}

export interface RenderUpcDailyMatrixSheetInput extends RenderUpcSheetInput {
  daysInMonth: number;
}

const UPC_HEADERS: Array<string | number> = [
  '#',
  'Paciente',
  'RUT',
  'Edad',
  'Diagnóstico',
  'Especialidad',
  'Cama / Historial',
  'F. Ingreso',
  'Días UPC',
  'Detalle Días UPC',
  'Cambio Cama',
];

const renderUpcPatientRow = (sheet: Worksheet, patient: UpcPatientPresentation, index: number) => {
  const row = sheet.getRow(5 + index);
  row.values = [
    index + 1,
    patient.patientName,
    patient.rut,
    patient.age,
    patient.diagnosis,
    patient.specialty,
    patient.history,
    formatDateDDMMYYYY(patient.admissionDate),
    patient.totalDays,
    patient.daysDetail,
    patient.changedBed ? 'Sí' : 'No',
  ];
  setRowFill(row, 1, 11, index % 2 === 0 ? '#FFF2CC' : '#FFFFFF');
  row.height = Math.max(30, patient.totalDays * 15);

  row.eachCell((cell, colNumber) => {
    cell.border = THIN_BORDER;
    cell.font = { name: 'Arial', size: 10 };
    cell.alignment = {
      horizontal: [2, 5, 7, 10].includes(colNumber) ? 'left' : 'center',
      vertical: 'middle',
      wrapText: [5, 7, 10].includes(colNumber),
    };
  });
  row.getCell(2).font = { name: 'Arial', size: 10, bold: true };

  if (patient.changedBed) {
    const alertFont = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: toArgb('#C00000') },
    };
    row.getCell(7).font = alertFont;
    row.getCell(11).font = alertFont;
  }
};

export const renderUpcPatientsSheet = ({
  sheet,
  patients,
  monthName,
  year,
}: RenderUpcSheetInput) => {
  sheet.columns = [
    { width: 5 },
    { width: 32 },
    { width: 16 },
    { width: 8 },
    { width: 38 },
    { width: 18 },
    { width: 28 },
    { width: 14 },
    { width: 10 },
    { width: 22 },
    { width: 14 },
  ];

  setMergedTitle({
    sheet,
    range: 'A1:K1',
    value: `REGISTRO PACIENTES UPC — HOSPITAL HANGA ROA — ${monthName} ${year}`,
    font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: solidFill('#7B2D26'),
    rowHeight: 30,
  });
  setMergedTitle({
    sheet,
    range: 'A2:K2',
    value: `Pacientes con indicación UPC durante el período (total: ${patients.length})`,
    font: { name: 'Arial', size: 10, italic: true, color: { argb: toArgb('#C00000') } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  });

  applyHeaderRow({
    row: sheet.getRow(4),
    values: UPC_HEADERS,
    fill: solidFill('#7B2D26'),
    rowHeight: 36,
  });

  patients.forEach((patient, index) => {
    renderUpcPatientRow(sheet, patient, index);
  });

  sheet.views = [{ state: 'frozen', ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }];
};

const renderUpcDailyMatrixRow = (
  row: ReturnType<Worksheet['getRow']>,
  patient: UpcPatientPresentation,
  daysInMonth: number
) => {
  row.getCell(1).value = patient.patientName;
  row.getCell(1).font = { name: 'Arial', size: 10, bold: true };
  row.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  row.getCell(1).border = THIN_BORDER;

  const bedByDay = new Map(
    patient.dailyBeds.map(item => [Number(item.date.split('-')[2]), item.bedCode])
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = row.getCell(day + 1);
    const bedCode = bedByDay.get(day) || '';
    cell.value = bedCode;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (bedCode) {
      cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = solidFill('#C00000');
    } else {
      cell.fill = solidFill('#F2F2F2');
    }
  }

  const totalCell = row.getCell(daysInMonth + 2);
  totalCell.value = patient.totalDays;
  totalCell.font = { name: 'Arial', size: 10, bold: true };
  totalCell.fill = solidFill('#FFF2CC');
  totalCell.border = THIN_BORDER;
  totalCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const historyCell = row.getCell(daysInMonth + 3);
  historyCell.value = patient.history;
  historyCell.font = patient.changedBed
    ? { name: 'Arial', size: 10, bold: true, color: { argb: toArgb('#C00000') } }
    : { name: 'Arial', size: 10, color: { argb: toArgb('#333333') } };
  historyCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  historyCell.border = THIN_BORDER;

  row.height = 22;
};

export const renderUpcDailyMatrixSheet = ({
  sheet,
  patients,
  monthName,
  year,
  daysInMonth,
}: RenderUpcDailyMatrixSheetInput) => {
  const lastColumnIndex = daysInMonth + 3;
  const lastColumnLetter = getExcelColumnName(lastColumnIndex);

  sheet.columns = [
    { width: 30 },
    ...new Array(daysInMonth).fill(null).map(() => ({ width: 5.5 })),
    { width: 7 },
    { width: 28 },
  ];

  setMergedTitle({
    sheet,
    range: `A1:${lastColumnLetter}1`,
    value: `DETALLE DIARIO — PRESENCIA UPC POR PACIENTE — ${monthName} ${year}`,
    font: { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: solidFill('#7B2D26'),
    rowHeight: 30,
  });
  setMergedTitle({
    sheet,
    range: `A2:${lastColumnLetter}2`,
    value:
      'Cada celda roja indica que el paciente estuvo catalogado como UPC ese día. La sigla indica la cama asignada.',
    font: { name: 'Arial', size: 9, italic: true, color: { argb: toArgb('#7B2D26') } },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
  });

  applyHeaderRow({
    row: sheet.getRow(4),
    values: [
      'Paciente',
      ...new Array(daysInMonth).fill(null).map((_, index) => index + 1),
      'Total',
      'Camas',
    ],
    fill: solidFill('#7B2D26'),
    fontSize: 9,
  });

  patients.forEach((patient, index) => {
    renderUpcDailyMatrixRow(sheet.getRow(5 + index), patient, daysInMonth);
  });

  sheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 4, topLeftCell: 'B5', activeCell: 'B5' }];
};
