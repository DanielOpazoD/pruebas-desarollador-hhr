import React, { useState, useEffect, useCallback, MouseEvent } from 'react';
import { Bomb, Flag, Trophy, X } from 'lucide-react';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

const DIFFICULTIES: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  EASY: { rows: 9, cols: 9, mines: 10 },
  MEDIUM: { rows: 16, cols: 16, mines: 40 },
  HARD: { rows: 16, cols: 30, mines: 99 },
};

interface CellData {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export const MinesweeperGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('EASY');
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [minesLeft, setMinesLeft] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isFirstClick, setIsFirstClick] = useState(true);

  // Initialize Game
  const initGame = useCallback((diff: Difficulty) => {
    const { rows, cols, mines } = DIFFICULTIES[diff];
    const newGrid: CellData[][] = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => ({
        row: r,
        col: c,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0,
      }))
    );

    setGrid(newGrid);
    setIsGameOver(false);
    setIsVictory(false);
    setMinesLeft(mines);
    setTimeElapsed(0);
    setTimerActive(false);
    setIsFirstClick(true);
  }, []);

  useEffect(() => {
    initGame(difficulty);
  }, [difficulty, initGame]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && !isGameOver && !isVictory) {
      interval = setInterval(() => {
        setTimeElapsed(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, isGameOver, isVictory]);

  // Helpers
  const getNeighbors = (r: number, c: number, rows: number, cols: number) => {
    const neighbors: [number, number][] = [];
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nr = r + i;
        const nc = c + j;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          neighbors.push([nr, nc]);
        }
      }
    }
    return neighbors;
  };

  const placeMines = (firstRow: number, firstCol: number) => {
    const { rows, cols, mines } = DIFFICULTIES[difficulty];
    const newGrid = [...grid.map(row => [...row])];

    // Use a flat approach for safer random placement
    const availableCells: { r: number; c: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip first click and its immediate neighbors to ensure a fair start
        if (Math.abs(firstRow - r) <= 1 && Math.abs(firstCol - c) <= 1) continue;
        availableCells.push({ r, c });
      }
    }

    // Shuffle and pick mines
    for (let i = availableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }

    const mineCells = availableCells.slice(0, mines);
    mineCells.forEach(({ r, c }) => {
      newGrid[r][c].isMine = true;
    });

    // Calculate neighbor mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!newGrid[r][c].isMine) {
          let count = 0;
          getNeighbors(r, c, rows, cols).forEach(([nr, nc]) => {
            if (newGrid[nr][nc].isMine) count++;
          });
          newGrid[r][c].neighborMines = count;
        }
      }
    }

    setGrid(newGrid);
    return newGrid;
  };

  const checkVictory = (currentGrid: CellData[][]) => {
    const { rows, cols, mines } = DIFFICULTIES[difficulty];
    let revealedCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (currentGrid[r][c].isRevealed) revealedCount++;
      }
    }
    if (revealedCount === rows * cols - mines) {
      setIsVictory(true);
      setTimerActive(false);
    }
  };

  const revealCell = (r: number, c: number, currentGrid: CellData[][]) => {
    if (currentGrid[r][c].isRevealed || currentGrid[r][c].isFlagged) return currentGrid;

    currentGrid[r][c].isRevealed = true;

    if (currentGrid[r][c].isMine) {
      setIsGameOver(true);
      setTimerActive(false);
      // Reveal all mines safely so the user sees them
      for (let row = 0; row < currentGrid.length; row++) {
        for (let col = 0; col < currentGrid[0].length; col++) {
          if (currentGrid[row][col].isMine) currentGrid[row][col].isRevealed = true;
        }
      }
      return currentGrid;
    }

    if (currentGrid[r][c].neighborMines === 0) {
      const { rows, cols } = DIFFICULTIES[difficulty];
      getNeighbors(r, c, rows, cols).forEach(([nr, nc]) => {
        revealCell(nr, nc, currentGrid);
      });
    }

    return currentGrid;
  };

  // Interactions
  const handleCellClick = (r: number, c: number) => {
    if (isGameOver || isVictory || grid[r][c].isRevealed || grid[r][c].isFlagged) return;

    let currentGrid = [...grid.map(row => [...row])];

    if (isFirstClick) {
      currentGrid = placeMines(r, c);
      setIsFirstClick(false);
      setTimerActive(true);
    }

    currentGrid = revealCell(r, c, currentGrid);
    setGrid(currentGrid);

    if (!isGameOver) {
      checkVictory(currentGrid);
    }
  };

  const handleCellRightClick = (e: MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (isGameOver || isVictory || grid[r][c].isRevealed) return;

    const newGrid = [...grid.map(row => [...row])];
    const isCurrentlyFlagged = newGrid[r][c].isFlagged;

    newGrid[r][c].isFlagged = !isCurrentlyFlagged;
    setGrid(newGrid);
    setMinesLeft(prev => prev + (isCurrentlyFlagged ? 1 : -1));
  };

  const getNumberColorClass = (count: number) => {
    switch (count) {
      case 1:
        return 'text-blue-500';
      case 2:
        return 'text-green-600';
      case 3:
        return 'text-red-500';
      case 4:
        return 'text-purple-700';
      case 5:
        return 'text-red-800';
      case 6:
        return 'text-teal-600';
      case 7:
        return 'text-black';
      case 8:
        return 'text-gray-600';
      default:
        return '';
    }
  };

  // Determine cell sizes based on difficulty to avoid scrolling on medium/hard
  const cellClass =
    difficulty === 'HARD'
      ? 'w-5 h-5 text-[10px]'
      : difficulty === 'MEDIUM'
        ? 'w-[22px] h-[22px] text-xs'
        : 'w-6 h-6 text-sm';
  const cellSizeNum = difficulty === 'HARD' ? 20 : difficulty === 'MEDIUM' ? 22 : 24;

  const [showRules, setShowRules] = useState(false);

  return (
    <div className="flex flex-col items-center select-none bg-slate-100 p-4 md:p-6 rounded-xl border border-slate-200 overflow-y-auto max-h-[85vh]">
      {/* Game Header */}
      <div className="w-full max-w-3xl bg-slate-200 p-3 rounded-t-lg border-b-2 border-slate-300 flex justify-between items-center mb-1">
        {/* Counter */}
        <div className="bg-black text-red-500 font-mono text-xl md:text-2xl px-2 py-1 rounded w-14 md:w-16 text-center leading-none tracking-wider">
          {minesLeft.toString().padStart(3, '0')}
        </div>

        {/* Status Button */}
        <button
          onClick={() => initGame(difficulty)}
          className="w-10 h-10 bg-slate-100 hover:bg-white active:bg-slate-300 border-2 border-t-white border-l-white border-b-slate-400 border-r-slate-400 rounded flex items-center justify-center text-xl transition-all active:border-invert"
          title="Reiniciar Juego"
        >
          {isGameOver ? '😵' : isVictory ? '😎' : '😊'}
        </button>

        {/* Timer */}
        <div className="bg-black text-red-500 font-mono text-xl md:text-2xl px-2 py-1 rounded w-14 md:w-16 text-center leading-none tracking-wider">
          {timeElapsed.toString().padStart(3, '0')}
        </div>
      </div>

      {/* Difficulty Selector */}
      <div className="flex gap-2 mb-4 w-full max-w-3xl justify-center bg-slate-200 p-2 rounded-b-lg border border-slate-300">
        {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
          <button
            key={diff}
            onClick={() => {
              setDifficulty(diff);
              initGame(diff);
            }}
            className={`px-3 py-1 rounded text-xs font-bold ${difficulty === diff ? 'bg-medical-600 text-white shadow-inner' : 'bg-white text-slate-600 hover:bg-slate-100 shadow'}`}
          >
            {diff === 'EASY' ? 'FÁCIL' : diff === 'MEDIUM' ? 'MEDIO' : 'DIFÍCIL'}
          </button>
        ))}
      </div>

      {/* Grid Container (Scroll only if necessary, but sizes should prevent it) */}
      <div className="bg-slate-300 p-2 rounded border-4 border-t-slate-400 border-l-slate-400 border-b-white border-r-white w-full overflow-auto flex justify-center">
        <div
          className="grid gap-[1px] bg-slate-400 border-2 border-t-slate-500 border-l-slate-500 border-b-white border-r-white shrink-0"
          style={{
            gridTemplateColumns: `repeat(${DIFFICULTIES[difficulty].cols}, minmax(0, 1fr))`,
            width: `${DIFFICULTIES[difficulty].cols * cellSizeNum}px`,
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isBomb = cell.isRevealed && cell.isMine;
              const isExplodedBomb = isBomb && isGameOver;

              // Lógica de banderas al perder
              const isFlagCorrect = isGameOver && cell.isFlagged && cell.isMine;
              const isFlagWrong = isGameOver && cell.isFlagged && !cell.isMine;

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={e => handleCellRightClick(e, r, c)}
                  className={`
                            ${cellClass} flex items-center justify-center font-bold relative
                            ${
                              cell.isRevealed
                                ? `bg-slate-200 border-[1px] border-slate-300 ${isExplodedBomb ? 'bg-red-500' : ''}`
                                : isFlagCorrect
                                  ? 'bg-green-300 border-[1px] border-green-400'
                                  : isFlagWrong
                                    ? 'bg-red-200 border-[1px] border-red-300'
                                    : 'bg-slate-100 border-2 border-t-white border-l-white border-b-slate-400 border-r-slate-400 hover:bg-white active:bg-slate-200'
                            }
                        `}
                  style={{ cursor: cell.isRevealed || isGameOver ? 'default' : 'pointer' }}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb
                        size={difficulty === 'HARD' ? 12 : 14}
                        className={isExplodedBomb ? 'text-white' : 'text-slate-900'}
                      />
                    ) : cell.neighborMines > 0 ? (
                      <span className={getNumberColorClass(cell.neighborMines)}>
                        {cell.neighborMines}
                      </span>
                    ) : (
                      ''
                    )
                  ) : cell.isFlagged ? (
                    <>
                      <Flag
                        size={difficulty === 'HARD' ? 10 : 12}
                        className={
                          isFlagCorrect
                            ? 'text-green-700 fill-green-700'
                            : isFlagWrong
                              ? 'text-slate-500 fill-slate-500 opacity-50'
                              : 'text-red-500 fill-red-500'
                        }
                      />
                      {isFlagWrong && (
                        <X
                          size={difficulty === 'HARD' ? 14 : 16}
                          className="absolute text-red-600 opacity-90 stroke-[3px]"
                        />
                      )}
                    </>
                  ) : (
                    ''
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {isVictory && (
        <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-bold animate-bounce bg-green-50 px-4 py-2 rounded-lg border border-green-200">
          <Trophy size={20} /> ¡Has ganado en {timeElapsed} segundos!
        </div>
      )}

      {/* Rules Accordion */}
      <div className="mt-6 w-full max-w-3xl">
        <button
          onClick={() => setShowRules(!showRules)}
          className="w-full text-left font-bold text-slate-700 bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition border border-slate-200 flex justify-between items-center"
        >
          ¿Cómo jugar Buscaminas?
          <span className="text-xl leading-none">{showRules ? '−' : '+'}</span>
        </button>

        {showRules && (
          <div className="mt-2 bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-sm text-slate-600 space-y-3 animate-in fade-in slide-in-from-top-1">
            <p>
              <strong>Meta:</strong> Descubrir todas las casillas vacías de la cuadrícula sin
              detonar ninguna de las minas ocultas.
            </p>

            <div>
              <strong>¿Cuándo se gana?</strong>
              <p className="ml-4 mt-1">
                El juego termina en victoria una vez que has hecho clic (&quot;destapado&quot;) en{' '}
                <em>todas y cada una</em> de las casillas que no contienen minas. No es obligatorio
                poner banderas con precisión para ganar, pero sí es obligatorio que ninguna mina
                explote.
              </p>
            </div>

            <div>
              <strong>¿Qué significan los números?</strong>
              <p className="ml-4 mt-1">
                Cuando haces clic izquierdo en una casilla, esta revelará un número (ej. el 1 azul,
                el 2 verde). Ese número indica exactamente{' '}
                <strong>cuántas minas tocan esa casilla</strong> (ya sea arriba, abajo, lados o en
                diagonal).
              </p>
            </div>

            <div>
              <strong>¿Cuándo y cómo pongo marcas o banderas 🚩?</strong>
              <p className="ml-4 mt-1">
                Si, gracias a los números deduces que en una casilla oculta obligatoriamente hay una
                mina, debes dar <strong>Clic Derecho</strong> sobre esa casilla bloqueada. Esto
                colocará una bandera roja allí.
              </p>
              <ul className="list-disc ml-8 mt-1 space-y-1">
                <li>
                  La bandera sirve para recordar dónde hay peligro y para{' '}
                  <strong className="text-red-500">evitar clics accidentales</strong>.
                </li>
                <li>
                  Al marcar correctamente, el contador de minas de arriba a la izquierda irá
                  bajando.
                </li>
                <li>Para quitar una bandera, basta con volver a dar Clic Derecho encima.</li>
              </ul>
            </div>

            <p className="italic bg-slate-50 p-2 rounded mt-2 border-l-2 border-medical-500">
              <strong>💡 Truco:</strong> El primer clic que hagas en el tablero <em>siempre</em>{' '}
              está manipulado para que caiga en una zona segura, abriendo una porción grande del
              campo para empezar a deducir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
