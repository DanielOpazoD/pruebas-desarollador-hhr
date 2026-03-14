import { beforeEach, describe, expect, it, vi } from 'vitest';

import { exportClinicalDocumentPdfViaBackend } from '@/features/clinical-documents/services/clinicalDocumentBackendExportService';
import { getFunctionsInstance } from '@/firebaseConfig';
import { httpsCallable } from 'firebase/functions';

vi.mock('@/firebaseConfig', () => ({
  getFunctionsInstance: vi.fn(),
}));

const callableMock = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

describe('clinicalDocumentBackendExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFunctionsInstance).mockResolvedValue({} as never);
    callableMock.mockResolvedValue({
      data: {
        fileId: 'file-1',
        webViewLink: 'https://drive.google.com/file-1',
        folderPath: '/Documentos Clinicos',
        usedBackend: true,
      },
    });
  });

  it('serializes the PDF blob and sends the expected backend payload', async () => {
    const pdfBlob = {
      type: 'application/pdf',
      arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([80, 68, 70]).buffer),
    } as unknown as Blob;

    const result = await exportClinicalDocumentPdfViaBackend({
      documentId: 'doc-1',
      fileName: 'epicrisis.pdf',
      documentType: 'epicrisis',
      patientName: 'Paciente Test',
      patientRut: '11.111.111-1',
      episodeKey: '11.111.111-1__2026-03-06',
      pdfBlob,
    });

    expect(httpsCallable).toHaveBeenCalled();
    expect(callableMock).toHaveBeenCalledWith({
      documentId: 'doc-1',
      fileName: 'epicrisis.pdf',
      documentType: 'epicrisis',
      patientName: 'Paciente Test',
      patientRut: '11.111.111-1',
      episodeKey: '11.111.111-1__2026-03-06',
      contentBase64: 'UERG',
      mimeType: 'application/pdf',
    });
    expect(result).toEqual({
      fileId: 'file-1',
      webViewLink: 'https://drive.google.com/file-1',
      folderPath: '/Documentos Clinicos',
      usedBackend: true,
    });
  });
});
