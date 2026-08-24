import { withAuth, ok, fail } from "@/lib/api/handlers";
import { saveMedia } from "@/lib/models/media";

export const POST = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const dataUrl = String(body.dataUrl ?? "");
  const name = String(body.name ?? "file");

  const result = await saveMedia(user.id, name, dataUrl);
  if (result.error || !result.media) {
    return fail(result.error ?? "upload.error.invalid");
  }
  // Only metadata comes back. The bytes are served from /api/media/[id] so the
  // payload never carries base64 around again.
  return ok({ media: result.media });
});

export const dynamic = "force-dynamic";
