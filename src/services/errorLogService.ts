import {
  getErrorLogs,
  clearErrorLogs,
} from '@/services/storage/indexeddb/indexedDbErrorLogService';

export const fetchErrorLogs = async (limit = 50) => getErrorLogs(limit);

export const purgeErrorLogs = async () => clearErrorLogs();
