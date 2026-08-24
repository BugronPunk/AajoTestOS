import { NextResponse } from "next/server";
import { withAuth, fail } from "@/lib/api/handlers";
import { findMedia, loadMediaBytes } from "@/lib/models/media";
import { read } from "@/lib/store/engine";

/**
 * Serves stored media bytes.
 *
 * Access is deliberately narrow: the uploader, or somebody who was actually
 * sent the asset in a message. Guessing an id gets you nothing.
 */
export const GET = withAuth(async (user, _request, context) => {
  const params = await context.params;
  const rawId = params.id;
  const mediaId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!mediaId) return fail("upload.error.invalid");

  const record = await findMedia(mediaId);
  if (!record) return fail("upload.error.missing", 404);

  if (record.userId !== user.id) {
    const messages = await read("messages");
    const shared = messages.some(
      (m) =>
        m.mediaId === mediaId &&
        (m.toUserId === user.id || m.fromUserId === user.id),
    );
    if (!shared) return fail("common.error.auth", 403);
  }

  const bytes = await loadMediaBytes(record);
  if (!bytes) return fail("upload.error.missing", 404);

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": record.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const dynamic = "force-dynamic";
