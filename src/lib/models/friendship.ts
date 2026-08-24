import {
  read,
  transaction,
  nextId,
  type FriendshipRecord,
} from "@/lib/store/engine";

export type { FriendshipRecord };

export async function listFriends(userId: string): Promise<FriendshipRecord[]> {
  const friendships = await read("friendships");
  return friendships.filter(
    (f) =>
      (f.fromUserId === userId || f.toUserId === userId) &&
      f.status === "accepted",
  );
}

export async function listPendingInvites(
  userId: string,
): Promise<FriendshipRecord[]> {
  const friendships = await read("friendships");
  return friendships.filter(
    (f) => f.toUserId === userId && f.status === "pending",
  );
}

export async function listSentInvites(
  userId: string,
): Promise<FriendshipRecord[]> {
  const friendships = await read("friendships");
  return friendships.filter(
    (f) => f.fromUserId === userId && f.status === "pending",
  );
}

export async function isFriend(a: string, b: string): Promise<boolean> {
  const friendships = await read("friendships");
  return friendships.some(
    (f) =>
      f.status === "accepted" &&
      ((f.fromUserId === a && f.toUserId === b) ||
        (f.fromUserId === b && f.toUserId === a)),
  );
}

export async function createInvite(
  fromUserId: string,
  toUserId: string,
): Promise<{ invite?: FriendshipRecord; error?: string }> {
  if (fromUserId === toUserId) return { error: "chat.error.selfInvite" };

  // Checking for an existing pair and inserting inside one lock. Two invites
  // fired at once used to produce two pending rows for the same pair.
  return transaction(["friendships", "users"], ({ friendships, users }) => {
    if (!users.some((u) => u.id === toUserId)) {
      return { error: "chat.error.userMissing" };
    }
    const existing = friendships.find(
      (f) =>
        (f.fromUserId === fromUserId && f.toUserId === toUserId) ||
        (f.fromUserId === toUserId && f.toUserId === fromUserId),
    );
    if (existing) {
      if (existing.status === "accepted") {
        return { error: "chat.error.alreadyFriends" };
      }
      if (existing.status === "pending") {
        return { error: "chat.error.invitePending" };
      }
      // A previous rejection is allowed to be retried, so the row is reopened
      // rather than leaving the pair permanently blocked.
      existing.status = "pending";
      existing.fromUserId = fromUserId;
      existing.toUserId = toUserId;
      existing.createdAt = new Date().toISOString();
      existing.respondedAt = null;
      return { invite: existing };
    }

    const invite: FriendshipRecord = {
      id: nextId("frd"),
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };
    friendships.push(invite);
    return { invite };
  });
}

export async function respondToInvite(
  inviteId: string,
  responderId: string,
  accept: boolean,
): Promise<{ ok?: boolean; peerId?: string; error?: string }> {
  return transaction(["friendships"], ({ friendships }) => {
    const invite = friendships.find(
      (f) =>
        f.id === inviteId &&
        f.toUserId === responderId &&
        f.status === "pending",
    );
    if (!invite) return { error: "chat.error.inviteMissing" };
    invite.status = accept ? "accepted" : "rejected";
    invite.respondedAt = new Date().toISOString();
    return { ok: true, peerId: invite.fromUserId };
  });
}
