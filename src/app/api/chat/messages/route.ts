import { withAuth, ok, fail } from "@/lib/api/handlers";
import {
  conversationBetween,
  markConversationRead,
  sendPermission,
} from "@/lib/models/message";

export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const peerId = searchParams.get("peerId");
  if (!peerId) return fail("chat.error.recipient");

  const [messages, permission] = await Promise.all([
    conversationBetween(user.id, peerId),
    sendPermission(user.id, peerId),
  ]);
  await markConversationRead(user.id, peerId);

  return ok({ messages, ...permission });
});

export const dynamic = "force-dynamic";
