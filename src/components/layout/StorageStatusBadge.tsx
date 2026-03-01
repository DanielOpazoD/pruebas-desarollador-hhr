import React, { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Database, RefreshCw } from 'lucide-react';
import { resetLocalDatabase } from '@/services/storage/indexedDBService';
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import { useDatabaseFallbackStatus } from '@/hooks/useDatabaseFallbackStatus';

/**
 * StorageStatusBadge
 *
 * Persistent warning shown only when IndexedDB fails and the system
 * is operating in degraded fallback mode.
 */
const STORAGE_AUTO_RECOVERY_KEY = 'hhr_storage_auto_recovery_attempted_v1';

const StorageStatusBadge: React.FC = () => {
  const isFallback = useDatabaseFallbackStatus();
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [shouldShowBanner, setShouldShowBanner] = useState(false);

  useEffect(() => {
    if (!isFallback) {
      setShouldShowBanner(false);
      return;
    }

    if (typeof window === 'undefined' || !window.sessionStorage) {
      setShouldShowBanner(true);
      return;
    }

    const alreadyTriedAutoRecovery =
      window.sessionStorage.getItem(STORAGE_AUTO_RECOVERY_KEY) === 'true';

    if (!alreadyTriedAutoRecovery) {
      window.sessionStorage.setItem(STORAGE_AUTO_RECOVERY_KEY, 'true');
      defaultBrowserWindowRuntime.reload();
      return;
    }

    setShouldShowBanner(true);
  }, [isFallback]);

  if (!isFallback || !isVisible || !shouldShowBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] storage-status-badge-bounce">
      <div className="bg-amber-50 border border-amber-200 shadow-lg rounded-xl p-3 max-w-sm flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-full shrink-0">
          <AlertTriangle className="text-amber-600 w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-amber-900 font-bold text-sm flex items-center gap-2">
            Almacenamiento Local Limitado
          </h4>
          <p className="text-amber-800 text-xs mt-1 leading-relaxed">
            La app sigue funcionando. Después de este cambio del navegador, conviene
            <strong> recargar una vez</strong> para recuperar el guardado normal.
          </p>
          {showDetails ? (
            <div className="mt-2 rounded-lg bg-amber-100/70 px-3 py-2 text-[11px] text-amber-900 leading-relaxed">
              Esto suele pasar después de borrar los datos del sitio en el navegador. Normalmente se
              soluciona recargando la página. Si el aviso sigue apareciendo varias veces seguidas,
              puedes usar la opción avanzada para reiniciar el almacenamiento local de esta app.
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={defaultBrowserWindowRuntime.reload}
              className="text-[11px] bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Recargar
            </button>
            <button
              onClick={() => setShowDetails(current => !current)}
              className="text-[11px] text-amber-700 hover:text-amber-900 px-1 py-1.5 font-medium flex items-center gap-1"
            >
              {showDetails ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {showDetails ? 'Ocultar detalle' : 'Más información'}
            </button>
            {showDetails ? (
              <button
                onClick={resetLocalDatabase}
                className="text-[11px] bg-white border border-amber-300 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
              >
                <Database className="w-3 h-3" /> Reiniciar guardado local
              </button>
            ) : null}
            <button
              onClick={() => setIsVisible(false)}
              className="text-[11px] text-amber-500 hover:text-amber-700 font-medium ml-auto"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageStatusBadge;
