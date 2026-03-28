import type { LogLevel } from '@/services/utils/loggerTypes';

export const emitConsoleLog = (level: LogLevel, formattedMessage: string, data?: unknown): void => {
  const payload = data !== undefined ? data : '';

  switch (level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(formattedMessage, payload);
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info(formattedMessage, payload);
      break;
    case 'warn':
      console.warn(formattedMessage, payload);
      break;
    case 'error':
      console.error(formattedMessage, payload);
      break;
  }
};
