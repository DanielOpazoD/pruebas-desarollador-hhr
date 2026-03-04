/**
 * useAppState Hook
 *
 * Centralizes all UI state management for the main App component.
 * Reduces complexity in App.tsx by extracting navigation, modal, and view state.
 *
 * @example
 * ```tsx
 * const appState = useAppState();
 * <Navbar currentModule={appState.currentModule} setModule={appState.setCurrentModule} />
 * <SettingsModal isOpen={appState.settingsModal.isOpen} onClose={appState.settingsModal.close} />
 * ```
 */

import { useState, useMemo } from 'react';
import { useModal, UseModalReturn } from './useModal';
import type { ModuleType } from '@/constants/navigationConfig';

const MODULES_FROM_URL: readonly ModuleType[] = [
  'CENSUS',
  'CUDYR',
  'NURSING_HANDOFF',
  'MEDICAL_HANDOFF',
  'AUDIT',
  'WHATSAPP',
  'TRANSFER_MANAGEMENT',
  'BACKUP_FILES',
  'PATIENT_MASTER_INDEX',
  'DATA_MAINTENANCE',
  'DIAGNOSTICS',
  'ROLE_MANAGEMENT',
  'ERRORS',
] as const;

const resolveInitialModule = (): ModuleType => {
  if (typeof window === 'undefined') return 'CENSUS';
  const rawModule = new URLSearchParams(window.location.search).get('module');
  if (!rawModule) return 'CENSUS';
  return MODULES_FROM_URL.includes(rawModule as ModuleType) ? (rawModule as ModuleType) : 'CENSUS';
};

export interface UseAppStateReturn {
  // Module navigation
  currentModule: ModuleType;
  setCurrentModule: (m: ModuleType) => void;

  // View modes
  censusViewMode: 'REGISTER' | 'ANALYTICS';
  setCensusViewMode: (m: 'REGISTER' | 'ANALYTICS') => void;

  // Modal states (using useModal)
  settingsModal: UseModalReturn;
  bedManagerModal: UseModalReturn;

  // Feature flags
  isTestAgentRunning: boolean;
  setIsTestAgentRunning: (v: boolean) => void;

  // Shift state (shared between views and global actions)
  selectedShift: 'day' | 'night';
  setSelectedShift: (s: 'day' | 'night') => void;

  // Derived state
  showPrintButton: boolean;

  // Bookmarks bar toggle
  showBookmarksBar: boolean;
  setShowBookmarksBar: (v: boolean) => void;

  // Census Local View Mode (Table vs 3D)
  censusLocalViewMode: 'TABLE' | '3D';
  setCensusLocalViewMode: (v: 'TABLE' | '3D') => void;
}

/**
 * Hook that manages all UI state for the main application shell
 */
export function useAppState(): UseAppStateReturn {
  // Module navigation
  const [currentModule, setCurrentModule] = useState<ModuleType>(() => resolveInitialModule());

  // View modes
  const [censusViewMode, setCensusViewMode] = useState<'REGISTER' | 'ANALYTICS'>('REGISTER');

  // Modal states using the new useModal hook
  const settingsModal = useModal();
  const bedManagerModal = useModal();

  // Feature flags
  const [isTestAgentRunning, setIsTestAgentRunning] = useState(false);

  // Bookmarks bar toggle
  const [showBookmarksBar, setShowBookmarksBar] = useState(false);

  // Shift state
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');

  // Census Local View Mode
  const [censusLocalViewMode, setCensusLocalViewMode] = useState<'TABLE' | '3D'>('TABLE');

  // Derived state
  const showPrintButton = useMemo(() => {
    return (
      currentModule === 'CUDYR' ||
      currentModule === 'NURSING_HANDOFF' ||
      currentModule === 'MEDICAL_HANDOFF'
    );
  }, [currentModule]);

  return {
    // Module navigation
    currentModule,
    setCurrentModule,

    // View modes
    censusViewMode,
    setCensusViewMode,

    // Modals
    settingsModal,
    bedManagerModal,

    // Feature flags
    isTestAgentRunning,
    setIsTestAgentRunning,

    // Shift
    selectedShift,
    setSelectedShift,

    // Derived
    showPrintButton,

    // Bookmarks
    showBookmarksBar,
    setShowBookmarksBar,

    // Census Local View Mode
    censusLocalViewMode,
    setCensusLocalViewMode,
  };
}

export default useAppState;
