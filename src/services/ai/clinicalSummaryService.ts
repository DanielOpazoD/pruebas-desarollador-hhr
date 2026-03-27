import { resolveCurrentUserAuthHeaders } from '@/services/auth/authRequestHeaders';
import {
  ClinicalSummaryRequestSchema,
  ClinicalSummaryResponseSchema,
  getServerlessErrorMessage,
  type ClinicalSummaryRequest,
  type ClinicalSummaryResponse,
} from '@/contracts/serverless';

const resolveEndpoint = (): string =>
  import.meta.env.VITE_CLINICAL_AI_SUMMARY_ENDPOINT || '/.netlify/functions/clinical-ai-summary';

export const generateClinicalSummary = async (
  request: ClinicalSummaryRequest
): Promise<ClinicalSummaryResponse> => {
  const validatedRequest = ClinicalSummaryRequestSchema.parse(request);
  const authHeaders = await resolveCurrentUserAuthHeaders();
  const response = await fetch(resolveEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(validatedRequest),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(getServerlessErrorMessage(payload, 'No se pudo generar el resumen clínico.'));
  }

  return ClinicalSummaryResponseSchema.parse(payload);
};
