import React from 'react';

const HOVER_FINE_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';
const LAUNCHER_ACTIVE_EVENT = 'patient-row-orbital-launcher-active-change';

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
  wrapperSize: number;
}

interface UsePatientRowOrbitalLauncherRuntimeResult {
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  position: LauncherPosition | null;
  showTrigger: boolean;
  handleLauncherMouseEnter: () => void;
  handleLauncherMouseLeave: () => void;
}

const dispatchLauncherActiveChange = (rowId: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<LauncherActiveChangeDetail>(LAUNCHER_ACTIVE_EVENT, {
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
  wrapperSize: number
): LauncherPosition | null => {
  if (!row) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  return {
    left: Math.max(8, rect.left - launcherOffset),
    top: rect.top + rect.height / 2 - wrapperSize / 2,
  };
};

export const usePatientRowOrbitalLauncherRuntime = ({
  hasQuickActions,
  isOpen,
  launcherOffset,
  wrapperSize,
}: UsePatientRowOrbitalLauncherRuntimeParams): UsePatientRowOrbitalLauncherRuntimeResult => {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const [supportsHoverFine, setSupportsHoverFine] = React.useState(resolveSupportsHoverFine);
  const [isRowHovered, setIsRowHovered] = React.useState(false);
  const [isLauncherHovered, setIsLauncherHovered] = React.useState(false);
  const [position, setPosition] = React.useState<LauncherPosition | null>(null);
  const [rowId, setRowId] = React.useState<string | null>(null);
  const [activeLauncherRowId, setActiveLauncherRowId] = React.useState<string | null>(null);

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
      setPosition(resolveLauncherPosition(row, launcherOffset, wrapperSize));
    };

    const handleRowMouseEnter = () => {
      setIsRowHovered(true);
      syncPosition();
    };

    const handleRowMouseLeave = () => {
      setIsRowHovered(false);
    };

    const handleFocusIn = () => {
      setIsRowHovered(true);
      syncPosition();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && row.contains(event.relatedTarget)) {
        return;
      }
      setIsRowHovered(false);
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
    };
  }, [launcherOffset, wrapperSize]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleActiveChange = (event: Event) => {
      const detail = (event as CustomEvent<LauncherActiveChangeDetail>).detail;
      setActiveLauncherRowId(detail?.rowId ?? null);
    };

    window.addEventListener(LAUNCHER_ACTIVE_EVENT, handleActiveChange as EventListener);
    return () => {
      window.removeEventListener(LAUNCHER_ACTIVE_EVENT, handleActiveChange as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (!isOpen || !rowId) {
      return;
    }

    dispatchLauncherActiveChange(rowId);
    return () => {
      dispatchLauncherActiveChange(null);
    };
  }, [isOpen, rowId]);

  const isAnotherLauncherActive =
    activeLauncherRowId !== null && rowId !== null && activeLauncherRowId !== rowId;

  return {
    anchorRef,
    position,
    showTrigger:
      hasQuickActions &&
      !isAnotherLauncherActive &&
      (!supportsHoverFine || isOpen || isRowHovered || isLauncherHovered),
    handleLauncherMouseEnter: () => {
      setIsLauncherHovered(true);
    },
    handleLauncherMouseLeave: () => {
      setIsLauncherHovered(false);
    },
  };
};
