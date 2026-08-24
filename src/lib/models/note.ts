import { read, transaction, nextId, type NoteRecord } from "@/lib/store/engine";

export type { NoteRecord };

export const NOTE_TITLE_MAX = 120;
export const NOTE_CONTENT_MAX = 100_000;

function sortNotes(notes: NoteRecord[]): NoteRecord[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function listNotes(userId: string): Promise<NoteRecord[]> {
  const notes = await read("notes");
  return sortNotes(notes.filter((n) => n.userId === userId));
}

export async function createNote(
  userId: string,
  title: string,
  content: string,
  color: string,
): Promise<{ note?: NoteRecord; error?: string }> {
  if (content.length > NOTE_CONTENT_MAX)
    return { error: "notes.error.tooLong" };
  const now = new Date().toISOString();
  const note: NoteRecord = {
    id: nextId("note"),
    userId,
    title: title.slice(0, NOTE_TITLE_MAX),
    content,
    color,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  await transaction(["notes"], ({ notes }) => {
    notes.push(note);
  });
  return { note };
}

export async function updateNote(
  noteId: string,
  userId: string,
  patch: Partial<Pick<NoteRecord, "title" | "content" | "color" | "pinned">>,
): Promise<{ note?: NoteRecord; error?: string }> {
  if (patch.content !== undefined && patch.content.length > NOTE_CONTENT_MAX) {
    return { error: "notes.error.tooLong" };
  }
  return transaction(["notes"], ({ notes }) => {
    // Ownership is part of the match, so one user can never patch another
    // user's note by guessing an id.
    const idx = notes.findIndex((n) => n.id === noteId && n.userId === userId);
    if (idx === -1) return { error: "notes.error.missing" };
    notes[idx] = {
      ...notes[idx],
      ...patch,
      title:
        patch.title !== undefined
          ? patch.title.slice(0, NOTE_TITLE_MAX)
          : notes[idx].title,
      updatedAt: new Date().toISOString(),
    };
    return { note: notes[idx] };
  });
}

export async function deleteNote(
  noteId: string,
  userId: string,
): Promise<boolean> {
  return transaction(["notes"], ({ notes }) => {
    const idx = notes.findIndex((n) => n.id === noteId && n.userId === userId);
    if (idx === -1) return false;
    notes.splice(idx, 1);
    return true;
  });
}
