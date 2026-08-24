"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef } from "@/lib/os/useLatestRef";
import { apiGet } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scrollArea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alertDialog";
import {
  ArrowLeft,
  Check,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  "#f5f5f4",
  "#fef3c7",
  "#dcfce7",
  "#fce7f3",
  "#ede9fe",
  "#fee2e2",
];
const DEFAULT_COLOR = "#f5f5f4";

function sortNotes(list: Note[]): Note[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function NotesApp({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const notesRef = useLatestRef(notes);
  const draftRef = useLatestRef({ title, content, color });
  const selectedIdRef = useLatestRef(selectedId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatUpdatedAt = useCallback(
    (iso: string) =>
      new Date(iso).toLocaleDateString(
        locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
        { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
      ),
    [locale],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiGet<{ notes: Note[] }>("/api/notes");
      if (cancelled) return;
      if (result.ok) setNotes(result.data.notes ?? []);
      else toast.error(t("notes.error.load"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  const dirty = selected
    ? selected.title !== title ||
      selected.content !== content ||
      selected.color !== color
    : false;

  const saveNote = useCallback(
    async (
      id: string,
      nextTitle: string,
      nextContent: string,
      nextColor: string,
    ) => {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title: nextTitle,
          content: nextContent,
          color: nextColor,
        }),
      });
      if (!res.ok) throw new Error();
      return (await res.json()) as { note: Note };
    },
    [],
  );

  const flushSave = useCallback(async () => {
    const id = selectedIdRef.current;
    if (!id) return;
    const {
      title: nextTitle,
      content: nextContent,
      color: nextColor,
    } = draftRef.current;
    const note = notesRef.current.find((n) => n.id === id);
    if (
      note &&
      note.title === nextTitle &&
      note.content === nextContent &&
      note.color === nextColor
    ) {
      return;
    }
    setSaving(true);
    try {
      const data = await saveNote(id, nextTitle, nextContent, nextColor);
      setNotes((prev) => prev.map((n) => (n.id === id ? data.note : n)));
      setSavedAt(Date.now());
    } catch {
      toast.error(t("notes.error.save"));
    } finally {
      setSaving(false);
    }
  }, [saveNote]);

  // Sync the editor draft whenever the selected note changes.
  useEffect(() => {
    const note = notesRef.current.find((n) => n.id === selectedId);
    if (!note) {
      setTitle("");
      setContent("");
      setColor(DEFAULT_COLOR);
      setSavedAt(null);
      return;
    }
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setSavedAt(null);
  }, [selectedId]);

  // Debounced autosave while editing.
  useEffect(() => {
    if (!selectedId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void flushSave();
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, content, color, selectedId, flushSave]);

  // Flush any unsaved draft when the window closes.
  useEffect(() => {
    return () => {
      const id = selectedIdRef.current;
      if (!id) return;
      const { title: nt, content: nc, color: ncol } = draftRef.current;
      const note = notesRef.current.find((n) => n.id === id);
      if (
        note &&
        note.title === nt &&
        note.content === nc &&
        note.color === ncol
      ) {
        return;
      }
      void saveNote(id, nt, nc, ncol).catch(() => {});
    };
  }, [saveNote]);

  const handleNew = useCallback(async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "", color: DEFAULT_COLOR }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { note: Note };
      setNotes((prev) => [data.note, ...prev]);
      setSelectedId(data.note.id);
    } catch {
      toast.error(t("notes.error.create"));
    }
  }, []);

  const handleTogglePin = useCallback(async (note: Note) => {
    const pinned = !note.pinned;
    setNotes((prev) =>
      sortNotes(prev.map((n) => (n.id === note.id ? { ...n, pinned } : n))),
    );
    try {
      const res = await fetch("/api/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: note.id, pinned }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { note: Note };
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === note.id ? data.note : n))),
      );
    } catch {
      setNotes((prev) =>
        sortNotes(
          prev.map((n) =>
            n.id === note.id ? { ...n, pinned: note.pinned } : n,
          ),
        ),
      );
      toast.error(t("notes.error.save"));
    }
  }, []);

  const handleDelete = useCallback(async () => {
    const id = deleteId;
    if (!id) return;
    setDeleteId(null);
    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedIdRef.current === id) setSelectedId(null);
    } catch {
      toast.error(t("notes.error.delete"));
    }
  }, [deleteId]);

  const handleBlurFlush = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
  }, [flushSave]);

  const handleBack = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    setSelectedId(null);
  }, [flushSave]);

  const filtered = query.trim()
    ? notes.filter((n) => {
        const q = query.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      })
    : notes;

  return (
    <div className="flex h-full bg-white/70 dark:bg-slate-950/40">
      {/* Note list pane */}
      <aside
        className={cn(
          "flex w-full flex-col border-r border-slate-200/70 dark:border-slate-800 md:w-72 md:shrink-0",
          selectedId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center gap-2 border-b border-slate-200/70 p-3 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("notes.search")}
              className="h-9 pl-8"
            />
          </div>
          <Button
            size="icon"
            onClick={handleNew}
            className="shrink-0"
            style={{
              background: "var(--accent-spot, #0ea5e9)",
              color: "white",
            }}
            title={t("notes.new")}
            aria-label={t("notes.new")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-slate-400">
                <StickyNote className="h-8 w-8 opacity-40" />
                <p className="text-sm">{t("notes.empty")}</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((note) => {
                  const active = note.id === selectedId;
                  const preview = note.content.split("\n")[0]?.trim() ?? "";
                  return (
                    <li key={note.id}>
                      <button
                        onClick={() => setSelectedId(note.id)}
                        className={cn(
                          "flex w-full flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition",
                          active
                            ? "border-slate-300/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                            : "border-transparent hover:bg-white/60 dark:hover:bg-slate-900/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/5"
                            style={{ background: note.color }}
                          />
                          <span className="flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {note.title.trim()
                              ? note.title
                              : t("notes.untitled")}
                          </span>
                          {note.pinned ? (
                            <Pin className="h-3 w-3 shrink-0 text-amber-500" />
                          ) : null}
                        </div>
                        {preview ? (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {preview}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-slate-400">
                          {formatUpdatedAt(note.updatedAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Editor pane */}
      <section
        className={cn(
          "flex flex-1 flex-col",
          selectedId ? "flex" : "hidden md:flex",
        )}
      >
        {selected ? (
          <>
            <div className="flex items-center gap-2 border-b border-slate-200/70 p-3 dark:border-slate-800">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={handleBack}
                aria-label={t("common.cancel")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-5 w-5 rounded-full ring-1 ring-black/10 transition",
                      color === c
                        ? "scale-110 ring-2 ring-slate-400 dark:ring-slate-500"
                        : "hover:scale-110",
                    )}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>

              <div className="ml-auto flex items-center gap-2">
                {dirty || saving ? (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </span>
                ) : savedAt ? (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Check className="h-3 w-3 text-emerald-500" />
                    {formatUpdatedAt(selected.updatedAt)}
                  </span>
                ) : null}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleTogglePin(selected)}
                  title={selected.pinned ? t("notes.unpin") : t("notes.pin")}
                  aria-label={
                    selected.pinned ? t("notes.unpin") : t("notes.pin")
                  }
                >
                  {selected.pinned ? (
                    <Pin className="h-4 w-4 text-amber-500" />
                  ) : (
                    <PinOff className="h-4 w-4 text-slate-400" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteId(selected.id)}
                  title={t("notes.delete")}
                  aria-label={t("notes.delete")}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                </Button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleBlurFlush}
                placeholder={t("notes.untitled")}
                className="w-full border-0 bg-transparent text-2xl font-semibold text-slate-900 outline-none placeholder:text-slate-300 dark:text-slate-50"
              />
              <div className="mt-3 min-h-0 flex-1">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={handleBlurFlush}
                  placeholder={t("notes.placeholder")}
                  className="field-sizing-none h-full min-h-0 resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-slate-700 shadow-none focus-visible:ring-0 dark:text-slate-200"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <StickyNote className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t("notes.empty")}</p>
          </div>
        )}
      </section>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notes.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-500 text-white hover:bg-rose-600"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
