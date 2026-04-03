/**
 * Navbar - Main navigation bar component
 * Refactored to use smaller, specialized sub-components.
 */

import React, { useRef } from 'react';
import { WifiOff } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { NavbarMenu } from './NavbarMenu';
import { NavbarTabs } from './NavbarTabs';
import { UserMenu } from './UserMenu';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { ReminderBadge } from '@/components/reminders/ReminderBadge';
import { getVisibleAppModules } from '@/shared/access/operationalAccessPolicy';

import { ModuleType } from '@/constants/navigationConfig';
type ViewMode = 'REGISTER' | 'ANALYTICS';

interface NavbarProps {
  currentModule: ModuleType;
  setModule: (mod: ModuleType) => void;
  censusViewMode: ViewMode;
  setCensusViewMode: (mode: ViewMode) => void;
  onOpenBedManager: () => void;
  onExportCSV: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenSettings: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
  isFirebaseConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentModule,
  setModule,
  censusViewMode,
  setCensusViewMode,
  onImportJSON,
  onOpenSettings,
  userEmail,
  onLogout,
  isFirebaseConnected,
}) => {
  const { role } = useAuth();
  const visibleModules = getVisibleAppModules(role);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModuleChange = (mod: ModuleType) => {
    setModule(mod);
    if (mod === 'CENSUS') {
      setCensusViewMode('REGISTER');
    }
  };

  // Module Color Map
  const getNavColor = () => {
    switch (currentModule) {
      case 'CENSUS':
        return 'bg-gradient-to-r from-[#0a1628] via-medical-900 to-[#0f172a]';
      case 'NURSING_HANDOFF':
        return 'bg-sky-600';
      case 'MEDICAL_HANDOFF':
        return 'bg-sky-600';
      case 'AUDIT':
        return 'bg-slate-800';
      case 'TRANSFER_MANAGEMENT':
        return 'bg-sky-700';
      case 'BACKUP_FILES':
        return 'bg-slate-600';
      case 'PATIENT_MASTER_INDEX':
        return 'bg-blue-600';
      case 'DATA_MAINTENANCE':
        return 'bg-emerald-800';
      case 'DIAGNOSTICS':
        return 'bg-slate-900';
      case 'ROLE_MANAGEMENT':
        return 'bg-indigo-700';
      case 'REMINDERS':
        return 'bg-amber-700';
      case 'ERRORS':
        return 'bg-rose-900';
      default:
        return 'bg-gradient-to-r from-[#0a1628] via-medical-900 to-[#0f172a]';
    }
  };

  return (
    <nav
      className={clsx(
        getNavColor(),
        'text-white shadow-none sticky top-0 z-[60] print:hidden transition-colors duration-300 h-[56px] flex items-center'
      )}
      style={{ transform: 'translateZ(0)' }}
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 flex flex-wrap gap-4 justify-between items-center">
        {/* Brand with Dropdown Menu */}
        <NavbarMenu
          currentModule={currentModule}
          setModule={setModule}
          censusViewMode={censusViewMode}
          onOpenSettings={onOpenSettings}
          visibleModules={visibleModules}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json,.csv"
          onChange={onImportJSON}
        />

        {/* Main Navigation Tabs */}
        <NavbarTabs
          currentModule={currentModule}
          onModuleChange={handleModuleChange}
          visibleModules={visibleModules}
          censusViewMode={censusViewMode}
          setCensusViewMode={setCensusViewMode}
        />

        {/* Status Indicators & User Menu */}
        <div className="flex items-center gap-4 py-2 ml-auto">
          <div className="flex items-center gap-3">
            <SyncStatusIndicator />
            <ReminderBadge />

            {!isFirebaseConnected && (
              <WifiOff size={14} className="text-red-200/80" aria-hidden="true" />
            )}
          </div>

          {userEmail && onLogout && (
            <UserMenu
              userEmail={userEmail}
              role={role}
              isFirebaseConnected={isFirebaseConnected}
              onLogout={onLogout}
            />
          )}
        </div>
      </div>
    </nav>
  );
};
