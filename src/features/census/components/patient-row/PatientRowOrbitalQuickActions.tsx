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

const TRIGGER_SIZE = 36;
const WRAPPER_SIZE = 56;
const ORBITAL_BUTTON_SIZE = 40;
const LAUNCHER_OFFSET = 56;

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
  const { isOpen, menuRef, toggle, close } = useDropdownMenu();

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
  const { anchorRef, position, showTrigger, handleLauncherMouseEnter, handleLauncherMouseLeave } =
    usePatientRowOrbitalLauncherRuntime({
      hasQuickActions,
      isOpen,
      launcherOffset: LAUNCHER_OFFSET,
      wrapperSize: WRAPPER_SIZE,
    });

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
              onMouseEnter={handleLauncherMouseEnter}
              onMouseLeave={handleLauncherMouseLeave}
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
                                  src={PATIENT_ROW_ORBITAL_ICON_SRC[item.iconAsset]}
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
                  <span className="flex h-7 w-7 items-center justify-center overflow-visible">
                    <img
                      src={PATIENT_ROW_ORBITAL_TRIGGER_ICON_SRC}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-7 w-7 object-contain [filter:drop-shadow(1px_0_0_rgba(20,184,166,0.7))_drop-shadow(-1px_0_0_rgba(20,184,166,0.7))_drop-shadow(0_1px_0_rgba(20,184,166,0.7))_drop-shadow(0_-1px_0_rgba(20,184,166,0.7))_drop-shadow(1px_1px_0_rgba(20,184,166,0.52))_drop-shadow(-1px_-1px_0_rgba(20,184,166,0.52))_drop-shadow(1px_-1px_0_rgba(20,184,166,0.52))_drop-shadow(-1px_1px_0_rgba(20,184,166,0.52))]"
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
