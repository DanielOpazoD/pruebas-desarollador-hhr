import React from 'react';
import {
  usePatientRowOrbitalLauncherMachine,
  type PatientRowOrbitalLauncherPhase,
} from '@/features/census/components/patient-row/usePatientRowOrbitalLauncherMachine';

const HOVER_FINE_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';
const LAUNCHER_OPEN_EVENT = 'patient-row-orbital-launcher-open-change';
const LAUNCHER_OWNER_EVENT = 'patient-row-orbital-launcher-owner-change';
const HOVER_EXIT_GRACE_MS = 120;

interface LauncherPosition {
  left: number;
  top: number;
}

interface LauncherActiveChangeDetail {
  rowId: string | null;
}

interface UsePatientRowOrbitalLauncherRuntimeParams {
  hasQuickActions: boolean;
  isOpen: boolean;
  launcherOffset: number;
  wrapperWidth: number;
  wrapperHeight: number;
  triggerCenterX: number;
  triggerCenterY: number;
}

interface UsePatientRowOrbitalLauncherRuntimeResult {
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  position: LauncherPosition | null;
  phase: PatientRowOrbitalLauncherPhase;
  showTrigger: boolean;
  supportsHoverFine: boolean;
  handleLauncherMouseEnter: () => void;
  handleLauncherMouseLeave: () => void;
}

const dispatchLauncherOpenChange = (rowId: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LauncherActiveChangeDetail>(LAUNCHER_OPEN_EVENT, {
      detail: { rowId },
    })
  );
};

const dispatchLauncherOwnerChange = (rowId: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LauncherActiveChangeDetail>(LAUNCHER_OWNER_EVENT, {
      detail: { rowId },
    })
  );
};

const resolveSupportsHoverFine = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  return window.matchMedia(HOVER_FINE_MEDIA_QUERY).matches;
};

const resolveRowElement = (anchor: HTMLElement | null): HTMLTableRowElement | null => {
  if (!anchor) {
    return null;
  }

  return anchor.closest('tr[data-testid="patient-row"]') as HTMLTableRowElement | null;
};

const resolveRowId = (row: HTMLTableRowElement | null): string | null => row?.dataset.bedId ?? null;

const resolveLauncherPosition = (
  row: HTMLTableRowElement | null,
  launcherOffset: number,
  _wrapperWidth: number,
  _wrapperHeight: number,
  triggerCenterX: number,
  triggerCenterY: number
): LauncherPosition | null => {
  if (!row) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  const rawLeft = rect.left - launcherOffset - triggerCenterX;
  const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - _wrapperWidth - 8));

  return {
    left: clampedLeft,
    top: rect.top + rect.height / 2 - triggerCenterY,
  };
};

