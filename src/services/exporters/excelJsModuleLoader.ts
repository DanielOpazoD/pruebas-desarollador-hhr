interface ExcelJSModuleType {
  Workbook: typeof import('exceljs').Workbook;
  default?:
    | {
        Workbook: typeof import('exceljs').Workbook;
      }
    | typeof import('exceljs').Workbook;
}

export const loadExcelJSModule = async (): Promise<ExcelJSModuleType> => {
  const isBrowserRuntime = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowserRuntime) {
    try {
      return (await import('exceljs/dist/exceljs.min.js')) as unknown as ExcelJSModuleType;
    } catch {
      // Fall back to standard entrypoint if the browser build cannot be loaded.
    }
  }

  return (await import('exceljs')) as unknown as ExcelJSModuleType;
};

export const resolveExcelWorkbookConstructor = (
  excelModule: ExcelJSModuleType
): typeof import('exceljs').Workbook => {
  if (excelModule.Workbook) {
    return excelModule.Workbook;
  }

  if (excelModule.default && 'Workbook' in excelModule.default) {
    return excelModule.default.Workbook;
  }

  if (typeof excelModule.default === 'object' && excelModule.default !== null) {
    const defaultObj = excelModule.default as { Workbook?: typeof import('exceljs').Workbook };
    if (defaultObj.Workbook) {
      return defaultObj.Workbook;
    }
  }

  throw new Error(
    'ExcelJS module could not be loaded correctly. Check vite.config.ts optimizeDeps.include.'
  );
};
