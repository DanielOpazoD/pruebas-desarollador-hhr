import { z } from 'zod';
import type { DailyRecord } from '@/types/domain/dailyRecord';
import type { CensusWorkbookSheetDescriptor } from '@/services/exporters/censusMasterWorkbook';

export const ServerlessErrorResponseSchema = z.object({
  error: z.string(),
});

export type ServerlessErrorResponse = z.infer<typeof ServerlessErrorResponseSchema>;

export const Cie10SearchResultSchema = z.object({
  code: z.string(),
  description: z.string(),
  category: z.string().optional(),
});

export const Cie10SearchRequestSchema = z.object({
  query: z.string(),
});

export type Cie10SearchRequest = z.infer<typeof Cie10SearchRequestSchema>;

export const Cie10SearchResponseSchema = z.object({
  available: z.boolean(),
  results: z.array(Cie10SearchResultSchema),
  message: z.string().optional(),
  error: z.string().optional(),
});

export type Cie10SearchResponse = z.infer<typeof Cie10SearchResponseSchema>;

export const ClinicalSummaryRequestSchema = z.object({
  recordDate: z.string(),
  bedId: z.string(),
  instruction: z.string().optional(),
});

export type ClinicalSummaryRequest = z.infer<typeof ClinicalSummaryRequestSchema>;

export const ClinicalSummaryResponseSchema = z.object({
  available: z.boolean(),
  provider: z.string().optional(),
  model: z.string().optional(),
  summary: z.string(),
  message: z.string().optional(),
});

export type ClinicalSummaryResponse = z.infer<typeof ClinicalSummaryResponseSchema>;

const CensusWorkbookSheetDescriptorSchema: z.ZodType<CensusWorkbookSheetDescriptor> = z.custom();
const DailyRecordArraySchema: z.ZodType<DailyRecord[]> = z.custom(
  (value): value is DailyRecord[] =>
    Array.isArray(value) &&
    value.every(
      item =>
        typeof item === 'object' && item !== null && 'date' in item && typeof item.date === 'string'
    )
);

export interface CensusEmailRequestPayload {
  date: string;
  records: DailyRecord[];
  recipients?: string[];
  nursesSignature?: string;
  body?: string;
  shareLink?: string;
  sheetDescriptors?: CensusWorkbookSheetDescriptor[];
}

export const CensusEmailRequestPayloadSchema: z.ZodType<CensusEmailRequestPayload> = z.object({
  date: z.string(),
  records: DailyRecordArraySchema,
  recipients: z.array(z.string()).optional(),
  nursesSignature: z.string().optional(),
  body: z.string().optional(),
  shareLink: z.string().optional(),
  sheetDescriptors: z.array(CensusWorkbookSheetDescriptorSchema).optional(),
});

export const CensusEmailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  gmailId: z.string(),
  censusDate: z.string().optional(),
  exportPassword: z.string().optional(),
});

export type CensusEmailResponse = z.infer<typeof CensusEmailResponseSchema>;

export const getServerlessErrorMessage = (payload: unknown, fallbackMessage: string): string => {
  const parsed = ServerlessErrorResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data.error : fallbackMessage;
};
