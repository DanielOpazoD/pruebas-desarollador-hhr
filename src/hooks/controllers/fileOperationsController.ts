import type { JsonImportResult } from '@/services/exporters/exportImportJson';

export const isJsonImportFile = (file: File): boolean => file.name.endsWith('.json');

export const shouldRefreshAfterJsonImport = (result: JsonImportResult): boolean => result.success;
