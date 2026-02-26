/**
 * Imaging Request PDF Service — Solicitud de Imágenes
 *
 * Fills the official imaging request form template with patient data
 * using coordinate-based text injection (same pattern as ieehPdfService).
 *
 * COORDINATES SOURCE: User-provided JSON from PDF field mapping tool.
 * Template: public/docs/solicitud-imagen.pdf
 */

import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';
import { PatientData } from '@/types';

export interface CustomMark {
  x: number; // Percentage 0-100 from left
  y: number; // Percentage 0-100 from top
  text?: string; // Optional custom text to draw instead of an 'X'
}

// ── Template PDF paths ──
const SOLICITUD_TEMPLATE_PATH = '/docs/solicitud-imagen.pdf';
export const ENCUESTA_CONTRASTE_PATH = '/docs/encuesta-contraste.pdf';

// --- Constants ---
const FONT_SIZE = 10;
const TEXT_COLOR = rgb(0, 0, 0);

/**
 * PDF coordinate mapping for "Solicitud de Imágenes" form fields.
 * Y coordinates are from the BOTTOM of the page (PDF standard).
 * Extracted via PDF field mapping tool.
 */
const FIELD_COORDS = {
  // Patient name fields
  nombres: { x: 117.57, y: 766.71, maxWidth: 78.58 },
  primerApellido: { x: 201.1, y: 766.71, maxWidth: 69.16 },
  segundoApellido: { x: 275.46, y: 766.71, maxWidth: 88.68 },

  // RUT
  rut: { x: 60.47, y: 750.58, maxWidth: 135.01 },

  // Age
  edad: { x: 229.74, y: 750.58, maxWidth: 52.39 },

  // Birth date
  fechaNacimiento: { x: 472.95, y: 750.58, maxWidth: 88.68 },

  // Diagnosis
  diagnostico: { x: 131.64, y: 733.82, maxWidth: 206.24 },

  // Today's date (request date)
  fechaSolicitud: { x: 139.04, y: 786.2, maxWidth: 59.79 },

  // Requesting Physician
  medicoTratante: { x: 315.0, y: 108.0, maxWidth: 145.33 },
};

/**
 * Split a full name into components: [nombres, primerApellido, segundoApellido]
 */
const splitPatientName = (fullName: string | undefined): [string, string, string] => {
  if (!fullName) return ['', '', ''];
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], '', ''];
  if (parts.length === 2) return [parts[1], parts[0], ''];
  if (parts.length === 3) return [parts[2], parts[0], parts[1]];
  // 4+ parts: first two are apellidos, rest are nombres
  return [parts.slice(2).join(' '), parts[0], parts[1]];
};

/**
 * Format a date string to DD-MM-YYYY
 */
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, d] = dateStr.slice(0, 10).split('-');
    return `${d}-${m}-${y}`;
  }
  return dateStr;
};

/**
 * Calculate age from birthDate
 */
