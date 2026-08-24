import { withAuth, ok } from "@/lib/api/handlers";
import { listFriends } from "@/lib/models/friendship";
import { findUserById, toPublicUser } from "@/lib/models/user";

export const GET = withAuth(async (user) => {
  const friendships = await listFriends(user.id);
  const friends = await Promise.all(
    friendships.map(async (f) => {
      const peerId = f.fromUserId === user.id ? f.toUserId : f.fromUserId;
      const peer = await findUserById(peerId);
      return peer ? toPublicUser(peer) : null;
    }),
  );
  return ok({ friends: friends.filter(Boolean) });
});

export const dynamic = "force-dynamic";
