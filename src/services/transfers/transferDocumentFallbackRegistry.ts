import type {
  GeneratedDocument,
  HospitalConfig,
  QuestionnaireResponse,
  TransferPatientData,
} from '@/types/transferDocuments';

import {
  generateEncuestaCovid,
  generateFormularioIAAS,
  generateSolicitudAmbulancia,
  generateSolicitudCamaHDS,
  generateTapaTraslado,
} from './documentFallbacks';

export type TransferFallbackGenerator = (
  patientData: TransferPatientData,
  responses: QuestionnaireResponse,
  hospital: HospitalConfig
) => Promise<GeneratedDocument>;

const TRANSFER_FALLBACK_REGISTRY: Record<string, TransferFallbackGenerator> = {
  'tapa-traslado': async (patientData, _responses, hospital) =>
    generateTapaTraslado(patientData, hospital),
  'encuesta-covid': generateEncuestaCovid,
  'solicitud-cama-hds': generateSolicitudCamaHDS,
  'solicitud-ambulancia': generateSolicitudAmbulancia,
  'formulario-iaas': generateFormularioIAAS,
};

export const resolveTransferFallbackGenerator = (
  templateId: string
): TransferFallbackGenerator | null => TRANSFER_FALLBACK_REGISTRY[templateId] || null;
