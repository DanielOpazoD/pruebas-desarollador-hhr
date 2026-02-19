import type { Workbook } from 'exceljs';

import { getRecordForDate } from '../dataService';
import { getAllRecords } from '../storage/indexedDBService';
import {
  buildCensusDailyRawWorkbook,
  extractRowsFromRecord,
  getCensusRawHeader,
} from './censusRawWorkbook';
import { BEDS } from '@/constants';
import { createWorkbook } from './excelUtils';

// --- UTILS ---

const saveWorkbook = async (workbook: Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const { saveAs } = await import('file-saver');
  saveAs(blob, filename + '.xlsx');
};

const applyCensusRawFormatting = (worksheet: ReturnType<Workbook['addWorksheet']>) => {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F4C81' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 22;

  worksheet.columns.forEach(column => {
    column.width = Math.min(Math.max((column.header?.toString().length || 12) + 2, 12), 36);
  });
};

// --- EXPORT FUNCTIONS ---

export const generateCensusDailyRaw = async (date: string) => {
  const record = await getRecordForDate(date);
  if (!record) {
    alert('No hay datos para la fecha seleccionada.');
    return;
  }

  const workbook = await buildCensusDailyRawWorkbook(record);

  await saveWorkbook(workbook, `Censo_HangaRoa_Bruto_${date}`);
};

export const generateCensusRangeRaw = async (startDate: string, endDate: string) => {
  const allRecords = await getAllRecords();
  // Filter dates within range (inclusive)
  const dates = Object.keys(allRecords)
    .filter(d => d >= startDate && d <= endDate)
    .sort();

  if (dates.length === 0) {
    alert('No hay registros en el rango de fechas seleccionado.');
    return;
  }

  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet('Datos Brutos');

  sheet.addRow(getCensusRawHeader());

  dates.forEach(date => {
    const record = allRecords[date];
    const rows = extractRowsFromRecord(record);
    rows.forEach(r => sheet.addRow(r));
  });

  await saveWorkbook(workbook, `Censo_HangaRoa_Rango_${startDate}_${endDate}`);
};

export const generateCensusMonthRaw = async (year: number, month: number) => {
  // Construct range YYYY-MM-01 to YYYY-MM-31
  const mStr = String(month + 1).padStart(2, '0');
  const startDate = `${year}-${mStr}-01`;
  const endDate = `${year}-${mStr}-31`; // Loose end date covers full month

  await generateCensusRangeRaw(startDate, endDate);
};

// --- PLACEHOLDERS FOR FORMATTED REPORTS ---

export const generateCensusDailyFormatted = async (date: string) => {
  const record = await getRecordForDate(date);
  if (!record) {
    alert('No hay datos para la fecha seleccionada.');
    return;
  }

  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet('Censo Formateado');
  sheet.addRow(getCensusRawHeader());

  const rows = extractRowsFromRecord(record);
  rows.forEach(row => sheet.addRow(row));

  applyCensusRawFormatting(sheet);
  await saveWorkbook(workbook, `Censo_HangaRoa_Formateado_${date}`);
};

export const generateCensusRangeFormatted = async (startDate: string, endDate: string) => {
  const allRecords = await getAllRecords();
  const dates = Object.keys(allRecords)
    .filter(d => d >= startDate && d <= endDate)
    .sort();

  if (dates.length === 0) {
    alert('No hay registros en el rango de fechas seleccionado.');
    return;
  }

  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet('Censo Formateado');
  sheet.addRow(getCensusRawHeader());

  dates.forEach(date => {
    const rows = extractRowsFromRecord(allRecords[date]);
    rows.forEach(row => sheet.addRow(row));
  });

  applyCensusRawFormatting(sheet);
  await saveWorkbook(workbook, `Censo_HangaRoa_Formateado_${startDate}_${endDate}`);
};

// --- CUDYR EXPORTS ---

export const generateCudyrDailyRaw = async (date: string) => {
  const record = await getRecordForDate(date);
  if (!record) {
    alert('Sin datos');
    return;
  }

  const workbook = await createWorkbook();
  const sheet = workbook.addWorksheet('CUDYR Diario');

  sheet.addRow([
    'FECHA',
    'CAMA',
    'PACIENTE',
    'RUT',
    'PUNTAJE_TOTAL',
    'CATEGORIA',
    'DEPENDENCIA',
    'RIESGO',
  ]);

  BEDS.forEach(bed => {
    const p = record.beds[bed.id];
    if (p && p.patientName && p.cudyr) {
      // Simple sum for demo
      const total = Object.values(p.cudyr).reduce((a: number, b: number) => a + b, 0);
      sheet.addRow([
        date,
        bed.name,
        p.patientName,
        p.rut,
        total,
        total >= 19 ? 'C1' : 'C2', // Fake logic, normally calculated properly
        '?',
        '?',
      ]);
    }
  });

  await saveWorkbook(workbook, `CUDYR_${date}`);
};
