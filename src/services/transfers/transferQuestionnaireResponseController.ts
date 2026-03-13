import type { QuestionnaireResponse } from '@/types/transferDocuments';

const findQuestionResponse = (
  responses: QuestionnaireResponse,
  questionId: string
): QuestionnaireResponse['responses'][number] | undefined =>
  responses.responses.find(response => response.questionId === questionId);

export const normalizeQuestionnaireResponseValue = (
  value: string | boolean | string[] | number | null | undefined
): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'SÍ' : 'NO';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

export const getQuestionnaireResponseText = (
  responses: QuestionnaireResponse,
  questionId: string
): string =>
  normalizeQuestionnaireResponseValue(findQuestionResponse(responses, questionId)?.value);
