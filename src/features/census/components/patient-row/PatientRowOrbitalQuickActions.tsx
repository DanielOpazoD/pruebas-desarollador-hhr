import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useDropdownMenu } from '@/hooks/useDropdownMenu';
import {
  buildPatientRowOrbitalQuickActionItems,
  hasPatientRowOrbitalQuickActions,
  type PatientRowOrbitalQuickActionsAvailability,
} from '@/features/census/controllers/patientRowOrbitalQuickActionsController';
import {
  PATIENT_ROW_ORBITAL_ICON_SRC,
  PATIENT_ROW_ORBITAL_TRIGGER_ICON_SRC,
} from '@/features/census/components/patient-row/patientRowOrbitalQuickActionAssets';
import { usePatientRowOrbitalLauncherRuntime } from '@/features/census/components/patient-row/usePatientRowOrbitalLauncherRuntime';

interface PatientRowOrbitalQuickActionsProps extends PatientRowOrbitalQuickActionsAvailability {
  onViewClinicalDocuments?: () => void;
  onViewExamRequest?: () => void;
  onViewImagingRequest?: () => void;
  onViewMedicalIndications?: () => void;
}

const TRIGGER_HITBOX_SIZE = 48;
const TRIGGER_VISUAL_SIZE = 28;
const ACTION_ICON_SIZE = 36;
const ACTION_ROW_WIDTH = 136;
const ACTION_ROW_HEIGHT = 48;
const ACTION_STACK_GAP = 8;
const CLOSED_WRAPPER_SIZE = 72;
const OPEN_WRAPPER_WIDTH = 176;
const TRIGGER_CENTER_OFFSET = 64;
const TRIGGER_CENTER_Y_OPEN = 36;
const ACTION_STACK_TOP = 68;

const resolveTriggerButtonStateClassName = (
  phase: 'idle' | 'armed' | 'open' | 'closing'
): string => {
  if (phase === 'open') {
    return 'bg-teal-50/95 ring-2 ring-teal-300 shadow-md';
  }

  if (phase === 'armed') {
    return 'bg-white/95 ring-1 ring-slate-200 shadow-sm';
  }

  if (phase === 'closing') {
    return 'bg-white/80 ring-1 ring-slate-200/70 shadow-sm opacity-80';
  }

  return 'bg-white/80 ring-1 ring-transparent shadow-none';
};

