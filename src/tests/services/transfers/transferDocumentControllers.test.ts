import { describe, expect, it, vi } from 'vitest';

import { buildTransferDocumentFileName } from '@/services/transfers/transferDocumentNamingController';
import { createGeneratedDocument } from '@/services/transfers/transferGeneratedDocumentController';
import { resolveTransferFallbackGenerator } from '@/services/transfers/transferDocumentFallbackRegistry';

vi.mock('@/services/transfers/documentFallbacks', () => ({
  generateTapaTraslado: vi.fn(),
  generateEncuestaCovid: vi.fn(),
  generateSolicitudCamaHDS: vi.fn(),
  generateSolicitudAmbulancia: vi.fn(),
  generateFormularioIAAS: vi.fn(),
}));

describe('transferDocument controllers', () => {
  it('normaliza el nombre de archivo del documento de traslado', () => {
    expect(buildTransferDocumentFileName('Solicitud Cama HDS', 'Juan Pérez / Rossi', 'docx')).toBe(
      'Solicitud_Cama_HDS_Juan_Pérez_Rossi.docx'
    );
  });

  it('crea un GeneratedDocument con timestamp y nombre estandarizado', () => {
    const blob = new Blob(['ok'], { type: 'application/pdf' });
    const result = createGeneratedDocument(
      'x',
      'Documento Traslado',
      'Ana María',
      'pdf',
      'application/pdf',
      blob
    );

    expect(result.templateId).toBe('x');
    expect(result.fileName).toBe('Documento_Traslado_Ana_María.pdf');
    expect(result.blob).toBe(blob);
    expect(result.generatedAt).toMatch(/T/);
  });

  it('resuelve un fallback conocido y rechaza uno desconocido', () => {
    expect(resolveTransferFallbackGenerator('tapa-traslado')).toBeTypeOf('function');
    expect(resolveTransferFallbackGenerator('desconocido')).toBeNull();
  });
});
