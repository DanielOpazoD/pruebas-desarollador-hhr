import React, { useRef, useEffect } from 'react';

export const Game2048Original: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Evitar que las teclas afecten el scroll de la pagina principal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    // Dar foco inmediato al iframe para jugar directo
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-[#faf8ef] rounded-xl w-full h-[80vh] min-h-[650px] shadow-inner overflow-hidden relative">
      <iframe
        ref={iframeRef}
        src="/games/2048/index.html"
        className="w-full h-full border-none outline-none scale-100 origin-center md:scale-110 lg:scale-[1.3]"
        title="2048 Original"
        scrolling="no"
      />
    </div>
  );
};
