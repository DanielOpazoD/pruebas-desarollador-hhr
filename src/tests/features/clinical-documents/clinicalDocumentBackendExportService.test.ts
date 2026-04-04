import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createClinicalDocumentBackendExportService,
  exportClinicalDocumentPdfViaBackend,
} from '@/features/clinical-documents/services/clinicalDocumentBackendExportService';
import { httpsCallable } from 'firebase/functions';

const getFunctionsMock = vi.fn();

vi.mock('@/services/firebase-runtime/functionsRuntime', () => ({
  defaultFunctionsRuntime: {
    getFunctions: (...args: unknown[]) => getFunctionsMock(...args),
  },
}));

const callableMock = vi.fn();

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => callableMock),
}));

describe('clinicalDocumentBackendExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFunctionsMock.mockResolvedValue({} as never);
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

  it('rejects malformed backend export payloads', async () => {
    const pdfBlob = {
      type: 'application/pdf',
      arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([80, 68, 70]).buffer),
    } as unknown as Blob;

    callableMock.mockResolvedValueOnce({
      data: {
        fileId: 'file-1',
        usedBackend: true,
      },
    });

    await expect(
      exportClinicalDocumentPdfViaBackend({
        documentId: 'doc-1',
        fileName: 'epicrisis.pdf',
        documentType: 'epicrisis',
        patientName: 'Paciente Test',
        patientRut: '11.111.111-1',
        episodeKey: '11.111.111-1__2026-03-06',
        pdfBlob,
      })
    ).rejects.toThrow();
  });

  it('supports injected functions runtimes without changing the default export', async () => {
    const service = createClinicalDocumentBackendExportService({
      getFunctions: vi.fn().mockResolvedValue({ custom: true } as never),
    });

    const pdfBlob = {
      type: 'application/pdf',
      arrayBuffer: vi.fn().mockResolvedValue(Uint8Array.from([80, 68, 70]).buffer),
    } as unknown as Blob;

    await service.exportClinicalDocumentPdfViaBackend({
      documentId: 'doc-1',
      fileName: 'epicrisis.pdf',
      documentType: 'epicrisis',
      patientName: 'Paciente Test',
      patientRut: '11.111.111-1',
      episodeKey: '11.111.111-1__2026-03-06',
      pdfBlob,
    });

    expect(httpsCallable).toHaveBeenCalledWith(
      { custom: true },
      'exportClinicalDocumentPdfToDrive'
    );
    expect(exportClinicalDocumentPdfViaBackend).toBeDefined();
  });
});
