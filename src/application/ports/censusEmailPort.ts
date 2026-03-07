import { triggerCensusEmail } from '@/services/integrations/censusEmailService';
import { uploadCensus } from '@/services/backup/censusStorageService';
import type { DailyRecord } from '@/types';
import type { CensusWorkbookSheetDescriptor } from '@/services/exporters/censusMasterWorkbook';

export interface CensusEmailSendPayload {
  date: string;
  records: DailyRecord[];
  recipients?: string[];
  nursesSignature?: string;
  body?: string;
  shareLink?: string;
  userEmail?: string | null;
  userRole?: string | null;
  sheetDescriptors?: CensusWorkbookSheetDescriptor[];
}

export interface CensusEmailDeliveryPort {
  sendEmail: (payload: CensusEmailSendPayload) => Promise<void>;
  sendLink: (payload: CensusEmailSendPayload) => Promise<void>;
  uploadBackup: (blob: Blob, date: string) => Promise<void>;
}

export const defaultCensusEmailDeliveryPort: CensusEmailDeliveryPort = {
  sendEmail: async payload => {
    const result = await triggerCensusEmail(payload);
    if (!result.success) {
      throw new Error(result.message || 'No se pudo enviar el correo de censo.');
    }
  },
  sendLink: async payload => {
    const result = await triggerCensusEmail(payload);
    if (!result.success) {
      throw new Error(result.message || 'No se pudo enviar el link de censo.');
    }
  },
  uploadBackup: async (blob, date) => {
    await uploadCensus(blob, date);
  },
};
