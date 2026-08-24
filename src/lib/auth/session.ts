import { cookies } from "next/headers";
import {
  getSession,
  getSessionTokenFromRequest,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/models/session";
import { findUserById, type UserRecord } from "@/lib/models/user";

export { SESSION_COOKIE, getSessionTokenFromRequest };

/**
 * Cookie attributes for the session token.
 *
 * `secure` is on outside development so the token is never sent over plain
 * HTTP. It stays off locally because localhost is served without TLS and the
 * browser would otherwise drop the cookie entirely.
 */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/",
  };
}

export async function getAuthUser(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return findUserById(session.userId);
}

export async function requireAuth(): Promise<
  { user: UserRecord } | { error: string; status: number }
> {
  const user = await getAuthUser();
  if (!user) return { error: "common.error.auth", status: 401 };
  return { user };
}
