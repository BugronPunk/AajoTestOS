import {
  read,
  transaction,
  nextId,
  type ScoreRecord,
} from "@/lib/store/engine";

export type { ScoreRecord };

export const DIFFICULTIES: ScoreRecord["difficulty"][] = [
  "beginner",
  "intermediate",
  "expert",
];

// A board cannot be cleared instantly and cannot run for a day. Values outside
// this range are a forged request rather than a real game.
const MIN_SECONDS = 1;
const MAX_SECONDS = 60 * 60 * 12;

export async function listScores(userId: string): Promise<ScoreRecord[]> {
  const scores = await read("scores");
  return scores
    .filter((s) => s.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function listLeaderboard(
  difficulty: ScoreRecord["difficulty"],
  limit = 10,
): Promise<Array<ScoreRecord & { username: string; displayName: string }>> {
  const [scores, users] = await Promise.all([read("scores"), read("users")]);
  const byId = new Map(users.map((u) => [u.id, u]));
  return scores
    .filter((s) => s.difficulty === difficulty && s.won)
    .sort((a, b) => a.seconds - b.seconds)
    .slice(0, limit)
    .map((s) => {
      const user = byId.get(s.userId);
      return {
        ...s,
        username: user?.username ?? "unknown",
        displayName: user?.displayName ?? "Unknown",
      };
    });
}

export async function recordScore(
  userId: string,
  difficulty: ScoreRecord["difficulty"],
  seconds: number,
  won: boolean,
): Promise<{ score?: ScoreRecord; error?: string }> {
  if (!DIFFICULTIES.includes(difficulty)) {
    return { error: "minesweeper.error.difficulty" };
  }
  if (!Number.isFinite(seconds)) return { error: "minesweeper.error.time" };
  const rounded = Math.round(seconds);
  if (rounded < MIN_SECONDS || rounded > MAX_SECONDS) {
    return { error: "minesweeper.error.time" };
  }

  const score: ScoreRecord = {
    id: nextId("scr"),
    userId,
    difficulty,
    seconds: rounded,
    won,
    createdAt: new Date().toISOString(),
  };
  await transaction(["scores"], ({ scores }) => {
    scores.push(score);
  });
  return { score };
}
