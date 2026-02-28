/**
 * Sync Watcher
 * Observes sync status changes and shows notifications accordingly.
 * This component must be placed inside UIProvider.
 */

import React, { useEffect, useRef } from 'react';
import { useNotification } from '@/context/UIContext';
import { useDailyRecordStatus } from '@/context/DailyRecordContext';
import { useAuth } from '@/context/AuthContext';

export const SyncWatcher: React.FC = () => {
  const { syncStatus } = useDailyRecordStatus();
  const { error, success, warning } = useNotification();
  const { isFirebaseConnected } = useAuth();

  // Track previous status to detect changes
  const prevStatusRef = useRef(syncStatus);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = syncStatus;

    // Only show notification when status changes
    if (prevStatus === syncStatus) return;

    if (syncStatus === 'error' && prevStatus !== 'error') {
      error(
        'Error de sincronización',
        'Los cambios se guardaron localmente pero no se pudieron sincronizar con el servidor.'
      );
    }

    // Warn if saved but offline
    if (syncStatus === 'saved' && prevStatus !== 'saved') {
      if (!isFirebaseConnected) {
        warning('Sin conexión', 'Guardado localmente. Se sincronizará al recuperar conexión.');
      }
    }

    // Optionally show success after saving (uncomment if desired)
    // if (syncStatus === 'saved' && prevStatus === 'saving') {
    //     success('Guardado', 'Cambios sincronizados correctamente');
    // }
  }, [syncStatus, error, success, warning, isFirebaseConnected]);

  return null; // This component doesn't render anything
};
