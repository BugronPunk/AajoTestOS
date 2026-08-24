"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/lib/os/useLatestRef";
import { apiGet } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Bomb, Check, Clock, Flag, RotateCcw, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Difficulty = "beginner" | "intermediate" | "expert";
type GameStatus = "idle" | "playing" | "won" | "lost";
type Locale = "en" | "fr" | "zh";

interface Cell {
  isMine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
  exploded: boolean;
}

interface Score {
  id: string;
  userId: string;
  difficulty: Difficulty;
  seconds: number;
  won: boolean;
  createdAt: string;
}

interface LeaderboardEntry extends Score {
  username: string;
  displayName: string;
}

interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
  labelKey: string;
  minCell: number;
  maxCell: number;
}

const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    rows: 9,
    cols: 9,
    mines: 10,
    labelKey: "minesweeper.beginner",
    minCell: 22,
    maxCell: 44,
  },
  intermediate: {
    rows: 16,
    cols: 16,
    mines: 40,
    labelKey: "minesweeper.intermediate",
    minCell: 20,
    maxCell: 30,
  },
  expert: {
    rows: 16,
    cols: 30,
    mines: 99,
    labelKey: "minesweeper.expert",
    minCell: 16,
    maxCell: 22,
  },
};

// Calm palette: 1 slate, 2 emerald, 3 amber, 4 rose, 5 violet, 6 teal, 7 fuchsia, 8 zinc.
const NUMBER_COLORS = [
  "",
  "text-slate-600 dark:text-slate-300",
  "text-emerald-600 dark:text-emerald-400",
  "text-amber-600 dark:text-amber-400",
  "text-rose-600 dark:text-rose-400",
  "text-violet-600 dark:text-violet-400",
  "text-teal-600 dark:text-teal-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-zinc-700 dark:text-zinc-300",
];

type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

function createBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      isMine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
      exploded: false,
    })),
  );
}

function neighbors(
  r: number,
  c: number,
  rows: number,
  cols: number,
): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        result.push([nr, nc]);
      }
    }
  }
  return result;
}

// Place mines after the first click so the first revealed cell and its
// neighbors are guaranteed to be mine free.
function placeMines(
  board: Cell[][],
  safeR: number,
  safeC: number,
  mineCount: number,
): void {
  const rows = board.length;
  const cols = board[0].length;
  const safeSet = new Set<string>();
  safeSet.add(`${safeR},${safeC}`);
  for (const [nr, nc] of neighbors(safeR, safeC, rows, cols)) {
    safeSet.add(`${nr},${nc}`);
  }
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!safeSet.has(`${r},${c}`)) candidates.push([r, c]);
    }
  }
  // Fisher and Yates shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }
  const mines = Math.min(mineCount, candidates.length);
  for (let i = 0; i < mines; i++) {
    const [r, c] = candidates[i];
    board[r][c].isMine = true;
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].isMine) continue;
      let count = 0;
      for (const [nr, nc] of neighbors(r, c, rows, cols)) {
        if (board[nr][nc].isMine) count++;
      }
      board[r][c].adjacent = count;
    }
  }
}

// Iterative flood fill reveal. Marks the clicked mine as exploded.
function revealAt(
  board: Cell[][],
  startR: number,
  startC: number,
): { hitMine: boolean } {
  const rows = board.length;
  const cols = board[0].length;
  const startCell = board[startR][startC];
  if (startCell.revealed || startCell.flagged) return { hitMine: false };

  const stack: Array<[number, number]> = [[startR, startC]];
  let hitMine = false;

  while (stack.length > 0) {
    const [r, c] = stack.pop() as [number, number];
    const cell = board[r][c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.isMine) {
      hitMine = true;
      cell.exploded = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (const [nr, nc] of neighbors(r, c, rows, cols)) {
        const n = board[nr][nc];
        if (!n.revealed && !n.flagged) {
          stack.push([nr, nc]);
        }
      }
    }
  }

  return { hitMine };
}

function revealAllMines(board: Cell[][]): void {
  for (const row of board) {
    for (const cell of row) {
      if (cell.isMine && !cell.flagged) {
        cell.revealed = true;
      }
    }
  }
}

function checkWin(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.revealed) return false;
    }
  }
  return true;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function localeDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { month: "short", day: "numeric" },
  );
}

