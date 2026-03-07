import { useEffect, useMemo, useRef } from 'react';
import { useNotification, useConfirmDialog } from '@/context/UIContext';
import { useBackupFilesQuery } from '@/hooks/useBackupFilesQuery';
import { useAuth } from '@/context/AuthContext';
import { useBackupFileBrowserNavigation } from '@/hooks/useBackupFileBrowserNavigation';
import { useBackupFileBrowserActions } from '@/hooks/useBackupFileBrowserActions';
import {
  filterBackupBrowserItems,
  resolveCanRunMagicBackfill,
} from '@/hooks/backupFileBrowserController';
import { presentBackupListingOutcome } from '@/hooks/controllers/backupStorageOutcomeController';

export type BackupType = 'handoff' | 'census' | 'cudyr';

export const useBackupFileBrowser = (initialBackupType: BackupType = 'handoff') => {
  const { success, warning, info, error: notifyError } = useNotification();
  const { confirm } = useConfirmDialog();
  const { role } = useAuth();
  const canDelete = role === 'admin';
  const lastReportSignatureRef = useRef('');

  const navigation = useBackupFileBrowserNavigation({
    initialBackupType,
  });
  const {
    selectedBackupType,
    path,
    viewMode,
    searchQuery,
    previewFile,
    setViewMode,
    setSearchQuery,
    setPreviewFile,
    changeBackupType,
    handleFolderClick,
    handleBreadcrumbNavigate,
  } = navigation;

  const {
    data: items = [],
    listingOutcome,
    isLoading,
    isRefetching,
    refetch,
  } = useBackupFilesQuery(selectedBackupType, path);
  const filteredItems = useMemo(
    () => filterBackupBrowserItems(items, searchQuery),
    [items, searchQuery]
  );
  const canRunMagicBackfill = resolveCanRunMagicBackfill(role, path, isLoading);

  const {
    isMagicBackfilling,
    magicBackfillProgress,
    handleDelete,
    handleDownload,
    handleMagicMonthBackfill,
  } = useBackupFileBrowserActions({
    selectedBackupType,
    path,
    role,
    items,
    refetch,
    notifications: {
      success,
      warning,
      info,
      error: notifyError,
    },
    confirm,
  });

  useEffect(() => {
    const signature = JSON.stringify(listingOutcome);
    if (lastReportSignatureRef.current === signature) {
      return;
    }
    lastReportSignatureRef.current = signature;

    if (!listingOutcome) {
      return;
    }

    const notice = presentBackupListingOutcome(listingOutcome);
    if (notice?.channel === 'warning') {
      warning(notice.title || 'Respaldos', notice.message);
      return;
    }
    if (notice?.channel === 'info') {
      info(notice.title || 'Respaldos', notice.message);
      return;
    }
    if (notice?.channel === 'error') {
      notifyError(notice.title || 'Respaldos', notice.message);
    }
  }, [info, listingOutcome, notifyError, warning]);

  return {
    selectedBackupType,
    path,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    previewFile,
    setPreviewFile,
    items,
    filteredItems,
    isLoading,
    isRefetching,
    canDelete,
    canRunMagicBackfill,
    isMagicBackfilling,
    magicBackfillProgress,
    refetch,
    handlers: {
      handleFolderClick,
      handleBreadcrumbNavigate,
      handleDelete,
      handleDownload,
      changeBackupType,
      handleMagicMonthBackfill,
    },
  };
};
