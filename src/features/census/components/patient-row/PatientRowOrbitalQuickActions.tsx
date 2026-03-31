import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useDropdownMenu } from '@/hooks/useDropdownMenu';
import manutaraIcon from '../../../../../Hoonu.png';
import rongorongoIcon from '../../../../../Rongorongo.png';
import mangaiIcon from '../../../../../Mangai.png';
import ahutepitokuraIcon from '../../../../../Ahutepitokura.png';
import {
  buildPatientRowOrbitalQuickActionItems,
  hasPatientRowOrbitalQuickActions,
  type PatientRowOrbitalQuickActionsAvailability,
  type PatientRowOrbitalQuickActionAsset,
} from '@/features/census/controllers/patientRowOrbitalQuickActionsController';

interface PatientRowOrbitalQuickActionsProps extends PatientRowOrbitalQuickActionsAvailability {
  onViewClinicalDocuments?: () => void;
  onViewExamRequest?: () => void;
  onViewImagingRequest?: () => void;
}

const HOVER_FINE_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';
const TRIGGER_SIZE = 36;
const WRAPPER_SIZE = 56;
const ORBITAL_BUTTON_SIZE = 40;
const LAUNCHER_OFFSET = 56;
const LAUNCHER_ACTIVE_EVENT = 'patient-row-orbital-launcher-active-change';

interface LauncherPosition {
  left: number;
  top: number;
}

interface LauncherActiveChangeDetail {
  rowId: string | null;
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

const resolveLauncherPosition = (row: HTMLTableRowElement | null): LauncherPosition | null => {
  if (!row) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  return {
    left: Math.max(8, rect.left - LAUNCHER_OFFSET),
    top: rect.top + rect.height / 2 - WRAPPER_SIZE / 2,
  };
};

const ORBITAL_ICON_SRC: Record<PatientRowOrbitalQuickActionAsset, string> = {
  rongorongo: rongorongoIcon,
  mangai: mangaiIcon,
  ahutepitokura: ahutepitokuraIcon,
};

export const PatientRowOrbitalQuickActions: React.FC<PatientRowOrbitalQuickActionsProps> = ({
  showClinicalDocumentsAction,
  showExamRequestAction,
  showImagingRequestAction,
  onViewClinicalDocuments,
  onViewExamRequest,
  onViewImagingRequest,
}) => {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const { isOpen, menuRef, toggle, close } = useDropdownMenu();
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
      setPosition(resolveLauncherPosition(row));
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
  }, []);

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

  const availability = React.useMemo(
    () => ({
      showClinicalDocumentsAction,
      showExamRequestAction,
      showImagingRequestAction,
    }),
    [showClinicalDocumentsAction, showExamRequestAction, showImagingRequestAction]
  );

  const orbitalItems = React.useMemo(
    () => buildPatientRowOrbitalQuickActionItems(availability),
    [availability]
  );

  const hasQuickActions = hasPatientRowOrbitalQuickActions(availability);
  const isAnotherLauncherActive =
    activeLauncherRowId !== null && rowId !== null && activeLauncherRowId !== rowId;
  const showTrigger =
    hasQuickActions &&
    !isAnotherLauncherActive &&
    (!supportsHoverFine || isOpen || isRowHovered || isLauncherHovered);

  const handleItemClick = (itemId: (typeof orbitalItems)[number]['id']) => {
    if (itemId === 'clinical-documents') {
      onViewClinicalDocuments?.();
    } else if (itemId === 'exam-request') {
      onViewExamRequest?.();
    } else {
      onViewImagingRequest?.();
    }
    close();
  };

  if (!hasQuickActions) {
    return null;
  }

  const portalContent =
    position && typeof document !== 'undefined'
      ? createPortal(
          <>
            <AnimatePresence>
              {isOpen ? (
                <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />
              ) : null}
            </AnimatePresence>

            <div
              ref={menuRef}
              className="fixed z-[70] print:hidden"
              style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                width: `${WRAPPER_SIZE}px`,
                height: `${WRAPPER_SIZE}px`,
              }}
              onMouseEnter={() => setIsLauncherHovered(true)}
              onMouseLeave={() => setIsLauncherHovered(false)}
            >
              <div className="relative h-full w-full overflow-visible">
                <AnimatePresence>
                  {isOpen
                    ? orbitalItems.map((item, index) => {
                        return (
                          <motion.div
                            key={item.id}
                            className="absolute left-1/2 top-1/2"
                            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                            animate={{
                              x: item.x,
                              y: item.y,
                              opacity: 1,
                              scale: 1,
                              transition: {
                                type: 'spring',
                                stiffness: 760,
                                damping: 30,
                                mass: 0.7,
                                delay: index * 0.012,
                              },
                            }}
                            exit={{
                              x: 0,
                              y: 0,
                              opacity: 0,
                              scale: 0.35,
                              transition: {
                                duration: 0.08,
                                delay: (orbitalItems.length - index - 1) * 0.01,
                              },
                            }}
                          >
                            <div className="group/orbit relative -translate-x-1/2 -translate-y-1/2">
                              <button
                                type="button"
                                onClick={() => handleItemClick(item.id)}
                                aria-label={item.tooltip}
                                title={item.tooltip}
                                className={clsx(
                                  'flex items-center justify-center rounded-full border-2 border-white shadow-xl transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
                                  item.buttonClassName
                                )}
                                style={{
                                  width: `${ORBITAL_BUTTON_SIZE}px`,
                                  height: `${ORBITAL_BUTTON_SIZE}px`,
                                }}
                              >
                                <img
                                  src={ORBITAL_ICON_SRC[item.iconAsset]}
                                  alt=""
                                  aria-hidden="true"
                                  draggable={false}
                                  className="h-8 w-8 object-contain"
                                />
                              </button>
                              <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/orbit:opacity-100 group-focus-within/orbit:opacity-100">
                                {item.label}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })
                    : null}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={toggle}
                  aria-label="Acciones clínicas rápidas"
                  aria-expanded={isOpen}
                  whileTap={{ scale: 0.95 }}
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ type: 'tween', duration: 0.12, ease: 'easeOut' }}
                  className={clsx(
                    'absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
                    showTrigger
                      ? 'pointer-events-auto opacity-100'
                      : 'pointer-events-none opacity-0 shadow-none',
                    'bg-transparent border-transparent shadow-none'
                  )}
                  style={{
                    width: `${TRIGGER_SIZE}px`,
                    height: `${TRIGGER_SIZE}px`,
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center overflow-visible">
                    <img
                      src={manutaraIcon}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-8 w-8 object-contain [filter:drop-shadow(1px_0_0_rgba(20,184,166,0.7))_drop-shadow(-1px_0_0_rgba(20,184,166,0.7))_drop-shadow(0_1px_0_rgba(20,184,166,0.7))_drop-shadow(0_-1px_0_rgba(20,184,166,0.7))_drop-shadow(1px_1px_0_rgba(20,184,166,0.52))_drop-shadow(-1px_-1px_0_rgba(20,184,166,0.52))_drop-shadow(1px_-1px_0_rgba(20,184,166,0.52))_drop-shadow(-1px_1px_0_rgba(20,184,166,0.52))]"
                    />
                  </span>
                </motion.button>
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <span ref={anchorRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
      {portalContent}
    </>
  );
};
