import React from 'react';

export type PatientRowOrbitalLauncherPhase = 'idle' | 'armed' | 'open' | 'closing';

interface PatientRowOrbitalLauncherMachineParams {
  canRevealTrigger: boolean;
  isOpen: boolean;
  supportsHoverFine: boolean;
}

interface PatientRowOrbitalLauncherMachineResult {
  phase: PatientRowOrbitalLauncherPhase;
  showTrigger: boolean;
}

type LauncherMachineAction =
  | { type: 'ARM' }
  | { type: 'OPEN' }
  | { type: 'START_CLOSE' }
  | { type: 'RESET' };

interface LauncherMachineState {
  phase: PatientRowOrbitalLauncherPhase;
}

const REVEAL_DELAY_MS = 60;
const CLOSE_RESET_DELAY_MS = 90;

const reducer = (
  state: LauncherMachineState,
  action: LauncherMachineAction
): LauncherMachineState => {
  if (action.type === 'ARM') {
    if (state.phase === 'open') {
      return state;
    }
    return { phase: 'armed' };
  }

  if (action.type === 'OPEN') {
    return { phase: 'open' };
  }

  if (action.type === 'START_CLOSE') {
    if (state.phase === 'idle') {
      return state;
    }
    return { phase: 'closing' };
  }

  return { phase: 'idle' };
};

export const usePatientRowOrbitalLauncherMachine = ({
  canRevealTrigger,
  isOpen,
  supportsHoverFine,
}: PatientRowOrbitalLauncherMachineParams): PatientRowOrbitalLauncherMachineResult => {
  const [{ phase }, dispatch] = React.useReducer(reducer, { phase: 'idle' });
  const revealTimerRef = React.useRef<number | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);

  const clearRevealTimer = React.useCallback(() => {
    if (revealTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!supportsHoverFine) {
      dispatch({ type: isOpen ? 'OPEN' : 'ARM' });
      return;
    }

    if (isOpen) {
      clearRevealTimer();
      clearCloseTimer();
      dispatch({ type: 'OPEN' });
      return;
    }

    if (canRevealTrigger) {
      clearCloseTimer();
      if (phase === 'idle' || phase === 'closing') {
        clearRevealTimer();
        revealTimerRef.current = window.setTimeout(() => {
          dispatch({ type: 'ARM' });
          revealTimerRef.current = null;
        }, REVEAL_DELAY_MS);
      }
      return;
    }

    clearRevealTimer();
    if (phase !== 'idle' && phase !== 'closing') {
      dispatch({ type: 'START_CLOSE' });
    }
    if (phase !== 'idle') {
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        dispatch({ type: 'RESET' });
        closeTimerRef.current = null;
      }, CLOSE_RESET_DELAY_MS);
    }
  }, [canRevealTrigger, clearCloseTimer, clearRevealTimer, isOpen, phase, supportsHoverFine]);

  React.useEffect(() => {
    return () => {
      clearRevealTimer();
      clearCloseTimer();
    };
  }, [clearCloseTimer, clearRevealTimer]);

  return {
    phase,
    showTrigger: !supportsHoverFine || phase !== 'idle',
  };
};
