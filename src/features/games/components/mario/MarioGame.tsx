import React, { useRef, useEffect } from 'react';

export const MarioGame: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 's', 'S', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'MARIO_LEVEL_WON') {
        console.warn('Mario HTML5 progress saved:', event.data.data);
        // Si futuramente deciden usar Firestore, esta sería la entrada para lanzar el fetch o mutación.
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('message', handleMessage);

    if (iframeRef.current) {
      iframeRef.current.focus();
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-[#5c94fc] rounded-xl w-full h-[80vh] min-h-[600px] shadow-inner overflow-hidden relative">
      {/* Header / Info overlay can go here if needed */}
      <iframe
        ref={iframeRef}
        src="/games/mariohtml5/main.html"
        className="w-full h-full border-none outline-none scale-[1.1] origin-center md:scale-[1.2] lg:scale-[1.4]"
        title="Mario HTML5"
        scrolling="no"
      />
      <div className="absolute bottom-2 left-0 right-0 text-center text-white/80 text-xs font-bold drop-shadow-md pointer-events-none">
        Controles: Mover (← →) - Agachar (↓) - Saltar/Iniciar (S) - Correr (A)
      </div>
    </div>
  );
};
