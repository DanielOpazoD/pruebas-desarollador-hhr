import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { bootstrapAppRuntime } from '@/app-shell/bootstrap/bootstrapAppRuntime';
import { getFirebaseStartupFailureMessage } from '@/services/auth/firebaseStartupUiPolicy';
import { mountFirebaseConfigWarning } from '@/services/firebase-runtime/firebaseStartupDiagnostics';
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

bootstrapAppRuntime()
  .then(result => {
    if (result.status === 'reload') {
      return;
    }

    if (result.status === 'blocked') {
      mountFirebaseConfigWarning(result.message, result.warningCopy);
      return;
    }

    renderApp();
  })
  .catch(error => {
    bootLogger.error('Firebase initialization failed', error);
    mountFirebaseConfigWarning(getFirebaseStartupFailureMessage());
  });
