export const TRIGGER_HITBOX_SIZE = 48;
export const TRIGGER_VISUAL_SIZE = 28;
export const ACTION_ICON_SIZE = 36;
export const ACTION_ROW_WIDTH = 136;
export const ACTION_ROW_HEIGHT = 48;
export const ACTION_STACK_GAP = 2;
export const CLOSED_WRAPPER_SIZE = 72;
export const OPEN_WRAPPER_WIDTH = 176;
export const TRIGGER_CENTER_OFFSET = 64;
export const TRIGGER_CENTER_Y_OPEN = 36;
export const ACTION_STACK_TOP = 68;

export const resolveTriggerButtonStateClassName = (
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
