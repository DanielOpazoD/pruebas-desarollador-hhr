export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamps: boolean;
  enableContext: boolean;
  maxStoredEntries: number;
}
