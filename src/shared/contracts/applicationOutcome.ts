export type ApplicationOutcomeStatus = 'success' | 'partial' | 'degraded' | 'failed';
export type ApplicationOutcomeSeverity = 'info' | 'warning' | 'error' | 'critical';

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
  userSafeMessage?: string;
  retryable?: boolean;
  severity?: ApplicationOutcomeSeverity;
  technicalContext?: Record<string, unknown>;
  telemetryTags?: string[];
}

export interface ApplicationOutcome<T> {
  status: ApplicationOutcomeStatus;
  data: T;
  issues: ApplicationIssue[];
  reason?: string;
  userSafeMessage?: string;
  retryable?: boolean;
  severity?: ApplicationOutcomeSeverity;
  technicalContext?: Record<string, unknown>;
  telemetryTags?: string[];
}

export interface ApplicationOutcomeMetadata {
  reason?: string;
  userSafeMessage?: string;
  retryable?: boolean;
  severity?: ApplicationOutcomeSeverity;
  technicalContext?: Record<string, unknown>;
  telemetryTags?: string[];
}

export interface UseCase<Input, Output> {
  execute(input: Input): Promise<ApplicationOutcome<Output>>;
}

const createApplicationOutcome = <T>(
  status: ApplicationOutcomeStatus,
  data: T,
  issues: ApplicationIssue[] = [],
  metadata: ApplicationOutcomeMetadata = {}
): ApplicationOutcome<T> => ({
  status,
  data,
  issues,
  ...metadata,
});

export const createApplicationSuccess = <T>(
  data: T,
  issues: ApplicationIssue[] = [],
  metadata: ApplicationOutcomeMetadata = {}
): ApplicationOutcome<T> => createApplicationOutcome('success', data, issues, metadata);

export const createApplicationPartial = <T>(
  data: T,
  issues: ApplicationIssue[],
  metadata: ApplicationOutcomeMetadata = {}
): ApplicationOutcome<T> => createApplicationOutcome('partial', data, issues, metadata);

export const createApplicationDegraded = <T>(
  data: T,
  issues: ApplicationIssue[],
  metadata: ApplicationOutcomeMetadata = {}
): ApplicationOutcome<T> => createApplicationOutcome('degraded', data, issues, metadata);

export const createApplicationFailed = <T>(
  data: T,
  issues: ApplicationIssue[],
  metadata: ApplicationOutcomeMetadata = {}
): ApplicationOutcome<T> => createApplicationOutcome('failed', data, issues, metadata);
