"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Trophy, Gamepad2 } from "lucide-react";
import { toast } from "sonner";

interface SnakeAppProps {
  userId: string;
}

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";

const GRID_SIZE = 17;
const CELL_SIZE = 24;

const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function generateFood(snake: Point[]): Point {
  let food: Point;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  return food;
}

export function SnakeApp({ userId }: SnakeAppProps) {
  const { t } = useI18n();
  const [snake, setSnake] = useState<Point[]>([{ x: 8, y: 8 }]);
  const [direction, setDirection] = useState<Direction>("right");
  const [food, setFood] = useState<Point>({ x: 4, y: 8 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [speed, setSpeed] = useState(150);
  const directionRef = useRef<Direction>("right");
  const nextDirectionRef = useRef<Direction>("right");

  void userId;

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  const reset = useCallback(() => {
    const newSnake = [{ x: 8, y: 8 }];
    setSnake(newSnake);
    setFood(generateFood(newSnake));
    setDirection("right");
    nextDirectionRef.current = "right";
    setScore(0);
    setGameOver(false);
    setSpeed(150);
  }, []);

  const tick = useCallback(() => {
    setSnake((prev) => {
      const dir = nextDirectionRef.current;
      directionRef.current = dir;
      const delta = DIRECTIONS[dir];
      const head = prev[0];
      const newHead = { x: head.x + delta.x, y: head.y + delta.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameOver(true);
        setRunning(false);
        setHighScore((hs) => Math.max(hs, score));
        toast.error(t("snake.gameOver"));
        return prev;
      }

      // Self collision
      if (prev.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setGameOver(true);
        setRunning(false);
        setHighScore((hs) => Math.max(hs, score));
        toast.error(t("snake.gameOver"));
        return prev;
      }

      const newSnake = [newHead, ...prev];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        setFood(generateFood(newSnake));
        setSpeed((sp) => Math.max(60, sp - 3));
        toast.success("+10", { duration: 800 });
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, score, t]);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = setInterval(tick, speed);
    return () => clearInterval(id);
  }, [running, gameOver, tick, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      const keyMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const newDir = keyMap[e.key];
      if (newDir && newDir !== OPPOSITE[directionRef.current]) {
        e.preventDefault();
        nextDirectionRef.current = newDir;
        setDirection(newDir);
        if (!running) setRunning(true);
      } else if (e.key === " ") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, gameOver]);

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("snake.title")}
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">{t("snake.score")}</span>
            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {score}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-400" />
            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {highScore}
            </span>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div
          className="relative rounded-xl border-2 border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-slate-900"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {/* Grid lines */}
          <svg
            className="absolute inset-0 h-full w-full opacity-20"
            viewBox={`0 0 ${GRID_SIZE * CELL_SIZE} ${GRID_SIZE * CELL_SIZE}`}
          >
            {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
              <line
                key={"h" + i}
                x1="0"
                y1={i * CELL_SIZE}
                x2={GRID_SIZE * CELL_SIZE}
                y2={i * CELL_SIZE}
                stroke="#cbd5e1"
                strokeWidth="0.5"
              />
            ))}
            {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
              <line
                key={"v" + i}
                x1={i * CELL_SIZE}
                y1="0"
                x2={i * CELL_SIZE}
                y2={GRID_SIZE * CELL_SIZE}
                stroke="#cbd5e1"
                strokeWidth="0.5"
              />
            ))}
          </svg>

          {/* Food */}
          <motion.div
            key={food.x + "-" + food.y}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute rounded-full bg-rose-500 shadow-md"
            style={{
              left: food.x * CELL_SIZE + 2,
              top: food.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
            }}
          >
            <div className="absolute inset-1 rounded-full bg-rose-400" />
          </motion.div>

          {/* Snake */}
          {snake.map((seg, idx) => {
            const isHead = idx === 0;
            const length = snake.length;
            const opacity = 1 - (idx / length) * 0.4;
            return (
              <motion.div
                key={idx}
                animate={{
                  left: seg.x * CELL_SIZE + 1,
                  top: seg.y * CELL_SIZE + 1,
                }}
                transition={{ duration: speed / 1000, ease: "linear" }}
                className="absolute rounded"
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  background: isHead
                    ? "var(--accent-spot, #0ea5e9)"
                    : `color-mix(in srgb, var(--accent-spot, #0ea5e9) ${opacity * 100}%, white)`,
                  zIndex: isHead ? 10 : 1,
                  boxShadow: isHead ? "0 0 8px rgba(14,165,233,0.5)" : "none",
                }}
              >
                {isHead && (
                  <div className="absolute right-0.5 top-0.5 h-1 w-1 rounded-full bg-white" />
                )}
              </motion.div>
            );
          })}

          {/* Game Over overlay */}
          {gameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm"
            >
              <h3 className="text-2xl font-bold text-white">
                {t("snake.gameOver")}
              </h3>
              <p className="text-sm text-white/70">
                {t("snake.score")}: {score}
              </p>
              <Button
                onClick={reset}
                size="sm"
                className="rounded-lg"
                style={{
                  background: "var(--accent-spot, #0ea5e9)",
                  color: "white",
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t("snake.newGame")}
              </Button>
            </motion.div>
          )}

          {/* Paused overlay */}
          {!gameOver && !running && snake.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-white/80 px-6 py-3 text-center shadow-lg dark:bg-slate-800/80"
              >
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("snake.instruction")}
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRunning((r) => !r)}
          disabled={gameOver}
          className="rounded-lg"
        >
          {running ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? t("snake.pause") : t("snake.resume")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="rounded-lg"
        >
          <RotateCcw className="h-4 w-4" />
          {t("snake.newGame")}
        </Button>
        <span className="ml-2 text-[11px] text-slate-400">
          {t("snake.length")}: {snake.length} · {t("snake.speed")}:{" "}
          {Math.round((150 - speed) / 9) + 1}x
        </span>
      </div>
    </div>
  );
}
