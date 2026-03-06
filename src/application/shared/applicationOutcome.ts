export type ApplicationOutcomeStatus = 'success' | 'partial' | 'degraded' | 'failed';

export type ApplicationErrorKind =
  | 'validation'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'remote_blocked'
  | 'unknown';

export interface ApplicationIssue {
  kind: ApplicationErrorKind;
  message: string;
  code?: string;
}

export interface ApplicationOutcome<T> {
  status: ApplicationOutcomeStatus;
  data: T;
  issues: ApplicationIssue[];
}

export interface UseCase<Input, Output> {
  execute(input: Input): Promise<ApplicationOutcome<Output>>;
}

const createApplicationOutcome = <T>(
  status: ApplicationOutcomeStatus,
  data: T,
  issues: ApplicationIssue[] = []
): ApplicationOutcome<T> => ({
  status,
  data,
  issues,
});

export const createApplicationSuccess = <T>(
  data: T,
  issues: ApplicationIssue[] = []
): ApplicationOutcome<T> => createApplicationOutcome('success', data, issues);

export const createApplicationPartial = <T>(
  data: T,
  issues: ApplicationIssue[]
): ApplicationOutcome<T> => createApplicationOutcome('partial', data, issues);

export const createApplicationDegraded = <T>(
  data: T,
  issues: ApplicationIssue[]
): ApplicationOutcome<T> => createApplicationOutcome('degraded', data, issues);

export const createApplicationFailed = <T>(
  data: T,
  issues: ApplicationIssue[]
): ApplicationOutcome<T> => createApplicationOutcome('failed', data, issues);
