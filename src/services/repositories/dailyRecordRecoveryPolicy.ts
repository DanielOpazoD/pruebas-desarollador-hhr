import type {
  DailyRecordConflictSummary,
  DailyRecordRecoveryAction,
  DailyRecordRetryability,
  DailyRecordWriteConsistencyState,
} from '@/services/repositories/contracts/dailyRecordConsistency';

export interface DailyRecordRecoveryDecision {
  consistencyState: DailyRecordWriteConsistencyState;
  retryability: DailyRecordRetryability;
  recoveryAction: DailyRecordRecoveryAction;
  blockingReason?: 'regression' | 'version_mismatch' | 'validation';
  conflictSummary: DailyRecordConflictSummary | null;
  observabilityTags: string[];
  userSafeMessage?: string;
}

export const createQueuedRetryDecision = (
  conflictSummary: DailyRecordConflictSummary | null,
  observabilityTags: string[],
  userSafeMessage: string
): DailyRecordRecoveryDecision => ({
  consistencyState: 'queued_for_retry',
  retryability: 'automatic_retry',
  recoveryAction: 'queue_retry',
  conflictSummary,
  observabilityTags,
  userSafeMessage,
});

export const createAutoMergeDecision = (
  conflictSummary: DailyRecordConflictSummary | null,
  observabilityTags: string[],
  userSafeMessage: string
): DailyRecordRecoveryDecision => ({
  consistencyState: 'auto_merged',
  retryability: 'automatic_retry',
  recoveryAction: 'auto_merge_and_queue',
  conflictSummary,
  observabilityTags,
  userSafeMessage,
});

export const createBlockedDecision = (
  blockingReason: 'regression' | 'version_mismatch' | 'validation',
  conflictSummary: DailyRecordConflictSummary | null,
  observabilityTags: string[],
  userSafeMessage: string
): DailyRecordRecoveryDecision => ({
  consistencyState:
    blockingReason === 'regression'
      ? 'blocked_regression'
      : blockingReason === 'version_mismatch'
        ? 'blocked_version_mismatch'
        : 'blocked_validation',
  retryability: 'blocked',
  recoveryAction: 'block_and_surface',
  blockingReason,
  conflictSummary,
  observabilityTags,
  userSafeMessage,
});

export const createUnrecoverableDecision = (
  conflictSummary: DailyRecordConflictSummary | null,
  observabilityTags: string[],
  userSafeMessage: string
): DailyRecordRecoveryDecision => ({
  consistencyState: 'unrecoverable',
  retryability: 'manual_review',
  recoveryAction: 'defer_remote_sync',
  conflictSummary,
  observabilityTags,
  userSafeMessage,
});
