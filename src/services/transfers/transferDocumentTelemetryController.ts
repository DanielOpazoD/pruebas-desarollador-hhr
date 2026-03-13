import {
  recordOperationalErrorTelemetry,
  recordOperationalTelemetry,
} from '@/services/observability/operationalTelemetryService';

export const recordTransferTemplateFetchFailure = (templateName: string, error: unknown): void => {
  recordOperationalErrorTelemetry('transfers', 'fetch_transfer_template', error, {
    code: 'transfer_template_fetch_failed',
    message: `No fue posible obtener la plantilla ${templateName}.`,
    severity: 'warning',
    userSafeMessage: 'No fue posible cargar la plantilla del documento de traslado.',
    context: { templateName },
  });
};

export const recordTransferDocumentGenerationFailure = (
  templateId: string,
  hospitalCode: string,
  error: unknown
): void => {
  recordOperationalErrorTelemetry('transfers', 'generate_transfer_document', error, {
    code: 'transfer_document_generation_failed',
    message: `No fue posible generar el documento ${templateId}.`,
    severity: 'error',
    userSafeMessage: 'No fue posible generar uno de los documentos del traslado.',
    context: { templateId, hospitalCode },
  });
};

export const recordTransferTemplateFallback = (templateId: string, hospitalCode: string): void => {
  recordOperationalTelemetry({
    category: 'transfers',
    operation: 'transfer_document_template_fallback',
    status: 'degraded',
    issues: ['Se uso plantilla fallback por ausencia del archivo en Storage.'],
    context: { templateId, hospitalCode },
  });
};

export const recordUnknownTransferTemplate = (templateId: string): void => {
  recordOperationalTelemetry({
    category: 'transfers',
    operation: 'transfer_document_unknown_template',
    status: 'degraded',
    issues: ['Se solicito una plantilla de traslado desconocida.'],
    context: { templateId },
  });
};
