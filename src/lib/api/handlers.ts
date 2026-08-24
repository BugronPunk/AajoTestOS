import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import type { UserRecord } from "@/lib/store/engine";

export type RouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

export type AuthedHandler = (
  user: UserRecord,
  request: Request,
  context: RouteContext,
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: AuthedHandler) {
  return async (
    request: Request,
    context: RouteContext,
  ): Promise<NextResponse> => {
    const auth = await requireAuth();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    try {
      return await handler(auth.user, request, context);
    } catch (err) {
      console.error("[api error]", err);
      return NextResponse.json(
        { error: "common.error.server" },
        { status: 500 },
      );
    }
  };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Every failure carries a translation key rather than an English sentence.
 * The server has no idea which of the three locales the reader uses, so the
 * client resolves the key through the same dictionary the rest of the UI uses.
 */
export function fail(code: string, status = 400) {
  return NextResponse.json({ error: code }, { status });
}
