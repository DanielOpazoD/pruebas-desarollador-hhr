export type SyncDomainContext =
  | 'clinical'
  | 'staffing'
  | 'movements'
  | 'handoff'
  | 'metadata'
  | 'unknown';

export type SyncTaskOrigin =
  | 'direct_queue'
  | 'full_save_retry'
  | 'partial_update_retry'
  | 'conflict_auto_merge';
