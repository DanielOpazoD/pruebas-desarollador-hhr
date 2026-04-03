/**
 * Table Configuration Context
 * Manages table column widths with Firebase sync
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  TableConfig,
  TableColumnConfig,
  getDefaultConfig,
  DEFAULT_COLUMN_WIDTHS,
  saveTableConfig,
  setFirestoreEnabled as setTableConfigFirestoreEnabled,
  subscribeToTableConfig,
  exportTableConfig,
  importTableConfig,
} from '@/services/storage/tableConfigService';
import { useAuthState } from '@/hooks/useAuthState';
import { resolveRemoteSyncRuntimeStatus } from '@/services/repositories/repositoryConfig';
import { tableConfigLogger } from '@/services/storage/storageLoggers';

// ============================================================================
// Context Types
// ============================================================================

interface TableConfigContextType {
  config: TableConfig;
  isEditMode: boolean;
  isLoading: boolean;
  setEditMode: (enabled: boolean) => void;
  updateColumnWidth: (column: keyof TableColumnConfig, width: number) => void;
  updatePageMargin: (margin: number) => void;
  resetToDefaults: () => void;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const TableConfigContext = createContext<TableConfigContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export const TableConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authLoading, isFirebaseConnected } = useAuthState();
  const [config, setConfig] = useState<TableConfig>(getDefaultConfig);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const remoteSyncStatus = resolveRemoteSyncRuntimeStatus({
    authLoading,
    isFirebaseConnected,
  });

  // Debounce timer for saves
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localUpdateRef = useRef(false);

  // Load initial config and subscribe
  useEffect(() => {
    setTableConfigFirestoreEnabled(remoteSyncStatus === 'ready');

    if (remoteSyncStatus === 'bootstrapping') {
      setIsLoading(true);
      return;
    }

    if (remoteSyncStatus !== 'ready') {
      setConfig(getDefaultConfig());
      setIsLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTableConfig(newConfig => {
      // Skip if this update came from our local save
      if (!localUpdateRef.current) {
        setConfig(newConfig);
      }
      localUpdateRef.current = false;
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [remoteSyncStatus]);

  // Debounced save to Firebase
  const debouncedSave = useCallback((newConfig: TableConfig) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      localUpdateRef.current = true;
      saveTableConfig(newConfig).catch(error => {
        tableConfigLogger.error('Failed to persist table config from debounce', error);
      });
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  // Update single column width
  const updateColumnWidth = useCallback(
    (column: keyof TableColumnConfig, width: number) => {
      setConfig(prev => {
        const newConfig = {
          ...prev,
          columns: {
            ...prev.columns,
            [column]: Math.max(24, Math.min(400, width)), // Clamp between 24-400px
          },
        };
        debouncedSave(newConfig);
        return newConfig;
      });
    },
    [debouncedSave]
  );

  // Update page margin
  const updatePageMargin = useCallback(
    (margin: number) => {
      setConfig(prev => {
        const newConfig = {
          ...prev,
          pageMargin: Math.max(0, Math.min(64, margin)), // Clamp between 0-64px
        };
        debouncedSave(newConfig);
        return newConfig;
      });
    },
    [debouncedSave]
  );

  // Reset to default widths
  const resetToDefaults = useCallback(() => {
    const newConfig = getDefaultConfig();
    setConfig(newConfig);
    saveTableConfig(newConfig).catch(error => {
      tableConfigLogger.error('Failed to reset table config to defaults', error);
    });
  }, []);

  // Export current config
  const exportConfig = useCallback(() => {
    exportTableConfig(config);
  }, [config]);

  // Import config from file
  const handleImportConfig = useCallback(async (file: File) => {
    try {
      const importedConfig = await importTableConfig(file);
      setConfig(importedConfig);
      await saveTableConfig(importedConfig);
    } catch (error) {
      tableConfigLogger.error('Failed to import config', error);
      throw error;
    }
  }, []);

  // Toggle edit mode
  const setEditMode = useCallback((enabled: boolean) => {
    setIsEditMode(enabled);
  }, []);

  return (
    <TableConfigContext.Provider
      value={{
        config,
        isEditMode,
        isLoading,
        setEditMode,
        updateColumnWidth,
        updatePageMargin,
        resetToDefaults,
        exportConfig,
        importConfig: handleImportConfig,
      }}
    >
      {children}
    </TableConfigContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

export const useTableConfig = (): TableConfigContextType => {
  const context = useContext(TableConfigContext);
  if (!context) {
    throw new Error('useTableConfig must be used within a TableConfigProvider');
  }
  return context;
};

// Re-export types and utilities
export type { TableConfig, TableColumnConfig };
export { DEFAULT_COLUMN_WIDTHS };
