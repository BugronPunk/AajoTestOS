import { NextResponse } from "next/server";
import {
  deleteSession,
  getSessionTokenFromRequest,
  SESSION_COOKIE,
} from "@/lib/models/session";
import { sessionCookieOptions } from "@/lib/auth/session";

export async function POST(request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (token) await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
  return res;
}

export const dynamic = "force-dynamic";
