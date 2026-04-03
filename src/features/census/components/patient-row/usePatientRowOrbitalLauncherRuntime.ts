/**
 * usePatientRowOrbitalLauncherRuntime.ts
 *
 * Runtime coordination layer for the orbital quick-action launcher.
 *
 * Responsibilities:
 *
 * 1. **Position tracking** -- Reads the patient row's bounding rect and
 *    computes a viewport-clamped `{ left, top }` for the fixed-position
 *    portal. Re-syncs on scroll, resize, and ResizeObserver changes.
 *
 * 2. **Hover coordination** -- Tracks mouseenter/mouseleave on both the
 *    patient row *and* the launcher portal. A short grace period
 *    (`HOVER_EXIT_GRACE_MS`) bridges the gap when the pointer travels
 *    from the row to the floating launcher, preventing flicker.
 *
 * 3. **Ownership model** -- Only one launcher can be "owned" (armed or
 *    open) at a time across the entire census table. Ownership is
 *    broadcast via two CustomEvents on `window`:
 *      - `patient-row-orbital-launcher-open-change`  -- which row, if any,
 *        has its action stack open.
 *      - `patient-row-orbital-launcher-owner-change` -- which row, if any,
 *        currently owns the hover/focus state.
 *    Each launcher instance listens for both events and yields when
 *    another row takes ownership.
 *
 * 4. **visibilitychange safety** -- When the browser tab goes to the
 *    background, all hover state is flushed and ownership is released.
 *    This prevents "ghost launchers" that would otherwise persist when
 *    the user alt-tabs away while hovering a row.
 *
 * 5. **Media-query detection** -- Listens to `(hover: hover) and
 *    (pointer: fine)` to distinguish mouse from touch. On touch devices
 *    the trigger is always visible and hover logic is bypassed.
 */

import React from 'react';
import {
  usePatientRowOrbitalLauncherMachine,
  type PatientRowOrbitalLauncherPhase,
} from '@/features/census/components/patient-row/usePatientRowOrbitalLauncherMachine';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOVER_FINE_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';
const LAUNCHER_OPEN_EVENT = 'patient-row-orbital-launcher-open-change';
const LAUNCHER_OWNER_EVENT = 'patient-row-orbital-launcher-owner-change';

/**
 * Grace period (ms) after the pointer leaves the row or launcher before
 * ownership is released. Gives the user time to cross the gap between the
 * table row and the floating portal without losing the trigger.
 *
 * Exported so integration tests can reference the same value.
 */
export const HOVER_EXIT_GRACE_MS = 120;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Event dispatchers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * CSS selector that identifies the RUT cell inside a patient row.
 * Inside the table, the Honu trigger only appears when the pointer is at or
 * left of this cell.
 */
const RUT_CELL_SELECTOR = 'td.group\\/rut';

/**
 * Returns the right edge (viewport X) of the RUT cell in the given row.
 * If the cell isn't found, falls back to the full row width (no restriction).
 */
const resolveActivationZoneRightEdge = (row: HTMLTableRowElement): number => {
  const rutCell = row.querySelector(RUT_CELL_SELECTOR);
  if (rutCell) {
    return rutCell.getBoundingClientRect().right;
  }
  return row.getBoundingClientRect().right;
};

/**
 * Returns true when the pointer X coordinate is inside the launcher
 * activation zone — from the left edge of the viewport to the right
 * edge of the RUT column.
 */
const isPointerInActivationZone = (pointerX: number, row: HTMLTableRowElement): boolean =>
  pointerX <= resolveActivationZoneRightEdge(row);

const isPointerWithinRowBand = (pointerY: number, row: HTMLTableRowElement): boolean => {
  const rect = row.getBoundingClientRect();
  return pointerY >= rect.top && pointerY <= rect.bottom;
};

/**
 * Returns true when the pointer is outside the table, somewhere to the left of
 * the row, but still aligned with the row's vertical band. This is what lets
 * the launcher appear even if the user moves the mouse all the way to the left
 * edge of the viewport.
 */
const isPointerInExternalLeftActivationBand = (
  pointerX: number,
  pointerY: number,
  row: HTMLTableRowElement
): boolean => {
  const rect = row.getBoundingClientRect();
  return pointerX <= rect.left && isPointerWithinRowBand(pointerY, row);
};

