import type { ApplicationIssue, ApplicationOutcome } from '@/application/shared/applicationOutcome';

export interface HandoffManagementOutcomeNotice {
  message: string;
  title: string;
}

const resolveIssueMessage = (issues: ApplicationIssue[], fallbackMessage: string): string =>
  issues.find(issue => issue.userSafeMessage)?.userSafeMessage ||
  issues[0]?.message ||
  fallbackMessage;

export const presentHandoffManagementFailure = <T>(
  outcome: ApplicationOutcome<T>,
  options: {
    fallbackMessage: string;
    fallbackTitle: string;
    reasonTitles?: Partial<Record<string, string>>;
  }
): HandoffManagementOutcomeNotice => ({
  message: outcome.userSafeMessage || resolveIssueMessage(outcome.issues, options.fallbackMessage),
  title: (outcome.reason && options.reasonTitles?.[outcome.reason]) || options.fallbackTitle,
});
