/**
 * MMRAD RIS Service
 * Fetches radiology exam data from the MMRAD RIS system via Netlify Function.
 */

import { createScopedLogger } from '@/services/utils/loggerScope';

const mmradLogger = createScopedLogger('mmradService');

export interface MMRADExam {
  nombre_examen: string;
  fecha_examen: string;
  fecha_asignacion: string;
  mod: string;
  estado: string;
  pdf_url: string | null;
  dicom_url: string | null;
  informe_html_url: string | null;
}

export interface MMRADSearchResult {
  rut: string;
  examenes: MMRADExam[];
}

export const searchMMRADExams = async (rut: string): Promise<MMRADSearchResult> => {
  const cleanRut = rut.replace(/\./g, '').trim();

  try {
    const response = await fetch(
      `/.netlify/functions/mmrad-search?rut=${encodeURIComponent(cleanRut)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    mmradLogger.error('MMRAD search failed', error);
    throw error;
  }
};