export const usePatientRowOrbitalLauncherRuntime = ({
  hasQuickActions,
  isOpen,
  launcherOffset,
  wrapperWidth,
  wrapperHeight,
  triggerCenterX,
  triggerCenterY,
}: UsePatientRowOrbitalLauncherRuntimeParams): UsePatientRowOrbitalLauncherRuntimeResult => {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const [supportsHoverFine, setSupportsHoverFine] = React.useState(resolveSupportsHoverFine);
  const [isRowHovered, setIsRowHovered] = React.useState(false);
  const [isLauncherHovered, setIsLauncherHovered] = React.useState(false);
  const [isHoverGraceActive, setIsHoverGraceActive] = React.useState(false);
  const [position, setPosition] = React.useState<LauncherPosition | null>(null);
  const [rowId, setRowId] = React.useState<string | null>(null);
  const [activeLauncherRowId, setActiveLauncherRowId] = React.useState<string | null>(null);
  const [ownerLauncherRowId, setOwnerLauncherRowId] = React.useState<string | null>(null);
  const ownerLauncherRowIdRef = React.useRef<string | null>(null);
  const hoverExitTimerRef = React.useRef<number | null>(null);

  // Refs to avoid stale closures in timers
  const isOpenRef = React.useRef(isOpen);
  const isLauncherHoveredRef = React.useRef(isLauncherHovered);
  const isRowHoveredRef = React.useRef(isRowHovered);
  const rowIdRef = React.useRef(rowId);

  React.useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  React.useEffect(() => {
    isLauncherHoveredRef.current = isLauncherHovered;
  }, [isLauncherHovered]);
  React.useEffect(() => {
    isRowHoveredRef.current = isRowHovered;
  }, [isRowHovered]);
  React.useEffect(() => {
    rowIdRef.current = rowId;
  }, [rowId]);

  const clearHoverExitTimer = React.useCallback(() => {
    if (hoverExitTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(hoverExitTimerRef.current);
      hoverExitTimerRef.current = null;
    }
  }, []);

  const armHoverGrace = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    clearHoverExitTimer();
    setIsHoverGraceActive(true);
    hoverExitTimerRef.current = window.setTimeout(() => {
      setIsHoverGraceActive(false);
      // Use refs to read current values, avoiding stale closures
      if (
        ownerLauncherRowIdRef.current === rowIdRef.current &&
        !isOpenRef.current &&
        !isLauncherHoveredRef.current &&
        !isRowHoveredRef.current
      ) {
        dispatchLauncherOwnerChange(null);
      }
      hoverExitTimerRef.current = null;
    }, HOVER_EXIT_GRACE_MS);
  }, [clearHoverExitTimer]);

  // Reset all hover state when tab goes to background (prevents ghost launchers)
  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearHoverExitTimer();
        setIsRowHovered(false);
        setIsLauncherHovered(false);
        setIsHoverGraceActive(false);
        if (ownerLauncherRowIdRef.current === rowIdRef.current) {
          dispatchLauncherOwnerChange(null);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearHoverExitTimer]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(HOVER_FINE_MEDIA_QUERY);
    const sync = (event?: MediaQueryListEvent) => {
      setSupportsHoverFine(event ? event.matches : mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener('change', sync);
    return () => {
      mediaQuery.removeEventListener('change', sync);
    };
  }, []);

  React.useEffect(() => {
    const row = resolveRowElement(anchorRef.current);
    if (!row) {
      return;
    }

    const resolvedRowId = resolveRowId(row);
    setRowId(resolvedRowId);

    const syncPosition = () => {
      setPosition(
        resolveLauncherPosition(
          row,
          launcherOffset,
          wrapperWidth,
          wrapperHeight,
          triggerCenterX,
          triggerCenterY
        )
      );
    };

    const handleRowMouseEnter = () => {
      clearHoverExitTimer();
      setIsHoverGraceActive(true);
      setIsRowHovered(true);
      if (resolvedRowId) {
        dispatchLauncherOwnerChange(resolvedRowId);
      }
      syncPosition();
    };

    const handleRowMouseLeave = () => {
      setIsRowHovered(false);
      armHoverGrace();
    };

    const handleFocusIn = () => {
      clearHoverExitTimer();
      setIsHoverGraceActive(true);
      setIsRowHovered(true);
      if (resolvedRowId) {
        dispatchLauncherOwnerChange(resolvedRowId);
      }
      syncPosition();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }
      setIsRowHovered(false);
      armHoverGrace();
    };

    syncPosition();

    row.addEventListener('mouseenter', handleRowMouseEnter);
    row.addEventListener('mouseleave', handleRowMouseLeave);
    row.addEventListener('focusin', handleFocusIn);
    row.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncPosition);
      resizeObserver.observe(row);
    }

    return () => {
      row.removeEventListener('mouseenter', handleRowMouseEnter);
      row.removeEventListener('mouseleave', handleRowMouseLeave);
      row.removeEventListener('focusin', handleFocusIn);
      row.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', syncPosition);
      window.removeEventListener('scroll', syncPosition, true);
      resizeObserver?.disconnect();
      clearHoverExitTimer();
    };
  }, [
    armHoverGrace,
    clearHoverExitTimer,
    launcherOffset,
    triggerCenterX,
    triggerCenterY,
    wrapperHeight,
    wrapperWidth,
  ]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOpenChange = (event: Event) => {
      const detail = (event as CustomEvent<LauncherActiveChangeDetail>).detail;
      setActiveLauncherRowId(detail?.rowId ?? null);
    };
    const handleOwnerChange = (event: Event) => {
      const detail = (event as CustomEvent<LauncherActiveChangeDetail>).detail;
      setOwnerLauncherRowId(detail?.rowId ?? null);
    };

    window.addEventListener(LAUNCHER_OPEN_EVENT, handleOpenChange as EventListener);
    window.addEventListener(LAUNCHER_OWNER_EVENT, handleOwnerChange as EventListener);
    return () => {
      window.removeEventListener(LAUNCHER_OPEN_EVENT, handleOpenChange as EventListener);
      window.removeEventListener(LAUNCHER_OWNER_EVENT, handleOwnerChange as EventListener);
    };
  }, []);

  React.useEffect(() => {
    ownerLauncherRowIdRef.current = ownerLauncherRowId;
  }, [ownerLauncherRowId]);

  React.useEffect(() => {
    if (!rowId || !isOpen) {
      return;
    }

    dispatchLauncherOpenChange(rowId);
    return () => {
      dispatchLauncherOpenChange(null);
    };
  }, [isOpen, rowId]);

  const isAnotherLauncherActive = activeLauncherRowId !== null && activeLauncherRowId !== rowId;
  const isOwnedByCurrentRow = rowId !== null && ownerLauncherRowId === rowId;
  const canRevealTrigger =
    hasQuickActions &&
    !isAnotherLauncherActive &&
    (!supportsHoverFine ||
      isOpen ||
      isLauncherHovered ||
      isOwnedByCurrentRow ||
      ((isRowHovered || isHoverGraceActive) &&
        (ownerLauncherRowId === null || ownerLauncherRowId === rowId)));
  const { phase, showTrigger } = usePatientRowOrbitalLauncherMachine({
    canRevealTrigger,
    isOpen,
    supportsHoverFine,
  });

  return {
    anchorRef,
    position,
    phase,
    showTrigger,
    supportsHoverFine,
    handleLauncherMouseEnter: () => {
      clearHoverExitTimer();
      setIsHoverGraceActive(true);
      setIsLauncherHovered(true);
      if (rowId) {
        dispatchLauncherOwnerChange(rowId);
      }
    },
    handleLauncherMouseLeave: () => {
      setIsLauncherHovered(false);
      armHoverGrace();
    },
  };
};
