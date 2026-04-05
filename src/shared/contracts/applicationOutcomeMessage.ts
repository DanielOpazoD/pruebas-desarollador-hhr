interface ApplicationOutcomeMessageLike {
  status?: string;
  userSafeMessage?: string;
  issues?: Array<{
    userSafeMessage?: string;
    message?: string;
  }>;
}

type ApplicationIssueMessageLike = NonNullable<ApplicationOutcomeMessageLike['issues']>[number];

export const resolveApplicationOutcomeMessage = (
  outcome: ApplicationOutcomeMessageLike,
  fallbackMessage: string
): string =>
  outcome.userSafeMessage ||
  outcome.issues?.[0]?.userSafeMessage ||
  outcome.issues?.[0]?.message ||
  fallbackMessage;

export const resolveFailedApplicationOutcomeMessage = (
  outcome: ApplicationOutcomeMessageLike,
  fallbackMessage: string
): string | null =>
  outcome.status === 'success' ? null : resolveApplicationOutcomeMessage(outcome, fallbackMessage);

export const resolvePrimaryApplicationIssueMessage = (
  issues: ApplicationIssueMessageLike[] | undefined,
  fallbackMessage: string
): string => issues?.[0]?.userSafeMessage || issues?.[0]?.message || fallbackMessage;

export const joinApplicationIssueMessages = (
  issues: ApplicationIssueMessageLike[] | undefined
): string => (issues || []).map(issue => issue.userSafeMessage || issue.message || '').join('\n');
