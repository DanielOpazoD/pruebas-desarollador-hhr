import { doc, getFirestore, setDoc } from 'firebase/firestore';

import { getExportPasswordsPath } from '@/constants/firestorePaths';
import { logger } from '@/services/utils/loggerService';

const censusEmailAuditLogger = logger.child('CensusEmailAudit');

export const saveCensusEmailExportPassword = async (
  date: string,
  password: string,
  createdBy?: string
): Promise<void> => {
  try {
    const db = getFirestore();
    const passwordsPath = getExportPasswordsPath();
    const docRef = doc(db, passwordsPath, date);

    await setDoc(
      docRef,
      {
        date,
        password,
        createdAt: new Date().toISOString(),
        createdBy,
        source: 'email',
      },
      { merge: true }
    );
  } catch (error) {
    censusEmailAuditLogger.error('Failed to save password to Firestore', error);
  }
};
