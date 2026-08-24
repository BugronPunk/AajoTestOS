import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticate, createUser, toPublicUser } from "@/lib/models/user";
import {
  createSession,
  getSession,
  SESSION_COOKIE,
} from "@/lib/models/session";
import { sessionCookieOptions } from "@/lib/auth/session";
import { findUserById } from "@/lib/models/user";
import { listMediaForUser } from "@/lib/models/media";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = body.action as "login" | "signup" | undefined;
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  if (action !== "login" && action !== "signup") {
    return NextResponse.json({ error: "auth.error.action" }, { status: 400 });
  }

  const result =
    action === "signup"
      ? await createUser(username, password)
      : await authenticate(username, password);

  if (result.error || !result.user) {
    return NextResponse.json(
      { error: result.error ?? "auth.error.badCredentials" },
      { status: 400 },
    );
  }

  const session = await createSession(result.user.id);
  const res = NextResponse.json({
    user: toPublicUser(result.user),
    locale: result.user.language,
  });
  res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions());
  return res;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ user: null });

  const session = await getSession(token);
  if (!session) return NextResponse.json({ user: null });

  const user = await findUserById(session.userId);
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({
    user: toPublicUser(user),
    media: await listMediaForUser(user.id),
    locale: user.language,
  });
}

export const dynamic = "force-dynamic";
