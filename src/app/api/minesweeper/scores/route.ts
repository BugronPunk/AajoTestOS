import { withAuth, ok, fail } from "@/lib/api/handlers";
import { listScores, recordScore, type ScoreRecord } from "@/lib/models/score";

export const GET = withAuth(async (user) => {
  const scores = await listScores(user.id);
  return ok({ scores });
});

export const POST = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const result = await recordScore(
    user.id,
    body.difficulty as ScoreRecord["difficulty"],
    Number(body.seconds),
    Boolean(body.won),
  );
  if (result.error) return fail(result.error);
  return ok({ score: result.score });
});

export const dynamic = "force-dynamic";
