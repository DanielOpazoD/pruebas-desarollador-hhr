import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { firebaseReady, mountConfigWarning } from '@/firebaseConfig';
import { getFirebaseStartupFailureMessage } from '@/services/auth/firebaseStartupUiPolicy';
import { prepareClientBootstrap } from '@/services/config/clientBootstrapRecovery';
import { createScopedLogger } from '@/services/utils/loggerScope';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
const bootLogger = createScopedLogger('Bootstrap');

const renderApp = () => {
  bootLogger.info('Rendering application');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

prepareClientBootstrap()
  .then(shouldContinue => {
    if (!shouldContinue) {
      return;
    }

    return firebaseReady.then(renderApp);
  })
  .catch(error => {
    bootLogger.error('Firebase initialization failed', error);
    mountConfigWarning(getFirebaseStartupFailureMessage());
  });
