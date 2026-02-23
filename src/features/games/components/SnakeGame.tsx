import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Play, Gamepad2 } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const getInitialSnake = (): Point[] => [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  while (true) {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // Ensure food doesn't spawn on the snake
    const isOnSnake = snake.some(s => s.x === newFood.x && s.y === newFood.y);
    if (!isOnSnake) break;
  }
  return newFood;
};

export const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Point[]>(getInitialSnake());
  const [direction, setDirection] = useState<Direction>('UP');
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('hhr_snake_highscore') || '0', 10);
  });

  const directionRef = useRef<Direction>(direction);
  // To prevent multiple rapid key presses reversing the snake
  const lastProcessedDirectionRef = useRef<Direction>(direction);

  const startGame = useCallback(() => {
    setSnake(getInitialSnake());
    setDirection('UP');
    directionRef.current = 'UP';
    lastProcessedDirectionRef.current = 'UP';
    setFood(generateFood(getInitialSnake()));
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (lastProcessedDirectionRef.current !== 'DOWN') directionRef.current = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (lastProcessedDirectionRef.current !== 'UP') directionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (lastProcessedDirectionRef.current !== 'RIGHT') directionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (lastProcessedDirectionRef.current !== 'LEFT') directionRef.current = 'RIGHT';
          break;
        case ' ':
        case 'Escape':
          setIsPaused(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver]);

  const handleGameOver = useCallback(() => {
    setIsGameOver(true);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('hhr_snake_highscore', score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    if (isGameOver || isPaused) return;

    const moveSnake = () => {
      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        const currentDir = directionRef.current;
        lastProcessedDirectionRef.current = currentDir;

        switch (currentDir) {
          case 'UP':
            head.y -= 1;
            break;
          case 'DOWN':
            head.y += 1;
            break;
          case 'LEFT':
            head.x -= 1;
            break;
          case 'RIGHT':
            head.x += 1;
            break;
        }

        // Check Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          handleGameOver();
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check Food Collision
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          setFood(generateFood(newSnake));
        } else {
          newSnake.pop(); // Remove tail if no food eaten
        }

        return newSnake;
      });
    };

    // Increase speed slightly as score goes up
    const currentSpeed = Math.max(50, INITIAL_SPEED - Math.floor(score / 30) * 10);
    const gameLoop = setInterval(moveSnake, currentSpeed);

    return () => clearInterval(gameLoop);
  }, [isGameOver, isPaused, food, score, handleGameOver]);

  return (
    <div className="flex flex-col items-center bg-[#879571] p-6 rounded-xl shadow-inner border-4 border-slate-800 font-mono text-slate-900 select-none">
      {/* Header / Score */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <Gamepad2 size={20} />
          <span className="font-bold text-lg">SNAKE</span>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Score</span>
            <span className="font-bold leading-none">{score}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1">
              <Trophy size={10} /> HI
            </span>
            <span className="font-bold leading-none">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="relative bg-[#9EAD86] border-2 border-slate-700/50 p-1 rounded-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]">
        <div
          className="grid gap-[1px]"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: '240px',
            height: '240px',
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const isSnakeHead = snake[0].x === x && snake[0].y === y;
            const isSnakeBody = snake.some(s => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={i}
                className={`
                  w-full h-full rounded-[1px]
                  ${isSnakeHead ? 'bg-slate-900' : isSnakeBody ? 'bg-slate-800' : isFood ? 'bg-slate-900 animate-pulse' : 'bg-[#9EAD86]/30'}
                `}
                style={{
                  opacity: isSnakeBody ? 1 : isFood ? 1 : 0.2, // Simulate simple LCD dot matrix
                }}
              />
            );
          })}
        </div>

        {/* Overlays */}
        {isGameOver && (
          <div className="absolute inset-0 bg-[#879571]/90 flex flex-col items-center justify-center backdrop-blur-[1px] rounded-sm">
            <span className="text-xl font-bold mb-2 animate-bounce">GAME OVER</span>
            <button
              onClick={startGame}
              className="px-4 py-2 border-2 border-slate-900 rounded font-bold hover:bg-slate-900 hover:text-[#879571] transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} /> RESTART
            </button>
          </div>
        )}

        {isPaused && !isGameOver && (
          <div className="absolute inset-0 bg-[#879571]/80 flex flex-col items-center justify-center backdrop-blur-[1px] rounded-sm">
            <span className="text-xl font-bold mb-2">PAUSED</span>
            <button
              onClick={() => setIsPaused(false)}
              className="px-4 py-2 border-2 border-slate-900 rounded font-bold hover:bg-slate-900 hover:text-[#879571] transition-colors flex items-center gap-2"
            >
              <Play size={16} /> RESUME
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 text-[10px] uppercase font-bold opacity-60 flex gap-2 w-full justify-center">
        <span>WASD/ARROWS: Move</span>
        <span>•</span>
        <span>SPACE: Pause</span>
      </div>
    </div>
  );
};
