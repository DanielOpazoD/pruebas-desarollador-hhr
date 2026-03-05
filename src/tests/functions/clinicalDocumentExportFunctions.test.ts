import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const driveMocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock('firebase-functions/v1', () => ({
  https: {
    onCall: (handler: (data: unknown, context: unknown) => unknown) => ({ run: handler }),
    HttpsError: class HttpsError extends Error {
      code: string;

      constructor(code: string, message: string) {
        super(message);
        this.code = code;
      }
    },
  },
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(() => ({})),
    },
    drive: vi.fn(() => ({
      files: {
        list: driveMocks.list,
        create: driveMocks.create,
        update: driveMocks.update,
      },
    })),
  },
}));

const require = createRequire(import.meta.url);
const {
  createClinicalDocumentExportFunctions,
} = require('../../../functions/lib/clinicalDocumentExportFunctions.js');

describe('functions clinicalDocumentExportFunctions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLINICAL_DRIVE_ROOT_FOLDER_ID = 'root-folder-id';
  });

  it('rejects unauthenticated calls', async () => {
    const functionsApi = createClinicalDocumentExportFunctions({
      admin: { firestore: vi.fn() },
      resolveRoleForEmail: vi.fn(),
    });

    await expect(
      functionsApi.exportClinicalDocumentPdfToDrive.run({}, { auth: null })
    ).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('exports pdf to drive folder hierarchy for authorized doctor role', async () => {
    driveMocks.list.mockResolvedValue({ data: { files: [] } });
    driveMocks.create.mockImplementation(
      async ({ requestBody }: { requestBody: { mimeType?: string } }) => {
        if (requestBody.mimeType === 'application/vnd.google-apps.folder') {
          return { data: { id: `folder-${Math.random().toString(36).slice(2, 6)}` } };
        }
        return {
          data: { id: 'file-1', webViewLink: 'https://drive.google.com/file/d/file-1/view' },
        };
      }
    );

    const setAudit = vi.fn().mockResolvedValue(undefined);
    const admin = {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                set: setAudit,
              }),
            }),
          }),
        }),
      }),
    };

    const functionsApi = createClinicalDocumentExportFunctions({
      admin,
      resolveRoleForEmail: vi.fn().mockResolvedValue('doctor_urgency'),
      buildDriveClientOverride: () => ({
        files: {
          list: driveMocks.list,
          create: driveMocks.create,
          update: driveMocks.update,
        },
      }),
    });

    const result = await functionsApi.exportClinicalDocumentPdfToDrive.run(
      {
        documentId: 'doc-1',
        fileName: 'Epicrisis.pdf',
        documentType: 'epicrisis',
        patientName: 'Paciente Prueba',
        patientRut: '12.345.678-9',
        episodeKey: '12345678-9__2026-03-04',
        contentBase64: Buffer.from('pdf-content').toString('base64'),
        mimeType: 'application/pdf',
      },
      { auth: { uid: 'u1', token: { email: 'medico.urgencia@hospitalhangaroa.cl' } } }
    );

    expect(result.fileId).toBe('file-1');
    expect(result.usedBackend).toBe(true);
    expect(driveMocks.create).toHaveBeenCalled();
    expect(setAudit).toHaveBeenCalled();
  });
});
