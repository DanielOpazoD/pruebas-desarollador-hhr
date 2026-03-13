import { shouldLogIndexedDbRuntimeWarning } from './indexedDbRecoveryPolicy';
import { recordIndexedDbRecoveryNotice } from './indexedDbRecoveryController';

type IndexedDbEventSource = {
  on: (event: 'blocked' | 'close', callback: () => void) => void;
};

type IndexedDbRuntimeState = {
  isUsingMock: boolean;
  stickyFallbackMode: boolean;
};

export const attachIndexedDbWarningBindings = (
  database: IndexedDbEventSource,
  getRuntimeState: () => IndexedDbRuntimeState,
  emittedWarnings: Set<string>
): void => {
  database.on('blocked', () => {
    if (
      shouldLogIndexedDbRuntimeWarning(
        'blocked',
        getRuntimeState().stickyFallbackMode,
        emittedWarnings
      )
    ) {
      recordIndexedDbRecoveryNotice(
        'indexeddb_blocked',
        'La base IndexedDB fue bloqueada por otra pestana.',
        { stickyFallbackMode: getRuntimeState().stickyFallbackMode }
      );
    }
  });

  database.on('close', () => {
    const runtimeState = getRuntimeState();
    if (
      !runtimeState.isUsingMock &&
      shouldLogIndexedDbRuntimeWarning(
        'unexpected-close',
        runtimeState.stickyFallbackMode,
        emittedWarnings
      )
    ) {
      recordIndexedDbRecoveryNotice(
        'indexeddb_unexpected_close',
        'La conexion de IndexedDB se cerro de forma inesperada.',
        { stickyFallbackMode: runtimeState.stickyFallbackMode }
      );
    }
  });
};
