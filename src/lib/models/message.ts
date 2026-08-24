import {
  read,
  transaction,
  nextId,
  type MessageRecord,
} from "@/lib/store/engine";

export type { MessageRecord };

/**
 * Budget for people who are not friends yet.
 *
 * The cap is counted per sender, not per conversation. Counting the whole
 * conversation meant that once a stranger spent three messages the recipient
 * was silenced and could never reply, which defeated the point of the stranger
 * channel: giving two people enough room to decide whether to become friends.
 */
export const STRANGER_MAX_MESSAGES = 3;
export const STRANGER_MAX_CHARS = 500;

function isAccepted(
  friendships: Array<{
    fromUserId: string;
    toUserId: string;
    status: string;
  }>,
  a: string,
  b: string,
): boolean {
  return friendships.some(
    (f) =>
      f.status === "accepted" &&
      ((f.fromUserId === a && f.toUserId === b) ||
        (f.fromUserId === b && f.toUserId === a)),
  );
}

export async function conversationBetween(
  a: string,
  b: string,
): Promise<MessageRecord[]> {
  const messages = await read("messages");
  return messages
    .filter(
      (m) =>
        (m.fromUserId === a && m.toUserId === b) ||
        (m.fromUserId === b && m.toUserId === a),
    )
    .sort(
      (x, y) =>
        new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
    );
}

export interface SendPermission {
  isFriend: boolean;
  canSend: boolean;
  reason?: string;
  kind: "text" | "any";
  strangerMax: number;
  strangerMaxChars: number;
  strangerRemaining: number;
}

export async function sendPermission(
  fromUserId: string,
  toUserId: string,
): Promise<SendPermission> {
  const [messages, friendships] = await Promise.all([
    read("messages"),
    read("friendships"),
  ]);
  const friends = isAccepted(friendships, fromUserId, toUserId);
  if (friends) {
    return {
      isFriend: true,
      canSend: true,
      kind: "any",
      strangerMax: STRANGER_MAX_MESSAGES,
      strangerMaxChars: STRANGER_MAX_CHARS,
      strangerRemaining: STRANGER_MAX_MESSAGES,
    };
  }
  const sent = messages.filter(
    (m) => m.fromUserId === fromUserId && m.toUserId === toUserId,
  ).length;
  const remaining = Math.max(0, STRANGER_MAX_MESSAGES - sent);
  return {
    isFriend: false,
    canSend: remaining > 0,
    reason: remaining > 0 ? undefined : "chat.error.strangerLimit",
    kind: "text",
    strangerMax: STRANGER_MAX_MESSAGES,
    strangerMaxChars: STRANGER_MAX_CHARS,
    strangerRemaining: remaining,
  };
}

export async function sendMessage(
  fromUserId: string,
  toUserId: string,
  content: string,
  kind: "text" | "image" | "video",
  mediaId: string | null,
): Promise<{ message?: MessageRecord; error?: string }> {
  if (fromUserId === toUserId) return { error: "chat.error.selfMessage" };

  // Every rule is enforced inside one lock. Previously the cap was checked in a
  // separate read, so two simultaneous sends could both see two messages used
  // and both write, taking the sender past the limit.
  return transaction(
    ["messages", "friendships", "media"],
    ({ messages, friendships, media }) => {
      const friends = isAccepted(friendships, fromUserId, toUserId);

      if (kind !== "text") {
        if (!friends) return { error: "chat.error.mediaFriendsOnly" };
        if (!mediaId) return { error: "chat.error.mediaMissing" };
        const asset = media.find(
          (m) => m.id === mediaId && m.userId === fromUserId,
        );
        if (!asset) return { error: "chat.error.mediaMissing" };
      }

      let body = content;
      if (kind === "text") {
        if (body.length > STRANGER_MAX_CHARS && !friends) {
          // Rejected outright. Silently truncating discarded what the person
          // actually typed without telling them.
          return { error: "chat.error.tooLong" };
        }
        if (body.trim().length === 0) return { error: "chat.error.empty" };
        body = body.trim();
      } else {
        body = "";
      }

      if (!friends) {
        const sent = messages.filter(
          (m) => m.fromUserId === fromUserId && m.toUserId === toUserId,
        ).length;
        if (sent >= STRANGER_MAX_MESSAGES) {
          return { error: "chat.error.strangerLimit" };
        }
      }

      const message: MessageRecord = {
        id: nextId("msg"),
        fromUserId,
        toUserId,
        content: body,
        kind,
        mediaId: kind === "text" ? null : mediaId,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      messages.push(message);
      return { message };
    },
  );
}

export async function markConversationRead(
  readerId: string,
  peerId: string,
): Promise<void> {
  await transaction(["messages"], ({ messages }) => {
    const now = new Date().toISOString();
    for (const m of messages) {
      if (m.toUserId === readerId && m.fromUserId === peerId && !m.readAt) {
        m.readAt = now;
      }
    }
  });
}

export async function markAllConversationsRead(
  readerId: string,
): Promise<number> {
  return transaction(["messages"], ({ messages }) => {
    const now = new Date().toISOString();
    let marked = 0;
    for (const m of messages) {
      if (m.toUserId === readerId && !m.readAt) {
        m.readAt = now;
        marked += 1;
      }
    }
    return marked;
  });
}

export async function conversationsFor(
  userId: string,
): Promise<
  Array<{ peerId: string; lastMessage: MessageRecord; unread: number }>
> {
  const messages = await read("messages");
  const peers = new Map<string, MessageRecord[]>();
  for (const m of messages) {
    if (m.fromUserId !== userId && m.toUserId !== userId) continue;
    const peer = m.fromUserId === userId ? m.toUserId : m.fromUserId;
    const bucket = peers.get(peer);
    if (bucket) bucket.push(m);
    else peers.set(peer, [m]);
  }

  const result: Array<{
    peerId: string;
    lastMessage: MessageRecord;
    unread: number;
  }> = [];
  for (const [peerId, list] of peers) {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    result.push({
      peerId,
      lastMessage: sorted[sorted.length - 1],
      unread: list.filter((m) => m.toUserId === userId && !m.readAt).length,
    });
  }
  return result.sort(
    (a, b) =>
      new Date(b.lastMessage.createdAt).getTime() -
      new Date(a.lastMessage.createdAt).getTime(),
  );
}
