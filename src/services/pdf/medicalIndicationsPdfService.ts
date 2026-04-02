import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { openPdfPrintDialog } from '@/services/pdf/pdfBase';
import {
  MEDICAL_INDICATIONS_LINE_FIELD_NAMES,
  MEDICAL_INDICATIONS_PDF_COORDINATES,
  MEDICAL_INDICATIONS_PDF_TEMPLATE_PATH,
} from '@/services/pdf/medicalIndicationsPdfCoordinates';

const TEXT_COLOR = rgb(0, 0, 0);
const FONT_SIZE = 11;

export interface MedicalIndicationsPdfData {
  paciente_nombre: string;
  paciente_rut: string;
  paciente_diagnostico: string;
  paciente_edad: string;
  fecha_nacimiento: string;
  paciente_alergias: string;
  medicotratante: string;
  fecha_ingreso: string;
  fecha_actual: string;
  diasEstada: string;
  Reposoindicacion: string;
  Regimenindicacion: string;
  Kinemotora: string;
  Kinerespiratoria: string;
  Kinecantidadvecesdia: string;
  Pendientes: string;
  indicaciones: string[];
}

const drawFieldText = (
  page: import('pdf-lib').PDFPage,
  font: import('pdf-lib').PDFFont,
  variableName: keyof typeof MEDICAL_INDICATIONS_PDF_COORDINATES,
  value: string
): void => {
  if (!value.trim()) return;

  const coords = MEDICAL_INDICATIONS_PDF_COORDINATES[variableName];
  page.drawText(value.trim(), {
    x: coords.x,
    y: coords.y,
    size: FONT_SIZE,
    font,
    color: TEXT_COLOR,
    maxWidth: coords.width,
  });
};

export const fillMedicalIndicationsPdf = async (
  data: MedicalIndicationsPdfData
): Promise<Uint8Array> => {
  const templateResponse = await fetch(MEDICAL_INDICATIONS_PDF_TEMPLATE_PATH);
  const templateBytes = await templateResponse.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  drawFieldText(page, font, 'paciente_nombre', data.paciente_nombre);
  drawFieldText(page, font, 'paciente_rut', data.paciente_rut);
  drawFieldText(page, font, 'paciente_diagnostico', data.paciente_diagnostico);
  drawFieldText(page, font, 'paciente_edad', data.paciente_edad);
  drawFieldText(page, font, 'fecha_nacimiento', data.fecha_nacimiento);
  drawFieldText(page, font, 'paciente_alergias', data.paciente_alergias);
  drawFieldText(page, font, 'medicotratante', data.medicotratante);
  drawFieldText(page, font, 'fecha_ingreso', data.fecha_ingreso);
  drawFieldText(page, font, 'fecha_actual', data.fecha_actual);
  drawFieldText(page, font, 'diasEstada', data.diasEstada);
  drawFieldText(page, font, 'Reposoindicacion', data.Reposoindicacion);
  drawFieldText(page, font, 'Regimenindicacion', data.Regimenindicacion);
  drawFieldText(page, font, 'Kinemotora', data.Kinemotora);
  drawFieldText(page, font, 'Kinerespiratoria', data.Kinerespiratoria);
  drawFieldText(page, font, 'Kinecantidadvecesdia', data.Kinecantidadvecesdia);
  drawFieldText(page, font, 'Pendientes', data.Pendientes);

  data.indicaciones
    .slice(0, MEDICAL_INDICATIONS_LINE_FIELD_NAMES.length)
    .forEach((value, index) => {
      const variableName = MEDICAL_INDICATIONS_LINE_FIELD_NAMES[index];
      drawFieldText(page, font, variableName, value || '');
    });

  return pdfDoc.save();
};

export const printMedicalIndicationsPdf = async (
  data: MedicalIndicationsPdfData
): Promise<void> => {
  const bytes = await fillMedicalIndicationsPdf(data);
  await openPdfPrintDialog(bytes, `indicaciones-medicas-${data.paciente_nombre || 'paciente'}.pdf`);
};
