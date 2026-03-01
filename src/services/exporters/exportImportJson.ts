import { validateBackupData } from '@/schemas';
import { DailyRecord } from '@/types';
import { saveRecord } from '@/services/storage/indexedDBService';

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve((event.target?.result as string) || '');
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file);
  });

const validateImportData = (text: string) => {
  const parsed = JSON.parse(text);
  return validateBackupData(parsed);
};

const persistImportedRecords = async (records: DailyRecord[]): Promise<void> => {
  await Promise.all(records.map(record => saveRecord(record)));
};

export const importDataJSON = async (file: File): Promise<boolean> => {
  try {
    const text = await readFileAsText(file);
    const validation = validateImportData(text);

    if (!validation.success) {
      console.error('Validation Errors:', validation.errors);
      alert(
        `El archivo JSON no cumple con el formato requerido:\n${validation.errors?.slice(0, 5).join('\n')}`
      );
      return false;
    }

    const records = Object.values(validation.data as Record<string, DailyRecord>);
    await persistImportedRecords(records);
    return true;
  } catch (error) {
    console.error('Import failed', error);
    alert('Error al procesar el archivo JSON.');
    return false;
  }
};
