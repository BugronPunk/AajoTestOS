import { withAuth, ok, fail } from "@/lib/api/handlers";
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/lib/models/note";

export const GET = withAuth(async (user) => {
  const notes = await listNotes(user.id);
  return ok({ notes });
});

export const POST = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const result = await createNote(
    user.id,
    String(body.title ?? ""),
    String(body.content ?? ""),
    String(body.color ?? "#f5f5f4"),
  );
  if (result.error) return fail(result.error);
  return ok({ note: result.note });
});

export const PATCH = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  if (!body.id) return fail("notes.error.missing");
  const result = await updateNote(String(body.id), user.id, {
    title: body.title !== undefined ? String(body.title) : undefined,
    content: body.content !== undefined ? String(body.content) : undefined,
    color: body.color !== undefined ? String(body.color) : undefined,
    pinned: body.pinned !== undefined ? Boolean(body.pinned) : undefined,
  });
  if (result.error) return fail(result.error, 404);
  return ok({ note: result.note });
});

export const DELETE = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return fail("notes.error.missing");
  const removed = await deleteNote(id, user.id);
  if (!removed) return fail("notes.error.missing", 404);
  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