export const PatientRowOrbitalQuickActions: React.FC<PatientRowOrbitalQuickActionsProps> = ({
  showClinicalDocumentsAction,
  showExamRequestAction,
  showImagingRequestAction,
  showMedicalIndicationsAction,
  onViewClinicalDocuments,
  onViewExamRequest,
  onViewImagingRequest,
  onViewMedicalIndications,
}) => {
  const { isOpen, menuRef, setIsOpen, toggle, close } = useDropdownMenu();
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const actionButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [activeActionIndex, setActiveActionIndex] = React.useState(0);

  const availability = React.useMemo(
    () => ({
      showClinicalDocumentsAction,
      showExamRequestAction,
      showImagingRequestAction,
      showMedicalIndicationsAction,
    }),
    [
      showClinicalDocumentsAction,
      showExamRequestAction,
      showImagingRequestAction,
      showMedicalIndicationsAction,
    ]
  );

  const orbitalItems = React.useMemo(
    () => buildPatientRowOrbitalQuickActionItems(availability),
    [availability]
  );

  const hasQuickActions = hasPatientRowOrbitalQuickActions(availability);
  const openWrapperHeight =
    ACTION_STACK_TOP +
    orbitalItems.length * ACTION_ROW_HEIGHT +
    Math.max(0, orbitalItems.length - 1) * ACTION_STACK_GAP +
    20;
  const launcherWrapperWidth = isOpen ? OPEN_WRAPPER_WIDTH : CLOSED_WRAPPER_SIZE;
  const launcherWrapperHeight = isOpen ? openWrapperHeight : CLOSED_WRAPPER_SIZE;
  const triggerCenterX = launcherWrapperWidth / 2;
  const triggerCenterY = isOpen ? TRIGGER_CENTER_Y_OPEN : CLOSED_WRAPPER_SIZE / 2;
  const {
    anchorRef,
    phase,
    position,
    showTrigger,
    handleLauncherMouseEnter,
    handleLauncherMouseLeave,
  } = usePatientRowOrbitalLauncherRuntime({
    hasQuickActions,
    isOpen,
    launcherOffset: TRIGGER_CENTER_OFFSET,
    wrapperWidth: launcherWrapperWidth,
    wrapperHeight: launcherWrapperHeight,
    triggerCenterX,
    triggerCenterY,
  });

  React.useEffect(() => {
    if (!isOpen) {
      setActiveActionIndex(0);
      actionButtonRefs.current = [];
    }
  }, [isOpen]);

  const focusActionAtIndex = React.useCallback(
    (index: number) => {
      if (!orbitalItems.length) {
        return;
      }

      const nextIndex = (index + orbitalItems.length) % orbitalItems.length;
      setActiveActionIndex(nextIndex);
      window.requestAnimationFrame(() => {
        actionButtonRefs.current[nextIndex]?.focus();
      });
    },
    [orbitalItems.length]
  );

  const openMenuAndFocus = React.useCallback(
    (targetIndex = 0) => {
      setIsOpen(true);
      focusActionAtIndex(targetIndex);
    },
    [focusActionAtIndex, setIsOpen]
  );

  const handleItemClick = (itemId: (typeof orbitalItems)[number]['id']) => {
    if (itemId === 'clinical-documents') {
      onViewClinicalDocuments?.();
    } else if (itemId === 'exam-request') {
      onViewExamRequest?.();
    } else if (itemId === 'imaging-request') {
      onViewImagingRequest?.();
    } else {
      onViewMedicalIndications?.();
    }
    close();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!orbitalItems.length) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      openMenuAndFocus(0);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      openMenuAndFocus(orbitalItems.length - 1);
    }
  };

  const handleActionKeyDown = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!orbitalItems.length) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusActionAtIndex(index + 1);
      return;
    }

    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusActionAtIndex(index - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusActionAtIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusActionAtIndex(orbitalItems.length - 1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
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
                width: `${launcherWrapperWidth}px`,
                height: `${launcherWrapperHeight}px`,
              }}
              onMouseEnter={handleLauncherMouseEnter}
              onMouseLeave={handleLauncherMouseLeave}
            >
              <div className="relative h-full w-full overflow-visible">
                <AnimatePresence>
                  {isOpen ? (
                    <motion.div
                      className="absolute left-1/2 top-0 z-20 flex -translate-x-1/2 flex-col"
                      style={{
                        top: `${ACTION_STACK_TOP}px`,
                        width: `${ACTION_ROW_WIDTH}px`,
                        gap: `${ACTION_STACK_GAP}px`,
                      }}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                    >
                      {orbitalItems.map((item, index) => (
                        <motion.button
                          key={item.id}
                          type="button"
                          onClick={() => handleItemClick(item.id)}
                          onKeyDown={event => handleActionKeyDown(index, event)}
                          aria-label={item.tooltip}
                          title={item.tooltip}
                          tabIndex={index === activeActionIndex ? 0 : -1}
                          ref={node => {
                            actionButtonRefs.current[index] = node;
                          }}
                          className={clsx(
                            'flex items-center gap-2.5 rounded-2xl bg-transparent px-2 py-1 transition-transform duration-150 hover:scale-[1.02] hover:bg-white/50 focus-visible:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300'
                          )}
                          style={{
                            width: `${ACTION_ROW_WIDTH}px`,
                            height: `${ACTION_ROW_HEIGHT}px`,
                          }}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              duration: 0.14,
                              delay: index * 0.02,
                              ease: 'easeOut',
                            },
                          }}
                          exit={{
                            opacity: 0,
                            x: -6,
                            transition: {
                              duration: 0.08,
                              delay: (orbitalItems.length - index - 1) * 0.01,
                            },
                          }}
                        >
                          <span
                            className={clsx(
                              'flex shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md',
                              item.buttonClassName
                            )}
                            style={{
                              width: `${ACTION_ICON_SIZE}px`,
                              height: `${ACTION_ICON_SIZE}px`,
                            }}
                          >
                            <img
                              src={PATIENT_ROW_ORBITAL_ICON_SRC[item.iconAsset]}
                              alt=""
                              aria-hidden="true"
                              draggable={false}
                              className="h-7 w-7 object-contain"
                            />
                          </span>
                          <span className="truncate text-[10px] font-medium leading-tight text-slate-700/90">
                            {item.label}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.button
                  type="button"
                  onClick={toggle}
                  onKeyDown={handleTriggerKeyDown}
                  aria-label="Acciones clínicas rápidas"
                  aria-expanded={isOpen}
                  ref={triggerRef}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    rotate: isOpen ? 20 : 0,
                    scale: isOpen ? 1.04 : 1,
                  }}
                  transition={{ type: 'tween', duration: 0.12, ease: 'easeOut' }}
                  className={clsx(
                    'absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-[opacity,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300',
                    showTrigger
                      ? 'pointer-events-auto opacity-100'
                      : 'pointer-events-none opacity-0 shadow-none',
                    'bg-transparent border-transparent shadow-none'
                  )}
                  style={{
                    left: `${triggerCenterX}px`,
                    top: `${triggerCenterY}px`,
                    width: `${TRIGGER_HITBOX_SIZE}px`,
                    height: `${TRIGGER_HITBOX_SIZE}px`,
                  }}
                >
                  <span
                    className={clsx(
                      'flex items-center justify-center overflow-visible rounded-full transition-[background-color,box-shadow,opacity,transform] duration-150',
                      resolveTriggerButtonStateClassName(phase)
                    )}
                    style={{
                      width: `${TRIGGER_VISUAL_SIZE}px`,
                      height: `${TRIGGER_VISUAL_SIZE}px`,
                    }}
                  >
                    <img
                      src={PATIENT_ROW_ORBITAL_TRIGGER_ICON_SRC}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="object-contain opacity-95"
                      style={{
                        width: `${TRIGGER_VISUAL_SIZE}px`,
                        height: `${TRIGGER_VISUAL_SIZE}px`,
                      }}
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
