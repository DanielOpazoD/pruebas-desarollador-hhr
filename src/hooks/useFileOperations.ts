import React from 'react';
import * as ExportService from '@/services/exporters/exportService';
import { DailyRecord } from '@/types';
import { useNotification } from '@/context/UIContext';
import { buildJsonImportNotifications } from '@/hooks/controllers/fileImportFeedbackController';
import {
  buildExportCsvNotification,
  buildExportJsonNotification,
  buildImportFileErrorNotification,
} from '@/hooks/controllers/fileOperationsFeedbackController';
import {
  isJsonImportFile,
  shouldRefreshAfterJsonImport,
} from '@/hooks/controllers/fileOperationsController';

export interface UseFileOperationsReturn {
  handleExportJSON: () => void;
  handleExportCSV: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportFile: (file: File) => Promise<void>;
}

/**
 * Hook to manage file import/export operations
 * Extracts file handling logic from App.tsx for cleaner separation of concerns
 */
export const useFileOperations = (
  record: DailyRecord | null,
  onRefresh: () => void
): UseFileOperationsReturn => {
  const { success, error, warning } = useNotification();
  const dispatchNotification = (notification: {
    channel: 'success' | 'warning' | 'error';
    title: string;
    message?: string;
  }) => {
    if (notification.channel === 'success') {
      success(notification.title, notification.message);
    } else if (notification.channel === 'warning') {
      warning(notification.title, notification.message);
    } else {
      error(notification.title, notification.message);
    }
  };

  const handleExportJSON = () => {
    try {
      ExportService.exportDataJSON();
      dispatchNotification(buildExportJsonNotification('success'));
    } catch (_err) {
      dispatchNotification(buildExportJsonNotification('error'));
    }
  };

  const handleExportCSV = () => {
    try {
      ExportService.exportDataCSV(record);
      dispatchNotification(buildExportCsvNotification('success'));
    } catch (_err) {
      dispatchNotification(buildExportCsvNotification('error'));
    }
  };

  const handleImportFile = async (file: File) => {
    if (isJsonImportFile(file)) {
      try {
        const result = await ExportService.importDataJSONDetailed(file);
        if (result.success) {
          for (const notification of buildJsonImportNotifications(result)) {
            dispatchNotification(notification);
          }
          if (shouldRefreshAfterJsonImport(result)) {
            onRefresh();
          }
        } else {
          dispatchNotification(buildImportFileErrorNotification('import_failed'));
        }
      } catch (_err) {
        dispatchNotification(buildImportFileErrorNotification('processing_failed'));
      }
    } else {
      dispatchNotification(buildImportFileErrorNotification('invalid_format'));
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleImportFile(e.target.files[0]);
      // Reset input
      e.target.value = '';
    }
  };

  return {
    handleExportJSON,
    handleExportCSV,
    handleImportJSON,
    handleImportFile,
  };
};
