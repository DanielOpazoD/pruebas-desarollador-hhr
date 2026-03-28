import React from 'react';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { TestAgent } from '@/components/debug/TestAgent';
import { SyncWatcher } from '@/components/shared/SyncWatcher';
import StorageStatusBadge from '@/components/layout/StorageStatusBadge';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { CensusEmailConfigModal } from '@/views/LazyViews';
import { ReminderModal } from '@/components/reminders/ReminderModal';
import type { UseUIStateReturn } from '@/hooks/useUIState';
import type { AppContentRuntime } from '@/components/layout/app-content/useAppContentRuntime';

export interface AppContentOverlaysProps {
  ui: UseUIStateReturn;
  runtime: AppContentRuntime;
}

export const AppContentOverlays: React.FC<AppContentOverlaysProps> = ({ ui, runtime }) => {
  const {
    censusEmail,
    dateNav: { currentDateString },
    nurseSignature,
    record,
  } = runtime;

  return (
    <>
      <SettingsModal
        isOpen={ui.settingsModal.isOpen}
        onClose={ui.settingsModal.close}
        onRunTest={() => ui.setIsTestAgentRunning(true)}
      />
      <ReminderModal />

      {censusEmail.showEmailConfig && (
        <React.Suspense fallback={null}>
          <CensusEmailConfigModal
            isOpen={true}
            onClose={() => censusEmail.setShowEmailConfig(false)}
            recipients={censusEmail.recipients}
            onRecipientsChange={censusEmail.setRecipients}
            recipientLists={censusEmail.recipientLists}
            activeRecipientListId={censusEmail.activeRecipientListId}
            onActiveRecipientListChange={censusEmail.setActiveRecipientListId}
            onCreateRecipientList={censusEmail.createRecipientList}
            onRenameRecipientList={censusEmail.renameActiveRecipientList}
            onDeleteRecipientList={censusEmail.deleteRecipientList}
            recipientsSource={censusEmail.recipientsSource}
            isRecipientsSyncing={censusEmail.isRecipientsSyncing}
            recipientsSyncError={censusEmail.recipientsSyncError}
            message={censusEmail.message}
            onMessageChange={censusEmail.onMessageChange}
            onResetMessage={censusEmail.onResetMessage}
            date={currentDateString}
            nursesSignature={nurseSignature}
            isAdminUser={censusEmail.isAdminUser}
            testModeEnabled={censusEmail.testModeEnabled}
            onTestModeChange={censusEmail.setTestModeEnabled}
            testRecipient={censusEmail.testRecipient}
            onTestRecipientChange={censusEmail.setTestRecipient}
          />
        </React.Suspense>
      )}

      <TestAgent
        isRunning={ui.isTestAgentRunning}
        onComplete={() => ui.setIsTestAgentRunning(false)}
        currentRecord={record}
      />

      <SyncWatcher />
      <PinLockScreen />
      <StorageStatusBadge />
    </>
  );
};
