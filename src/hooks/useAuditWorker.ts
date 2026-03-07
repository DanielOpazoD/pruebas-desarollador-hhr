import { useState, useEffect, useRef, useCallback } from 'react';
import { AuditLogEntry, GroupedAuditLogEntry, AuditStats, WorkerFilterParams } from '@/types/audit';
import {
  buildInitialAuditWorkerResults,
  normalizeAuditWorkerErrorMessage,
} from '@/hooks/controllers/auditWorkerController';
import {
  createAuditWorkerAdapter,
  type AuditWorkerAdapter,
} from '@/hooks/controllers/auditWorkerAdapter';

export interface AuditWorkerResults {
  filteredLogs: AuditLogEntry[];
  displayLogs: (AuditLogEntry | GroupedAuditLogEntry)[];
  stats: AuditStats | null;
}

export const useAuditWorker = () => {
  const [results, setResults] = useState<AuditWorkerResults>(buildInitialAuditWorkerResults());
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<AuditWorkerAdapter | null>(null);

  useEffect(() => {
    const adapter = createAuditWorkerAdapter({
      onProcessed(payload) {
        setResults(payload as AuditWorkerResults);
        setIsProcessing(false);
      },
      onError(message) {
        console.error('[AuditWorker Hook] Error:', normalizeAuditWorkerErrorMessage(message));
        setIsProcessing(false);
      },
    });
    workerRef.current = adapter;

    return () => {
      adapter.dispose();
    };
  }, []);

  const processData = useCallback(
    (
      logs: AuditLogEntry[],
      params: WorkerFilterParams,
      actionLabels: Record<string, string>,
      criticalActions: string[]
    ) => {
      if (!workerRef.current) return;

      setIsProcessing(true);
      workerRef.current.processData(logs, params, actionLabels, criticalActions);
    },
    []
  );

  return {
    results,
    isProcessing,
    processData,
  };
};
