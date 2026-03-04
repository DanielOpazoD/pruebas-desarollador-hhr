import { requestAccessToken } from '@/services/google/googleDriveAuth';
import { uploadToDriveFolder } from '@/services/google/googleDriveFolders';

const ROOT_FOLDER = 'Hospitalizados';
const CLINICAL_FOLDER = 'Documentos Clinicos';
const EPICRISIS_FOLDER = 'Epicrisis';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

const findFolderByName = async (
  token: string,
  folderName: string,
  parentId?: string
): Promise<string | null> => {
  let query = `name='${folderName}' and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.files?.[0]?.id || null;
};

const createFolder = async (
  token: string,
  folderName: string,
  parentId?: string
): Promise<string> => {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: parentId ? [parentId] : undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'No se pudo crear carpeta en Google Drive.');
  }

  const data = await response.json();
  return data.id as string;
};

const getOrCreateFolder = async (
  token: string,
  folderName: string,
  parentId?: string
): Promise<string> => {
  const existing = await findFolderByName(token, folderName, parentId);
  if (existing) {
    return existing;
  }
  return createFolder(token, folderName, parentId);
};

export const uploadClinicalDocumentPdfToDrive = async (
  blob: Blob,
  fileName: string,
  patientName: string,
  patientRut: string,
  episodeKey: string,
  now: Date = new Date()
): Promise<{ fileId: string; webViewLink: string; folderPath: string }> => {
  const token = await requestAccessToken();
  const year = now.getFullYear().toString();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const patientFolder = `${patientName.trim().replace(/\s+/g, '_')}_${patientRut.replace(/[.\-]/g, '')}_${episodeKey}`;

  const rootId = await getOrCreateFolder(token, ROOT_FOLDER);
  const clinicalId = await getOrCreateFolder(token, CLINICAL_FOLDER, rootId);
  const epicrisisId = await getOrCreateFolder(token, EPICRISIS_FOLDER, clinicalId);
  const yearId = await getOrCreateFolder(token, year, epicrisisId);
  const monthId = await getOrCreateFolder(token, month, yearId);
  const patientId = await getOrCreateFolder(token, patientFolder, monthId);

  const upload = await uploadToDriveFolder(token, blob, fileName, patientId);
  return {
    ...upload,
    folderPath: `${ROOT_FOLDER}/${CLINICAL_FOLDER}/${EPICRISIS_FOLDER}/${year}/${month}/${patientFolder}`,
  };
};
