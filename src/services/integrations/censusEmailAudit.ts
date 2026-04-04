import { savePasswordToFirestore } from '@/services/security/exportPasswordService';

export const saveCensusEmailExportPassword = async (
  date: string,
  password: string,
  createdBy?: string
): Promise<void> => {
  await savePasswordToFirestore(date, password, createdBy, 'email');
};
