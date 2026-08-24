import { withAuth, ok } from "@/lib/api/handlers";
import {
  listLeaderboard,
  DIFFICULTIES,
  type ScoreRecord,
} from "@/lib/models/score";

export const GET = withAuth(async (_user, request) => {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("difficulty") ?? "beginner";
  const difficulty = (
    DIFFICULTIES.includes(requested as ScoreRecord["difficulty"])
      ? requested
      : "beginner"
  ) as ScoreRecord["difficulty"];
  const leaderboard = await listLeaderboard(difficulty, 10);
  return ok({ difficulty, leaderboard });
});

export const dynamic = "force-dynamic";
