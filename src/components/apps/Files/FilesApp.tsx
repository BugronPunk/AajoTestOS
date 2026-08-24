"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { apiGet, apiSend, mediaUrl, fileToDataUrl } from "@/lib/api/client";
import { Image as ImageIcon, Film, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface StoredMedia {
  id: string;
  name: string;
  kind: "image" | "video" | "file";
  mime: string;
  size: number;
  createdAt: string;
}

const MAX_BYTES = 4 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesApp({ userId }: { userId: string }) {
  const { t, bcp47 } = useI18n();
  const [files, setFiles] = useState<StoredMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<StoredMedia | null>(null);

  const refresh = useCallback(async () => {
    const result = await apiGet<{ media: StoredMedia[] }>("/api/auth");
    if (result.ok) setFiles(result.data.media ?? []);
    else toast.error(t("files.error.load"));
    setLoading(false);
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiGet<{ media: StoredMedia[] }>("/api/auth");
      if (cancelled) return;
      if (result.ok) setFiles(result.data.media ?? []);
      else toast.error(t("files.error.load"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, t]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t("upload.error.tooLarge"));
      return;
    }

    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file);
    } catch {
      toast.error(t("files.error.upload"));
      return;
    }

    const result = await apiSend<{ media: StoredMedia }>(
      "/api/upload",
      "POST",
      { dataUrl, name: file.name },
      "files.error.upload",
    );
    if (!result.ok) {
      toast.error(t(result.error));
      return;
    }
    toast.success(t("files.saved"));
    void refresh();
  };

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {t("files.title")}
        </h2>
        <label
          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:opacity-90"
          style={{ background: "var(--accent-spot, #0ea5e9)" }}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("files.upload")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={onUpload}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60"
              />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="text-sm">{t("files.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setPreview(file)}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white text-left transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-24 items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {file.kind === "image" ? (
                    <img
                      src={mediaUrl(file.id)}
                      alt={file.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : file.kind === "video" ? (
                    <video
                      src={mediaUrl(file.id)}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      muted
                    />
                  ) : (
                    <FileText className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {file.kind === "image" ? (
                    <ImageIcon className="h-3 w-3 shrink-0 text-slate-400" />
                  ) : file.kind === "video" ? (
                    <Film className="h-3 w-3 shrink-0 text-slate-400" />
                  ) : (
                    <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                  )}
                  <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {file.name}
                  </span>
                </div>
                <div className="px-2 pb-1.5 text-[10px] text-slate-400">
                  {formatSize(file.size)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-full max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-2 dark:border-slate-700">
              <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {preview.name}
              </span>
              {/* Was a bin icon that only closed the dialog, which read as a
                  delete action that silently did nothing. */}
              <button
                onClick={() => setPreview(null)}
                aria-label={t("common.close")}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[60vh] items-center justify-center p-3">
              {preview.kind === "image" ? (
                <img
                  src={mediaUrl(preview.id)}
                  alt={preview.name}
                  className="max-h-[55vh] max-w-full object-contain"
                />
              ) : preview.kind === "video" ? (
                <video
                  src={mediaUrl(preview.id)}
                  controls
                  autoPlay
                  className="max-h-[55vh] max-w-full"
                />
              ) : (
                <FileText className="h-16 w-16 text-slate-400" />
              )}
            </div>
            <div className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700">
              {formatSize(preview.size)} ·{" "}
              {new Date(preview.createdAt).toLocaleString(bcp47)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
