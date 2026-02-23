import React, { useState, Suspense, lazy } from 'react';
import { Gamepad2, X, Loader2 } from 'lucide-react';
// Lazy load games so they don't bloat the main application bundle
const SnakeGame = lazy(() => import('./SnakeGame').then(m => ({ default: m.SnakeGame })));
const MinesweeperGame = lazy(() =>
  import('./minesweeper/MinesweeperGame').then(m => ({ default: m.MinesweeperGame }))
);
const Game2048 = lazy(() =>
  import('./game2048/Game2048').then(m => ({ default: m.Game2048Original }))
);
const ClumsyBirdGame = lazy(() =>
  import('./clumsybird/ClumsyBirdGame').then(m => ({ default: m.ClumsyBirdGame }))
);
const MarioGame = lazy(() => import('./mario/MarioGame').then(m => ({ default: m.MarioGame })));

type GameType = 'snake' | 'minesweeper' | 'pong' | '2048' | 'solitaire' | 'clumsybird' | 'mario';

export const GamesMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  const renderGame = () => {
    switch (activeGame) {
      case 'snake':
        return <SnakeGame />;
      case 'minesweeper':
        return <MinesweeperGame />;
      case '2048':
        return <Game2048 />;
      case 'clumsybird':
        return <ClumsyBirdGame />;
      case 'mario':
        return <MarioGame />;
      // Add other games here as they are built
      default:
        return <div className="p-8 text-center text-slate-500">Juego en construcción...</div>;
    }
  };

  return (
    <div className="relative">
      {/* Botón en el Navbar / Login */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-slate-500/20 transition-colors relative text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5"
        title="Juegos Propios"
      >
        <Gamepad2 size={24} />
      </button>

      {/* Menu desplegable */}
      {isOpen && !activeGame && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 text-sm flex items-center gap-2">
              <Gamepad2 size={16} className="text-medical-500" /> Sala de Ocio
            </div>
            <div className="p-2 flex flex-col gap-1">
              <button
                onClick={() => setActiveGame('snake')}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-medical-600 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>Snake (Clásico)</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
              <button
                onClick={() => setActiveGame('minesweeper')}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-medical-600 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>Buscaminas</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
              <button
                onClick={() => setActiveGame('clumsybird')}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-medical-600 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>Clumsy Bird</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </button>
              <button
                onClick={() => setActiveGame('mario')}
                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-medical-600 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>Mario Bros</span>
                <span className="text-[10px] font-bold text-white uppercase bg-medical-500 px-2 py-0.5 rounded ml-2">
                  Nuevo
                </span>
              </button>
              <button
                disabled
                className="w-full text-left px-3 py-2 text-sm text-slate-400 opacity-60 flex items-center justify-between cursor-not-allowed"
              >
                <span>Pong</span>
                <span className="text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded">
                  Pronto
                </span>
              </button>
              <button
                disabled
                className="w-full text-left px-3 py-2 text-sm text-slate-400 opacity-60 flex items-center justify-between cursor-not-allowed"
              >
                <span>Solitario</span>
                <span className="text-[10px] uppercase bg-slate-100 px-2 py-0.5 rounded">
                  Pronto
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal del Juego Activo */}
      {activeGame && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-950 rounded-2xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] p-2 md:p-6 lg:p-8 max-w-6xl w-full relative animate-in zoom-in-95 duration-200 border border-slate-800">
            <button
              onClick={() => setActiveGame(null)}
              className="absolute -top-4 -right-4 bg-slate-800 text-slate-300 hover:text-white hover:bg-red-500 p-2 rounded-full shadow-lg border border-slate-700 transition-colors z-[110]"
              title="Cerrar juego"
            >
              <X size={20} />
            </button>
            <div className="flex justify-center min-h-[400px] items-center">
              <Suspense
                fallback={
                  <div className="flex flex-col items-center justify-center gap-4 text-slate-500">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="animate-pulse font-medium">Cargando juego...</p>
                  </div>
                }
              >
                {renderGame()}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
