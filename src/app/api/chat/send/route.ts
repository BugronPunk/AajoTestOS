import { withAuth, ok, fail } from "@/lib/api/handlers";
import { sendMessage } from "@/lib/models/message";

export const POST = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const toUserId = String(body.toUserId ?? "");
  const content = String(body.content ?? "");
  const rawKind = String(body.kind ?? "text");
  const kind = rawKind === "image" || rawKind === "video" ? rawKind : "text";
  const mediaId = body.mediaId ? String(body.mediaId) : null;

  if (!toUserId) return fail("chat.error.recipient");

  const result = await sendMessage(user.id, toUserId, content, kind, mediaId);
  if (result.error) return fail(result.error);
  return ok({ message: result.message });
});

export const dynamic = "force-dynamic";
