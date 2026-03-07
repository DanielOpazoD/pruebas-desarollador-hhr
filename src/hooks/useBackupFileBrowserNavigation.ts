import { useCallback, useState } from 'react';
import type { BackupFolder } from '@/hooks/useBackupFilesQuery';
import type { BaseStoredFile, StoredPdfFile } from '@/types/backupArtifacts';
import type { BackupType } from '@/hooks/useBackupFileBrowser';
import { buildInitialBackupBrowserPath } from '@/hooks/backupFileBrowserController';

export interface BackupFileBrowserNavigationState {
  selectedBackupType: BackupType;
  path: string[];
  viewMode: 'grid' | 'list';
  searchQuery: string;
  previewFile: BaseStoredFile | StoredPdfFile | null;
}

export interface BackupFileBrowserNavigationHandlers {
  setViewMode: (viewMode: 'grid' | 'list') => void;
  setSearchQuery: (searchQuery: string) => void;
  setPreviewFile: (file: BaseStoredFile | StoredPdfFile | null) => void;
  changeBackupType: (type: BackupType) => void;
  handleFolderClick: (folderData: BackupFolder) => void;
  handleBreadcrumbNavigate: (index: number) => void;
}

interface UseBackupFileBrowserNavigationParams {
  initialBackupType: BackupType;
}

export const useBackupFileBrowserNavigation = ({
  initialBackupType,
}: UseBackupFileBrowserNavigationParams): BackupFileBrowserNavigationState &
  BackupFileBrowserNavigationHandlers => {
  const [selectedBackupType, setSelectedBackupType] = useState<BackupType>(initialBackupType);
  const [path, setPath] = useState<string[]>(() => buildInitialBackupBrowserPath());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<BaseStoredFile | StoredPdfFile | null>(null);

  const handleFolderClick = useCallback((folderData: BackupFolder) => {
    if (folderData.type === 'year') {
      setPath([folderData.name]);
      return;
    }

    if (folderData.type === 'month') {
      setPath(currentPath => [currentPath[0], folderData.name]);
    }
  }, []);

  const handleBreadcrumbNavigate = useCallback((index: number) => {
    setPath(currentPath => (index === -1 ? [] : currentPath.slice(0, index + 1)));
  }, []);

  const changeBackupType = useCallback((type: BackupType) => {
    setSelectedBackupType(type);
  }, []);

  return {
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
  };
};
