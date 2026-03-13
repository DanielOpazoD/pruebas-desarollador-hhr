export type OperationalTelemetryCategory =
  | 'auth'
  | 'firestore'
  | 'sync'
  | 'indexeddb'
  | 'integration'
  | 'export'
  | 'backup'
  | 'transfers'
  | 'clinical_document'
  | 'create_day'
  | 'handoff';

export type OperationalTelemetryStatus = 'success' | 'partial' | 'degraded' | 'failed';

export interface OperationalTelemetryEvent {
  category: OperationalTelemetryCategory;
  status: OperationalTelemetryStatus;
  operation: string;
  timestamp: string;
  date?: string;
  issues?: string[];
  context?: Record<string, unknown>;
}