export function MinesweeperApp({
  userId,
  displayName: _displayName,
}: {
  userId: string;
  displayName: string;
}) {
  const { t, locale } = useI18n();
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const config = DIFFICULTIES[difficulty];
  const [board, setBoard] = useState<Cell[][]>(() =>
    createBoard(config.rows, config.cols),
  );
  const [status, setStatus] = useState<GameStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [flagsPlaced, setFlagsPlaced] = useState(0);
  const [scores, setScores] = useState<Score[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const boardRef = useLatestRef(board);
  const statusRef = useLatestRef(status);
  const secondsRef = useLatestRef(seconds);
  const minesPlacedRef = useRef(false);
  const submittedRef = useRef(false);

  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);
  const longPressedRef = useRef(false);

  const resetBoard = useCallback((d: Difficulty) => {
    const cfg = DIFFICULTIES[d];
    setBoard(createBoard(cfg.rows, cfg.cols));
    setStatus("idle");
    statusRef.current = "idle";
    setSeconds(0);
    secondsRef.current = 0;
    setFlagsPlaced(0);
    minesPlacedRef.current = false;
    submittedRef.current = false;
  }, []);

  // Timer: starts on first reveal (status becomes playing), stops on win/lose.
  useEffect(() => {
    if (status !== "playing") return;
    const interval = setInterval(() => {
      setSeconds((s) => Math.min(s + 1, 999));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const refreshScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const res = await fetch("/api/minesweeper/scores", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { scores: Score[] };
        setScores(data.scores ?? []);
      }
    } catch {
      // ignore network errors silently
    } finally {
      setScoresLoading(false);
    }
  }, []);

  const refreshLeaderboard = useCallback(async (d: Difficulty) => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/minesweeper/leaderboard?difficulty=${d}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { leaderboard: LeaderboardEntry[] };
        setLeaderboard(data.leaderboard ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [own, board] = await Promise.all([
        apiGet<{ scores: Score[] }>("/api/minesweeper/scores"),
        apiGet<{ leaderboard: LeaderboardEntry[] }>(
          `/api/minesweeper/leaderboard?difficulty=${difficulty}`,
        ),
      ]);
      if (cancelled) return;
      if (own.ok) setScores(own.data.scores ?? []);
      if (board.ok) setLeaderboard(board.data.leaderboard ?? []);
      setScoresLoading(false);
      setLeaderboardLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [difficulty]);

  const submitScore = useCallback(
    async (won: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const secs = secondsRef.current;
      try {
        await fetch("/api/minesweeper/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ difficulty, seconds: secs, won }),
        });
        await Promise.all([refreshScores(), refreshLeaderboard(difficulty)]);
      } catch {
        // ignore
      }
    },
    [difficulty, refreshScores, refreshLeaderboard],
  );

  const handleReveal = useCallback(
    (r: number, c: number) => {
      if (statusRef.current === "won" || statusRef.current === "lost") return;
      const prev = boardRef.current;
      const target = prev[r][c];
      if (target.revealed || target.flagged) return;

      const next = prev.map((row) => row.map((cc) => ({ ...cc })));

      if (!minesPlacedRef.current) {
        placeMines(next, r, c, config.mines);
        minesPlacedRef.current = true;
      }

      const { hitMine } = revealAt(next, r, c);
      let newStatus: GameStatus =
        statusRef.current === "idle" ? "playing" : statusRef.current;

      if (hitMine) {
        revealAllMines(next);
        newStatus = "lost";
      } else if (checkWin(next)) {
        newStatus = "won";
      }

      setBoard(next);

      if (newStatus !== statusRef.current) {
        statusRef.current = newStatus;
        setStatus(newStatus);
        if (newStatus === "lost") {
          void submitScore(false);
          toast.error(t("minesweeper.lose"));
        } else if (newStatus === "won") {
          void submitScore(true);
          toast.success(t("minesweeper.win"));
        }
      } else if (newStatus === "playing" && statusRef.current !== "playing") {
        statusRef.current = "playing";
        setStatus("playing");
      }
    },
    [config.mines, submitScore, t],
  );

  const handleToggleFlag = useCallback((r: number, c: number) => {
    if (statusRef.current === "won" || statusRef.current === "lost") return;
    const prev = boardRef.current;
    const cell = prev[r][c];
    if (cell.revealed) return;
    const next = prev.map((row) => row.map((cc) => ({ ...cc })));
    next[r][c].flagged = !next[r][c].flagged;
    setBoard(next);
    setFlagsPlaced((f) => f + (next[r][c].flagged ? 1 : -1));
    if (statusRef.current === "idle") {
      statusRef.current = "playing";
      setStatus("playing");
    }
  }, []);

  const handleNewGame = useCallback(() => {
    resetBoard(difficulty);
  }, [difficulty, resetBoard]);

  const handleDifficultyChange = useCallback(
    (d: Difficulty) => {
      setDifficulty(d);
      resetBoard(d);
    },
    [resetBoard],
  );

  // Touch long press support: hold a cell ~450ms to toggle a flag.
  const handleTouchStart = useCallback(() => {
    touchMovedRef.current = false;
    longPressedRef.current = false;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
    }, 450);
  }, []);

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (r: number, c: number) => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      if (longPressedRef.current && !touchMovedRef.current) {
        handleToggleFlag(r, c);
      }
    },
    [handleToggleFlag],
  );

  const handleClick = useCallback(
    (r: number, c: number) => {
      // Suppress the synthetic click that follows a long press flag.
      if (longPressedRef.current || touchMovedRef.current) {
        longPressedRef.current = false;
        touchMovedRef.current = false;
        return;
      }
      handleReveal(r, c);
    },
    [handleReveal],
  );

  const minesRemaining = Math.max(0, config.mines - flagsPlaced);

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      {/* Header */}
      <header className="border-b border-slate-200/70 px-3 py-2 dark:border-slate-800 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <Bomb className="h-3.5 w-3.5" />
            </span>
            <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("minesweeper.title")}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200/70 bg-slate-100/70 p-0.5 dark:border-slate-800 dark:bg-slate-900/50">
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
              const active = d === difficulty;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDifficultyChange(d)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition",
                    active
                      ? "shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
                  )}
                  style={
                    active
                      ? {
                          background: "var(--accent-spot, #0ea5e9)",
                          color: "white",
                        }
                      : undefined
                  }
                >
                  {t(DIFFICULTIES[d].labelKey)}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            onClick={handleNewGame}
            className="gap-1.5"
            style={{
              background: "var(--accent-spot, #0ea5e9)",
              color: "white",
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("minesweeper.newGame")}
          </Button>
        </div>

        {/* Stats bar */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100/70 px-2 py-1 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <Bomb className="h-3 w-3" />
            <span className="text-slate-400">{t("minesweeper.mines")}</span>
            <span className="font-mono font-semibold tabular-nums">
              {minesRemaining.toString().padStart(3, "0")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100/70 px-2 py-1 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <Clock className="h-3 w-3" />
            <span className="text-slate-400">{t("minesweeper.time")}</span>
            <span className="font-mono font-semibold tabular-nums">
              {formatTime(seconds)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100/70 px-2 py-1 text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <Flag className="h-3 w-3" />
            <span className="text-slate-400">{t("minesweeper.flags")}</span>
            <span className="font-mono font-semibold tabular-nums">
              {flagsPlaced.toString().padStart(3, "0")}
            </span>
          </div>

          {status === "won" || status === "lost" ? (
            <div
              className={cn(
                "ml-auto rounded-md px-2 py-1 text-xs font-medium",
                status === "won"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
              )}
            >
              {status === "won" ? t("minesweeper.win") : t("minesweeper.lose")}
            </div>
          ) : null}
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-auto p-3">
        <div
          className="mx-auto grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, minmax(${config.minCell}px, ${config.maxCell}px))`,
            width: "fit-content",
            maxWidth: "100%",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const revealed = cell.revealed;
              const isMine = cell.isMine;
              const exploded = cell.exploded;
              const flagged = cell.flagged;
              const adjacent = cell.adjacent;

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleClick(r, c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleToggleFlag(r, c);
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(r, c)}
                  disabled={status === "won" || status === "lost"}
                  aria-label={`r${r}c${c}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-[3px] text-xs font-bold transition-colors sm:text-sm",
                    revealed
                      ? isMine
                        ? exploded
                          ? "bg-rose-500 text-white"
                          : "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-100"
                        : "bg-slate-100/80 dark:bg-slate-900/60"
                      : flagged
                        ? "bg-amber-100/80 dark:bg-amber-950/40"
                        : "bg-slate-200 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700",
                  )}
                >
                  {revealed ? (
                    isMine ? (
                      <Bomb className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    ) : adjacent > 0 ? (
                      <span className={NUMBER_COLORS[adjacent] ?? ""}>
                        {adjacent}
                      </span>
                    ) : null
                  ) : flagged ? (
                    <Flag className="h-3 w-3 text-amber-600 sm:h-3.5 sm:w-3.5 dark:text-amber-400" />
                  ) : null}
                </button>
              );
            }),
          )}
        </div>
      </div>

      {/* Leaderboard + Stats */}
      <Tabs
        defaultValue="leaderboard"
        className="border-t border-slate-200/70 dark:border-slate-800"
      >
        <div className="flex items-center justify-between px-3 pt-2 sm:px-4">
          <TabsList>
            <TabsTrigger value="leaderboard" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              {t("minesweeper.leaderboard")}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("minesweeper.yourStats")}
            </TabsTrigger>
          </TabsList>
          <span className="text-[11px] text-slate-400">
            {t(config.labelKey)}
          </span>
        </div>

        <TabsContent value="leaderboard" className="mt-0 px-3 pb-3 sm:px-4">
          <ScrollArea className="max-h-56">
            <LeaderboardTable
              entries={leaderboard}
              loading={leaderboardLoading}
              userId={userId}
              t={t}
              locale={locale}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="stats" className="mt-0 px-3 pb-3 sm:px-4">
          <ScrollArea className="max-h-56">
            <StatsTable
              scores={scores}
              loading={scoresLoading}
              t={t}
              locale={locale}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  userId: string;
  t: TranslateFn;
  locale: Locale;
}

function LeaderboardTable({
  entries,
  loading,
  userId,
  t,
  locale: _locale,
}: LeaderboardTableProps) {
  if (loading) {
    return <TableSkeleton />;
  }
  if (entries.length === 0) {
    return <EmptyState label={t("minesweeper.empty")} />;
  }
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-400">
          <th className="w-10 px-2 py-1.5 font-medium">
            {t("minesweeper.rank")}
          </th>
          <th className="px-2 py-1.5 font-medium">{t("minesweeper.player")}</th>
          <th className="px-2 py-1.5 text-right font-medium">
            {t("minesweeper.seconds")}
          </th>
          <th className="hidden px-2 py-1.5 text-right font-medium sm:table-cell">
            {t("minesweeper.difficulty")}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => {
          const mine = entry.userId === userId;
          return (
            <tr
              key={entry.id}
              className="border-t border-slate-100 dark:border-slate-800/60"
              style={
                mine
                  ? {
                      background: "var(--accent-spot, #0ea5e9)",
                      color: "white",
                    }
                  : undefined
              }
            >
              <td className="px-2 py-1.5 font-mono tabular-nums">{i + 1}</td>
              <td className="truncate px-2 py-1.5">{entry.displayName}</td>
              <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                {entry.seconds}
              </td>
              <td className="hidden px-2 py-1.5 text-right sm:table-cell">
                {t(DIFFICULTIES[entry.difficulty].labelKey)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface StatsTableProps {
  scores: Score[];
  loading: boolean;
  t: TranslateFn;
  locale: Locale;
}

function StatsTable({ scores, loading, t, locale }: StatsTableProps) {
  if (loading) {
    return <TableSkeleton />;
  }
  if (scores.length === 0) {
    return <EmptyState label={t("minesweeper.empty")} />;
  }
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="text-slate-400">
          <th className="w-8 px-2 py-1.5" />
          <th className="px-2 py-1.5 font-medium">
            {t("minesweeper.difficulty")}
          </th>
          <th className="px-2 py-1.5 text-right font-medium">
            {t("minesweeper.seconds")}
          </th>
          <th className="px-2 py-1.5 text-right font-medium">
            {t("files.date")}
          </th>
        </tr>
      </thead>
      <tbody>
        {scores.map((s) => (
          <tr
            key={s.id}
            className="border-t border-slate-100 dark:border-slate-800/60"
          >
            <td className="px-2 py-1.5">
              {s.won ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <X className="h-3.5 w-3.5 text-rose-500" />
              )}
            </td>
            <td className="px-2 py-1.5">
              {t(DIFFICULTIES[s.difficulty].labelKey)}
            </td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums">
              {s.seconds}
            </td>
            <td className="px-2 py-1.5 text-right text-slate-500">
              {localeDate(s.createdAt, locale)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-800/60"
        />
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-slate-400">
      <Trophy className="h-6 w-6 opacity-40" />
      <p className="text-xs">{label}</p>
    </div>
  );
}
