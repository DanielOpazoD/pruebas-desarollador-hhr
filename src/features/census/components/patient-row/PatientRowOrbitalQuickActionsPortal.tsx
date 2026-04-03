import React from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import type { PatientRowOrbitalQuickActionItem } from '@/features/census/controllers/patientRowOrbitalQuickActionsController';
import {
  PATIENT_ROW_ORBITAL_ICON_SRC,
  PATIENT_ROW_ORBITAL_TRIGGER_ICON_SRC,
} from '@/features/census/components/patient-row/patientRowOrbitalQuickActionAssets';
import {
  ACTION_ICON_SIZE,
  ACTION_ROW_HEIGHT,
  ACTION_ROW_WIDTH,
  ACTION_STACK_GAP,
  ACTION_STACK_TOP,
  TRIGGER_HITBOX_SIZE,
  TRIGGER_VISUAL_SIZE,
  resolveTriggerButtonStateClassName,
} from '@/features/census/components/patient-row/patientRowOrbitalQuickActionLayout';

interface LauncherPosition {
  left: number;
  top: number;
}

interface PatientRowOrbitalQuickActionsPortalProps {
  actionButtonRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  activeActionIndex: number;
  close: () => void;
  handleActionKeyDown: (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  handleItemClick: (itemId: PatientRowOrbitalQuickActionItem['id']) => void;
  handleLauncherMouseEnter: () => void;
  handleLauncherMouseLeave: () => void;
  handleTriggerKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  isOpen: boolean;
  launcherWrapperHeight: number;
  launcherWrapperWidth: number;
  menuRef: React.RefObject<HTMLDivElement | null>;
  orbitalItems: PatientRowOrbitalQuickActionItem[];
  phase: Parameters<typeof resolveTriggerButtonStateClassName>[0];
  position: LauncherPosition | null;
  showTrigger: boolean;
  toggle: () => void;
  triggerCenterX: number;
  triggerCenterY: number;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const PatientRowOrbitalQuickActionsPortal: React.FC<
  PatientRowOrbitalQuickActionsPortalProps
> = ({
  actionButtonRefs,
  activeActionIndex,
  close,
  handleActionKeyDown,
  handleItemClick,
  handleLauncherMouseEnter,
  handleLauncherMouseLeave,
  handleTriggerKeyDown,
  isOpen,
  launcherWrapperHeight,
  launcherWrapperWidth,
  menuRef,
  orbitalItems,
  phase,
  position,
  showTrigger,
  toggle,
  triggerCenterX,
  triggerCenterY,
  triggerRef,
}) => {
  if (!position || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen ? <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} /> : null}
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
  );
};