/**
 * Computes the fixed-position `{ left, top }` for the launcher wrapper
 * relative to the viewport.
 *
 * The wrapper is horizontally clamped with an 8 px gutter on each side so
 * it never overflows the window. Vertically it is centered on the row's
 * midpoint, offset by `triggerCenterY` so the trigger circle aligns with
 * the row.
 *
 * @param row             The `<tr>` element the launcher belongs to.
 * @param launcherOffset  Horizontal distance from the row's left edge to
 *                        the wrapper's left edge.
 * @param _wrapperWidth   Current wrapper width (used for right-edge clamping).
 * @param _wrapperHeight  Current wrapper height (reserved for future vertical clamping).
 * @param triggerCenterX  X offset of the trigger center inside the wrapper.
 * @param triggerCenterY  Y offset of the trigger center inside the wrapper.
 */
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

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

  // Refs mirror the latest state values so timer callbacks avoid stale closures.
  const isOpenRef = React.useRef(isOpen);
  const isLauncherHoveredRef = React.useRef(isLauncherHovered);
  const isRowHoveredRef = React.useRef(isRowHovered);
  const rowIdRef = React.useRef(rowId);

  // Keep refs in sync with their corresponding state values.
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
  React.useEffect(() => {
    ownerLauncherRowIdRef.current = ownerLauncherRowId;
  }, [ownerLauncherRowId]);

  const clearHoverExitTimer = React.useCallback(() => {
    if (hoverExitTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(hoverExitTimerRef.current);
      hoverExitTimerRef.current = null;
    }
  }, []);

  /**
   * Starts the hover-exit grace period. After `HOVER_EXIT_GRACE_MS` the
   * timer checks whether the pointer truly left (via refs to avoid stale
   * state) and releases ownership if so.
   */
  const armHoverGrace = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    clearHoverExitTimer();
    setIsHoverGraceActive(true);
    hoverExitTimerRef.current = window.setTimeout(() => {
      setIsHoverGraceActive(false);
      // Read current values from refs -- the closure captures the ref
      // objects (stable) not the state values (potentially stale).
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

  // --- visibilitychange: flush hover state when the tab goes to background ---
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

  // --- Media-query listener: track hover+fine capability changes ---
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

  // --- Row event listeners: hover, focus, position syncing ---
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

    /**
     * Instead of simple mouseenter/mouseleave, we use mousemove to
     * restrict the activation zone to the left side of the row (up to
     * and including the RUT column). Moving the pointer right of the
     * RUT cell is treated as leaving the activation zone.
     */
    const activateRowHover = () => {
      if (!isRowHoveredRef.current) {
        clearHoverExitTimer();
        setIsHoverGraceActive(true);
        setIsRowHovered(true);
        if (resolvedRowId) {
          dispatchLauncherOwnerChange(resolvedRowId);
        }
        syncPosition();
      }
    };

    const deactivateRowHover = () => {
      if (isRowHoveredRef.current) {
        setIsRowHovered(false);
        armHoverGrace();
      }
    };

    const handleRowMouseMove = (event: MouseEvent) => {
      const inZone = isPointerInActivationZone(event.clientX, row);

      if (inZone) {
        activateRowHover();
      } else {
        deactivateRowHover();
      }
    };

    const handleGlobalMouseMove = (event: MouseEvent) => {
      const inExternalLeftBand = isPointerInExternalLeftActivationBand(
        event.clientX,
        event.clientY,
        row
      );
      const targetInsideRow = event.target instanceof Node && row.contains(event.target);

      if (inExternalLeftBand) {
        activateRowHover();
      } else if (!targetInsideRow) {
        deactivateRowHover();
      }
    };

    const handleRowMouseLeave = () => {
      deactivateRowHover();
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

    row.addEventListener('mousemove', handleRowMouseMove);
    row.addEventListener('mouseleave', handleRowMouseLeave);
    row.addEventListener('focusin', handleFocusIn);
    row.addEventListener('focusout', handleFocusOut);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('resize', syncPosition);
    window.addEventListener('scroll', syncPosition, true);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncPosition);
      resizeObserver.observe(row);
    }

    return () => {
      row.removeEventListener('mousemove', handleRowMouseMove);
      row.removeEventListener('mouseleave', handleRowMouseLeave);
      row.removeEventListener('focusin', handleFocusIn);
      row.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
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

  // --- Global ownership event listeners ---
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

  // --- Broadcast open state changes ---
  React.useEffect(() => {
    if (!rowId || !isOpen) {
      return;
    }

    dispatchLauncherOpenChange(rowId);
    return () => {
      dispatchLauncherOpenChange(null);
    };
  }, [isOpen, rowId]);

  // ---------------------------------------------------------------------------
  // canRevealTrigger -- the compound predicate that gates trigger visibility.
  //
  // The trigger is revealed when ALL of the following hold:
  //   1. The row has quick actions to show (`hasQuickActions`).
  //   2. No *other* row's launcher is currently open (`!isAnotherLauncherActive`).
  //   3. At least one of:
  //      a. The device does not support hover+fine (touch -- always show).
  //      b. The action stack is open.
  //      c. The pointer is over the launcher portal itself.
  //      d. This row currently owns the launcher.
  //      e. The row is hovered (or grace is active) AND no other row owns
  //         the launcher.
  // ---------------------------------------------------------------------------
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
