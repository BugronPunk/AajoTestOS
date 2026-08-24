import {
  read,
  transaction,
  nextId,
  newToken,
  type SessionRecord,
} from "@/lib/store/engine";

export type { SessionRecord };

const SESSION_DAYS = 7;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;
export const SESSION_COOKIE = "aajostest_session";

export async function createSession(userId: string): Promise<SessionRecord> {
  const now = new Date();
  const session: SessionRecord = {
    id: nextId("ses"),
    token: newToken(),
    userId,
    createdAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + SESSION_MAX_AGE_SECONDS * 1000,
    ).toISOString(),
  };

  await transaction(["sessions", "users"], ({ sessions, users }) => {
    // Expired rows are swept here rather than on a timer. Every login already
    // pays for the write, so sessions can no longer accumulate without bound.
    const cutoff = now.getTime();
    const live = sessions.filter(
      (s) => new Date(s.expiresAt).getTime() >= cutoff,
    );
    live.push(session);
    sessions.length = 0;
    sessions.push(...live);

    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) users[idx].lastSeenAt = now.toISOString();
  });

  return session;
}

export async function getSession(
  token: string | undefined | null,
): Promise<SessionRecord | null> {
  if (!token) return null;
  const sessions = await read("sessions");
  const session = sessions.find((s) => s.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return session;
}

export async function deleteSession(token: string): Promise<void> {
  await transaction(["sessions"], ({ sessions }) => {
    const kept = sessions.filter((s) => s.token !== token);
    sessions.length = 0;
    sessions.push(...kept);
  });
}

export function getSessionTokenFromRequest(
  request: Request,
): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  return parseSessionCookie(header);
}

/**
 * Pulls the session token out of a raw Cookie header. Shared with the chat
 * service so both sides agree on exactly one parsing rule.
 */
export function parseSessionCookie(header: string): string | undefined {
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}
