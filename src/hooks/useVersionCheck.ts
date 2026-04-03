import { useEffect, useRef } from 'react';
import { reconcileBootstrapRuntime } from '@/app-shell/bootstrap/bootstrapAppRuntime';
import { versionCheckLogger } from '@/hooks/hookLoggers';

export const useVersionCheck = (): void => {
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once per session
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkVersion = async () => {
      try {
        await reconcileBootstrapRuntime();
      } catch (error) {
        versionCheckLogger.warn('Check failed (offline?)', error);
      }
    };

    // Small delay to not block initial render
    setTimeout(checkVersion, 1000);
  }, []);
};
