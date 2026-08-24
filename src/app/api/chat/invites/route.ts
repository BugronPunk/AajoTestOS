import { withAuth, ok, fail } from "@/lib/api/handlers";
import {
  listPendingInvites,
  listSentInvites,
  createInvite,
  respondToInvite,
} from "@/lib/models/friendship";
import { findUserById, toPublicUser } from "@/lib/models/user";

export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "sent" ? "sent" : "incoming";
  const records =
    scope === "sent"
      ? await listSentInvites(user.id)
      : await listPendingInvites(user.id);

  const invites = await Promise.all(
    records.map(async (f) => {
      const otherId = f.fromUserId === user.id ? f.toUserId : f.fromUserId;
      const other = await findUserById(otherId);
      return {
        id: f.id,
        status: f.status,
        createdAt: f.createdAt,
        direction: f.fromUserId === user.id ? "sent" : "incoming",
        user: other ? toPublicUser(other) : null,
      };
    }),
  );
  return ok({ invites: invites.filter((i) => i.user) });
});

export const POST = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const toUserId = String(body.toUserId ?? "");
  if (!toUserId) return fail("chat.error.recipient");
  const result = await createInvite(user.id, toUserId);
  if (result.error) return fail(result.error);
  return ok({ invite: result.invite });
});

export const PATCH = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const inviteId = String(body.inviteId ?? "");
  if (!inviteId) return fail("chat.error.inviteMissing");
  const result = await respondToInvite(inviteId, user.id, Boolean(body.accept));
  if (result.error) return fail(result.error);
  return ok({
    ok: true,
    accepted: Boolean(body.accept),
    peerId: result.peerId,
  });
});

export const dynamic = "force-dynamic";
