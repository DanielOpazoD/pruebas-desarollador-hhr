import type { ApplicationOutcome } from '@/application/shared/applicationOutcome';
import { resolveApplicationOutcomeMessage } from '@/application/shared/applicationOutcomeMessage';

export interface HandoffManagementOutcomeNotice {
  message: string;
  title: string;
}

export const presentHandoffManagementFailure = <T>(
  outcome: ApplicationOutcome<T>,
  options: {
    fallbackMessage: string;
    fallbackTitle: string;
    reasonTitles?: Partial<Record<string, string>>;
  }
): HandoffManagementOutcomeNotice => ({
  message: resolveApplicationOutcomeMessage(outcome, options.fallbackMessage),
  title: (outcome.reason && options.reasonTitles?.[outcome.reason]) || options.fallbackTitle,
});
