import { withAuth, ok } from "@/lib/api/handlers";
import {
  conversationsFor,
  markAllConversationsRead,
} from "@/lib/models/message";
import { findUserById, toPublicUser } from "@/lib/models/user";
import { isFriend } from "@/lib/models/friendship";

export const GET = withAuth(async (user) => {
  const convos = await conversationsFor(user.id);
  const enriched = await Promise.all(
    convos.map(async (c) => {
      const peer = await findUserById(c.peerId);
      const friends = await isFriend(user.id, c.peerId);
      return {
        peer: peer ? toPublicUser(peer) : null,
        lastMessage: c.lastMessage,
        unread: c.unread,
        isFriend: friends,
      };
    }),
  );
  return ok({ conversations: enriched.filter((c) => c.peer) });
});

export const PATCH = withAuth(async (user) => {
  const marked = await markAllConversationsRead(user.id);
  return ok({ ok: true, marked });
});

export const dynamic = "force-dynamic";
