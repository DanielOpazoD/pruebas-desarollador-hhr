import React, { useRef, useEffect } from 'react';

export const ClumsyBirdGame: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Evitar scroll con espacio polarizado al jugar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center bg-black rounded-xl w-full h-[80vh] min-h-[600px] shadow-inner overflow-hidden relative">
      <h2 className="absolute top-2 left-4 text-white/50 font-bold z-10 pointer-events-none text-xl tracking-widest uppercase">
        Clumsy Bird
      </h2>
      <iframe
        ref={iframeRef}
        src="/games/clumsy-bird/index.html"
        className="w-full h-full border-none outline-none overflow-hidden scale-110 origin-center md:scale-125 lg:scale-150"
        title="Clumsy Bird"
        scrolling="no"
      />
    </div>
  );
};
