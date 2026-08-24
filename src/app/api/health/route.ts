import { NextResponse } from "next/server";
import { read } from "@/lib/store/engine";

/**
 * Liveness probe for the hosting platform.
 *
 * It touches the store so a deploy where the data directory is missing or
 * unwritable fails the health check instead of serving a broken app. Nothing
 * here reveals user data: only whether the store can be read.
 */
export async function GET() {
  try {
    await read("users");
  } catch {
    return NextResponse.json(
      { status: "degraded", store: "unreachable" },
      { status: 503 },
    );
  }
  return NextResponse.json({
    status: "ok",
    service: "aajotestos",
    uptimeSeconds: Math.round(process.uptime()),
  });
}

export const dynamic = "force-dynamic";
