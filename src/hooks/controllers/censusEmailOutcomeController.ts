import type { ApplicationIssue, ApplicationOutcome } from '@/application/shared/applicationOutcome';
import type { OperationalNotice } from '@/shared/feedback/operationalNoticePolicy';

interface CensusEmailOutcomePresentation {
  nextStatus: 'success' | 'error';
  error: string | null;
  alertTitle?: string;
  alertMessage?: string;
  state?: OperationalNotice['state'];
  actionRequired?: boolean;
}

const resolvePrimaryIssueMessage = (issues: ApplicationIssue[], fallbackMessage: string): string =>
  issues[0]?.userSafeMessage || issues[0]?.message || fallbackMessage;

export const resolveCensusEmailSendOutcomePresentation = <T>(
  result: ApplicationOutcome<T>,
  options: {
    fallbackErrorMessage: string;
    partialTitle: string;
    errorTitle: string;
    validationTitle?: string;
    shouldUseValidationTitle?: boolean;
  }
): CensusEmailOutcomePresentation => {
  if (result.status === 'success') {
    return {
      nextStatus: 'success',
      error: null,
      state: 'ok',
      actionRequired: false,
    };
  }

  if (result.status === 'partial' || result.status === 'degraded') {
    return {
      nextStatus: 'success',
      error: null,
      alertTitle: options.partialTitle,
      alertMessage: result.issues.map(issue => issue.userSafeMessage || issue.message).join('\n'),
      state: result.status === 'partial' ? 'pending' : 'degraded',
      actionRequired: false,
    };
  }

  const errorMessage = resolvePrimaryIssueMessage(result.issues, options.fallbackErrorMessage);
  const useValidationTitle =
    options.shouldUseValidationTitle && result.issues[0]?.kind === 'validation';

  return {
    nextStatus: 'error',
    error: errorMessage,
    alertTitle: useValidationTitle ? options.validationTitle : options.errorTitle,
    alertMessage: errorMessage,
    state: 'blocked',
    actionRequired: true,
  };
};