const calculateAge = (birthDate: string | undefined): string => {
  if (!birthDate) return '';
  try {
    const parts = birthDate.includes('-') ? birthDate.split('-') : [];
    let birth: Date;
    if (parts.length === 3 && parts[0].length === 4) {
      birth = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
    } else if (parts.length === 3 && parts[2].length === 4) {
      birth = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else {
      return '';
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} años`;
  } catch {
    return '';
  }
};

/**
 * Get today's date in DD-MM-YYYY format
 */
const getTodayFormatted = (): string => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

/**
 * Fill the imaging request form with patient data
 */
export const fillImagingRequestForm = async (
  patient: PatientData,
  requestingPhysician: string = '',
  marks: CustomMark[] = []
): Promise<Uint8Array> => {
  // 1. Load the template PDF
  const response = await fetch(SOLICITUD_TEMPLATE_PATH);
  const templateBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);

  // 2. Embed font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 3. Get page 1
  const page = pdfDoc.getPage(0);

  // Helper: draw text at coordinates
  const drawText = (text: string, coords: { x: number; y: number; maxWidth: number }) => {
    if (!text) return;
    const displayText = text.toUpperCase();

    // Truncate if too long
    let finalText = displayText;
    const textWidth = font.widthOfTextAtSize(displayText, FONT_SIZE);
    if (textWidth > coords.maxWidth) {
      // Truncate to fit
      let truncated = displayText;
      while (
        font.widthOfTextAtSize(truncated + '…', FONT_SIZE) > coords.maxWidth &&
        truncated.length > 0
      ) {
        truncated = truncated.slice(0, -1);
      }
      finalText = truncated + '…';
    }

    page.drawText(finalText, {
      x: coords.x,
      y: coords.y,
      size: FONT_SIZE,
      font,
      color: TEXT_COLOR,
    });
  };

  // 4. Extract patient data
  const [nombres, primerApellido, segundoApellido] = splitPatientName(patient.patientName);

  // 5. Fill fields
  drawText(nombres, FIELD_COORDS.nombres);
  drawText(primerApellido, FIELD_COORDS.primerApellido);
  drawText(segundoApellido, FIELD_COORDS.segundoApellido);
  drawText(patient.rut || '', FIELD_COORDS.rut);
  drawText(calculateAge(patient.birthDate), FIELD_COORDS.edad);
  drawText(formatDate(patient.birthDate), FIELD_COORDS.fechaNacimiento);

  // Diagnosis: Try pathology first, then cie10Description
  const diagValue = patient.pathology || patient.cie10Description || '';
  drawText(diagValue, FIELD_COORDS.diagnostico);

  drawText(getTodayFormatted(), FIELD_COORDS.fechaSolicitud);

  // Requesting Physician
  if (requestingPhysician) {
    drawText(requestingPhysician, FIELD_COORDS.medicoTratante);
  }

  // 6. Draw Custom 'X' or Text Marks
  marks.forEach(mark => {
    const xPos = page.getWidth() * (mark.x / 100);
    // PDF-lib Y is from bottom, so invert the percentage
    const yPos = page.getHeight() * (1 - mark.y / 100);

    if (mark.text) {
      page.drawText(mark.text.toUpperCase(), {
        x: xPos,
        y: yPos - 3, // slightly adjust to align nicely with typical click point
        size: FONT_SIZE, // FONT_SIZE is 10, same as standard text
        font,
        color: TEXT_COLOR,
      });
    } else {
      // The exact font size is 14.
      // We subtract roughly half the width/height to center the "X" exactly over the click point.
      // A 14pt Helvetica "X" is roughly 8pt wide and 10pt tall (ascender).
      page.drawText('X', {
        x: xPos - 4, // Center horizontally
        y: yPos - 4, // Center vertically
        size: 14,
        font,
        color: TEXT_COLOR,
      });
    }
  });

  // 7. Serialize
  const pdfBytes = await pdfDoc.save();
  return pdfBytes as unknown as Uint8Array;
};

/**
 * Download the filled imaging request form
 */
export const downloadImagingRequestForm = async (
  patient: PatientData,
  requestingPhysician: string = '',
  marks: CustomMark[] = []
): Promise<void> => {
  const pdfBytes = await fillImagingRequestForm(patient, requestingPhysician, marks);

  const patientName = patient.patientName || 'paciente';
  const safeName = patientName
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const suggestedName = `SolicitudImagen_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Try native Save As dialog (File System Access API)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (
        window as unknown as {
          showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(pdfBytes as unknown as FileSystemWriteChunkType);
      await writable.close();
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }

  // Fallback: classic download link
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate a Blob URL for the filled imaging request form
 * This is used for previewing the PDF in an iframe
 */
export const generateImagingRequestPreviewUrl = async (
  patient: PatientData,
  requestingPhysician: string = '',
  marks: CustomMark[] = []
): Promise<string> => {
  const pdfBytes = await fillImagingRequestForm(patient, requestingPhysician, marks);
  const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
};

/**
 * Print the official Solicitud de Imágenes by injecting an auto-print script
 * and opening it in a hidden iframe (or a new tab as fallback)
 */
export const printImagingRequestForm = async (
  patient: PatientData,
  requestingPhysician: string = '',
  marks: CustomMark[] = []
): Promise<void> => {
  // 1. Generate PDF exactly like `fillImagingRequestForm`
  const filledBytes = await fillImagingRequestForm(patient, requestingPhysician, marks);

  // 2. Reload to inject the print script securely
  const printDoc = await PDFDocument.load(filledBytes);
  printDoc.catalog.set(
    PDFName.of('OpenAction'),
    printDoc.context.obj({
      Type: 'Action',
      S: 'JavaScript',
      JS: 'this.print({bUI: true, bSilent: false, bShrinkToFit: true});',
    })
  );

  const finalBytes = await printDoc.save();
  const blob = new Blob([finalBytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  // 3. Open the PDF in a new tab to ensure standard print dialog isn't blocked
  const newWindow = window.open(url, '_blank');

  // Fallback if popup blocker prevented the new tab
  if (!newWindow) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `IMPRIMIR_Solicitud_${patient.patientName}.pdf`;
    link.click();
  }
};
