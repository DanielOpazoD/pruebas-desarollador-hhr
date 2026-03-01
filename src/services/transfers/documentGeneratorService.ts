/**
 * Document Generator Service
 * Generates DOCX, XLSX, and PDF documents for patient transfers
 */

import {
  HospitalConfig,
  QuestionnaireResponse,
  TransferPatientData,
  GeneratedDocument,
} from '@/types/transferDocuments';
import {
  fetchTemplateFromStorage,
  mapDataToTags,
  generateDocxFromTemplate,
  generateXlsxFromTemplate,
} from './templateGeneratorService';
import {
  generateTapaTraslado,
  generateEncuestaCovid,
  generateSolicitudCamaHDS,
  generateSolicitudAmbulancia,
  generateFormularioIAAS,
} from './documentFallbacks';

const triggerBrowserDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getSuggestedExtension = (suggestedName: string): string => {
  const extension = suggestedName.split('.').pop();
  return extension ? `.${extension}` : '.bin';
};

type DirectoryHandle = {
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileSystemFileHandle>;
};

const saveBlobWithPicker = async (
  blob: Blob,
  suggestedName: string,
  mimeType: string
): Promise<'saved' | 'cancelled'> => {
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
            description: 'Archivo',
            accept: {
              [mimeType]: [getSuggestedExtension(suggestedName)],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  triggerBrowserDownload(blob, suggestedName);
  return 'saved';
};

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate all enabled documents for a transfer
 */
export const generateTransferDocuments = async (
  patientData: TransferPatientData,
  responses: QuestionnaireResponse,
  hospital: HospitalConfig
): Promise<GeneratedDocument[]> => {
  const enabledTemplates = hospital.templates.filter(t => t.enabled);
  const tags = mapDataToTags(patientData, responses);
  const generatedDocs = await Promise.all(
    enabledTemplates.map(async template => {
      try {
        let doc: GeneratedDocument | null = null;
        const templateFileName = `${hospital.code}/${template.id}.${template.format}`;
        const templateBlob = await fetchTemplateFromStorage(templateFileName);

        if (templateBlob) {
          let processedBlob: Blob;
          if (template.format === 'docx') {
            processedBlob = await generateDocxFromTemplate(templateBlob, tags);
          } else if (template.format === 'xlsx') {
            processedBlob = await generateXlsxFromTemplate(templateBlob, tags);
          } else {
            processedBlob = templateBlob;
          }

          doc = {
            templateId: template.id,
            fileName: `${template.name}_${patientData.patientName.replace(/\s+/g, '_')}.${template.format}`,
            mimeType: templateBlob.type,
            blob: processedBlob,
            generatedAt: new Date().toISOString(),
          };
        }

        if (!doc) {
          console.warn(
            `[DocumentGenerator] Template ${template.id} not available in Storage, using code fallback`
          );
          doc = await generateFallbackDocument(template.id, patientData, responses, hospital);
        }

        return doc;
      } catch (error) {
        console.error(`Error generating ${template.id}:`, error);
        return null;
      }
    })
  );

  return generatedDocs.filter((doc): doc is GeneratedDocument => doc !== null);
};

/**
 * Route to the correct fallback generator
 */
const generateFallbackDocument = async (
  templateId: string,
  patientData: TransferPatientData,
  responses: QuestionnaireResponse,
  hospital: HospitalConfig
): Promise<GeneratedDocument | null> => {
  switch (templateId) {
    case 'tapa-traslado':
      return generateTapaTraslado(patientData, hospital);
    case 'encuesta-covid':
      return generateEncuestaCovid(patientData, responses, hospital);
    case 'solicitud-cama-hds':
      return generateSolicitudCamaHDS(patientData, responses, hospital);
    case 'solicitud-ambulancia':
      return generateSolicitudAmbulancia(patientData, responses, hospital);
    case 'formulario-iaas':
      return generateFormularioIAAS(patientData, responses, hospital);
    default:
      console.warn(`Unknown template: ${templateId}`);
      return null;
  }
};

/**
 * Download a single document
 */
export const downloadDocument = async (doc: GeneratedDocument): Promise<'saved' | 'cancelled'> => {
  return await saveBlobWithPicker(doc.blob, doc.fileName, doc.mimeType);
};

/**
 * Download all documents to a folder when supported, otherwise ZIP them.
 */
export const downloadAllDocuments = async (
  documents: GeneratedDocument[]
): Promise<'directory' | 'zip' | 'cancelled'> => {
  if ('showDirectoryPicker' in window) {
    try {
      const directoryHandle = await (
        window as unknown as {
          showDirectoryPicker: (opts?: unknown) => Promise<DirectoryHandle>;
        }
      ).showDirectoryPicker({
        mode: 'readwrite',
      });

      await Promise.all(
        documents.map(async doc => {
          const fileHandle = await directoryHandle.getFileHandle(doc.fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(doc.blob);
          await writable.close();
        })
      );

      return 'directory';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const { default: PizZip } = await import('pizzip');
  const zip = new PizZip();

  await Promise.all(
    documents.map(async doc => {
      const bytes = new Uint8Array(await doc.blob.arrayBuffer());
      zip.file(doc.fileName, bytes);
    })
  );

  const zipBlob = zip.generate({
    type: 'blob',
    compression: 'DEFLATE',
  }) as Blob;

  const archiveName =
    documents.length === 1
      ? documents[0].fileName.replace(/\.[^.]+$/, '.zip')
      : `documentos-traslado-${new Date().toISOString().slice(0, 10)}.zip`;

  await saveBlobWithPicker(zipBlob, archiveName, 'application/zip');
  return 'zip';
};
