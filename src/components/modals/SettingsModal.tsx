import React, { useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { Modal } from '@/core/ui';
import { useTableConfig } from '@/context/TableConfigContext';
import { useUISettings } from '@/context/UISettingsContext';
import { UserRole } from '@/types';
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import {
  settingsTabs,
  SettingsDiagnosticsTab,
  SettingsSecurityTab,
  SettingsTabId,
  SettingsTableTab,
  SettingsVisualTab,
} from './SettingsModalTabs';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunTest: () => void;
  canDownloadPassport?: boolean;
  onDownloadPassport?: (role: UserRole) => Promise<boolean>;
  isOfflineMode?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onRunTest,
  canDownloadPassport = false,
  onDownloadPassport,
  isOfflineMode = false,
}) => {
  const {
    config,
    exportConfig,
    importConfig,
    resetToDefaults,
    isEditMode,
    setEditMode,
    updatePageMargin,
  } = useTableConfig();
  const { settings, updateSetting } = useUISettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('visual');
  const [selectedPassportRole, setSelectedPassportRole] = useState<'admin' | 'nurse_hospital'>(
    'admin'
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePassportDownload = async () => {
    if (!onDownloadPassport) return;

    setIsGenerating(true);
    try {
      const success = await onDownloadPassport(selectedPassportRole);
      if (success) onClose();
    } catch (error) {
      console.error('Error generando pasaporte:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importConfig(file);
        defaultBrowserWindowRuntime.alert('Configuración importada correctamente');
      } catch {
        defaultBrowserWindowRuntime.alert('Error al importar: archivo inválido');
      }
      event.target.value = '';
    }
  };

  const handleReset = () => {
    if (
      defaultBrowserWindowRuntime.confirm(
        '¿Está seguro de resetear la configuración de columnas a valores por defecto?'
      )
    ) {
      resetToDefaults();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración"
      icon={<Settings size={18} />}
      size="lg"
      className="max-h-[88vh]"
      bodyClassName="flex-1 overflow-hidden p-4 md:p-5"
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="pb-1">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm md:grid-cols-4">
            {settingsTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={15} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === 'visual' && (
            <SettingsVisualTab settings={settings} updateSetting={updateSetting} />
          )}
          {activeTab === 'table' && (
            <SettingsTableTab
              pageMargin={config.pageMargin}
              exportConfig={exportConfig}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              handleImportClick={handleImportClick}
              handleReset={handleReset}
              isEditMode={isEditMode}
              onClose={onClose}
              setEditMode={setEditMode}
              updatePageMargin={updatePageMargin}
            />
          )}
          {activeTab === 'security' && (
            <SettingsSecurityTab
              canDownloadPassport={canDownloadPassport}
              handlePassportDownload={handlePassportDownload}
              isGenerating={isGenerating}
              isOfflineMode={isOfflineMode}
              onDownloadPassport={onDownloadPassport}
              selectedPassportRole={selectedPassportRole}
              setSelectedPassportRole={setSelectedPassportRole}
            />
          )}
          {activeTab === 'diagnostics' && (
            <SettingsDiagnosticsTab onClose={onClose} onRunTest={onRunTest} />
          )}
        </div>
      </div>
    </Modal>
  );
};
