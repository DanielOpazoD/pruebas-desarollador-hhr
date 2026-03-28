import type { LogLevel, LoggerConfig } from '@/services/utils/loggerTypes';

export const formatLogMessage = (
  config: Pick<LoggerConfig, 'enableTimestamps' | 'enableContext'>,
  level: LogLevel,
  message: string,
  context?: string
): string => {
  const parts: string[] = [];

  if (config.enableTimestamps) {
    parts.push(`[${new Date().toISOString().slice(11, 23)}]`);
  }

  parts.push(`[${level.toUpperCase()}]`);

  if (context && config.enableContext) {
    parts.push(`[${context}]`);
  }

  parts.push(message);

  return parts.join(' ');
};
