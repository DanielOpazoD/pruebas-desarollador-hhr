import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSendCensusConfirmationMessage,
  executeGenerateCensusShareLink,
  executeSendCensusEmail,
  executeSendCensusEmailWithLink,
} from '@/application/census-email/sendCensusEmailUseCases';

vi.mock('@/services/storage/firestoreService', () => ({
  getMonthRecordsFromFirestore: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/repositories/DailyRecordRepository', () => ({
  initializeDay: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/services/integrations/censusEmailService', () => ({
  triggerCensusEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/backup/censusStorageService', () => ({
  uploadCensus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/exporters/censusMasterWorkbook', () => ({
  buildCensusMasterWorkbook: vi.fn().mockResolvedValue({
    xlsx: { writeBuffer: vi.fn().mockResolvedValue(Buffer.from([])) },
  }),
}));

describe('sendCensusEmailUseCases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the confirmation text using the resolved recipients', () => {
    const message = buildSendCensusConfirmationMessage({
      currentDateString: '2026-03-06',
      recipients: ['a@test.com'],
      testModeEnabled: false,
      testRecipient: '',
      isAdminUser: true,
    });

    expect(message).toContain('a@test.com');
  });

  it('returns validation failure when trying to send without record', async () => {
    const result = await executeSendCensusEmail({
      record: null,
      currentDateString: '2026-03-06',
      nurseSignature: 'Nurse',
      selectedYear: 2026,
      selectedMonth: 2,
      selectedDay: 6,
      user: { email: 'admin@test.com', role: 'admin' },
      role: 'admin',
      recipients: ['a@test.com'],
      message: 'test',
      testModeEnabled: false,
      testRecipient: '',
      isAdminUser: true,
      excelSheetConfig: {
        includeEndOfDay2359Sheet: true,
        includeCurrentTimeSheet: false,
      },
    });

    expect(result.status).toBe('failed');
  });

  it('returns success when share link is generated', async () => {
    const result = await executeGenerateCensusShareLink({
      getOrigin: () => 'https://hhr.test',
    } as any);

    expect(result.status).toBe('success');
    expect(result.data).toContain('/censo-compartido');
  });

  it('sends an email with link successfully', async () => {
    const result = await executeSendCensusEmailWithLink({
      record: {
        date: '2026-03-06',
        beds: {},
        discharges: [],
        transfers: [],
        lastUpdated: '',
        nurses: [],
        activeExtraBeds: [],
        cma: [],
      } as any,
      currentDateString: '2026-03-06',
      nurseSignature: 'Nurse',
      user: { email: 'admin@test.com', role: 'admin' },
      role: 'admin',
      recipients: ['a@test.com'],
      message: 'test',
      browserRuntime: { getOrigin: () => 'https://hhr.test' } as any,
    });

    expect(result.status).toBe('success');
    expect(result.data?.shareLink).toContain('/censo-compartido');
  });
});
