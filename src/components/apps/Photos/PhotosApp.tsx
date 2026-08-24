"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Trash2,
  X,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scrollArea";
import { apiGet, apiSend, mediaUrl, fileToDataUrl } from "@/lib/api/client";
import { toast } from "sonner";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

interface PhotosAppProps {
  userId: string;
}

interface StoredMedia {
  id: string;
  name: string;
  kind: "image" | "video" | "file";
  mime: string;
  size: number;
  createdAt: string;
}

interface Photo {
  id: string;
  /** Either a media route URL or a "gradient..." placeholder sentinel. */
  src: string;
  name: string;
  createdAt: string;
}

// Generate placeholder gradient photos so the gallery feels alive on first open
const GRADIENT_PHOTOS: Photo[] = [
  {
    id: "p1",
    src: "gradientAurora",
    name: "Aurora",
    createdAt: "2024-08-01",
  },
  {
    id: "p2",
    src: "gradientSunset",
    name: "Sunset",
    createdAt: "2024-08-05",
  },
  {
    id: "p3",
    src: "gradientOcean",
    name: "Ocean",
    createdAt: "2024-08-10",
  },
  {
    id: "p4",
    src: "gradientForest",
    name: "Forest",
    createdAt: "2024-08-12",
  },
  {
    id: "p5",
    src: "gradientMountain",
    name: "Mountain",
    createdAt: "2024-08-15",
  },
  {
    id: "p6",
    src: "gradientDesert",
    name: "Desert",
    createdAt: "2024-08-18",
  },
];

const GRADIENTS: Record<string, string> = {
  gradientAurora: "linear-gradient(135deg, #0ea5e9, #8b5cf6, #ec4899)",
  gradientSunset: "linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)",
  gradientOcean: "linear-gradient(135deg, #0c4a6e, #0ea5e9, #06b6d4)",
  gradientForest: "linear-gradient(135deg, #166534, #16a34a, #84cc16)",
  gradientMountain: "linear-gradient(135deg, #475569, #94a3b8, #e2e8f0)",
  gradientDesert: "linear-gradient(135deg, #b45309, #f59e0b, #fef3c7)",
};

export function PhotosApp({ userId }: PhotosAppProps) {
  const { t, locale } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>(GRADIENT_PHOTOS);
  const [selected, setSelected] = useState<number | null>(null);
  const [userPhotos, setUserPhotos] = useState<Photo[]>([]);

  void userId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await apiGet<{ media: StoredMedia[] }>("/api/auth");
      if (cancelled || !result.ok) return;
      setUserPhotos(
        (result.data.media ?? [])
          .filter((m) => m.kind === "image")
          .map((m) => ({
            id: m.id,
            // Bytes are streamed from the media route rather than embedded in
            // the JSON payload.
            src: mediaUrl(m.id),
            name: m.name,
            createdAt: m.createdAt,
          })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const allPhotos = [...userPhotos, ...photos];

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
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
    // The real id from the server is used, so the entry survives a refresh.
    setUserPhotos((prev) => [
      {
        id: result.data.media.id,
        src: mediaUrl(result.data.media.id),
        name: result.data.media.name,
        createdAt: result.data.media.createdAt,
      },
      ...prev,
    ]);
  };

  const deletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setUserPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
  };

  const navigatePhoto = (dir: number) => {
    if (selected === null) return;
    const next = (selected + dir + allPhotos.length) % allPhotos.length;
    setSelected(next);
  };

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("photos.title")}
          </h2>
          <p className="text-[11px] text-slate-400">
            {allPhotos.length} {t("photos.all").toLowerCase()}
          </p>
        </div>
        <label
          className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow-sm"
          style={{ background: "var(--accent-spot, #0ea5e9)" }}
        >
          <Upload className="h-3.5 w-3.5" />
          {t("photos.upload")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
        </label>
      </div>

      {/* Photo grid */}
      <ScrollArea className="flex-1">
        {allPhotos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-slate-400">
            <ImageIcon className="h-12 w-12 opacity-30" />
            <p className="text-sm">{t("photos.empty")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-3 sm:grid-cols-4">
            {allPhotos.map((photo, idx) => (
              <motion.button
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelected(idx)}
                className="group relative aspect-square overflow-hidden rounded-lg shadow-sm transition hover:shadow-md"
              >
                {photo.src.startsWith("gradient") ? (
                  <div
                    className="h-full w-full"
                    style={{
                      background: GRADIENTS[photo.src] || "#94a3b8",
                    }}
                  >
                    <div className="flex h-full items-center justify-center text-white/50">
                      <ImageIcon className="h-6 w-6 opacity-40" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={photo.src}
                    alt={photo.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 transition group-hover:opacity-100">
                  <p className="truncate text-[10px] text-white">
                    {photo.name}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Full-screen viewer */}
      <AnimatePresence>
        {selected !== null && allPhotos[selected] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col bg-black/80 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {allPhotos[selected].name}
                </p>
                <p className="text-[11px] text-white/50">
                  {new Date(allPhotos[selected].createdAt).toLocaleDateString(
                    locale === "zh"
                      ? "zh-CN"
                      : locale === "fr"
                        ? "fr-FR"
                        : "en-US",
                  )}
                </p>
              </div>
              <button
                onClick={() => deletePhoto(allPhotos[selected].id)}
                className="rounded-lg p-2 text-white/70 transition hover:bg-rose-500/20 hover:text-rose-300"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center p-4">
              <button
                onClick={() => navigatePhoto(-1)}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <motion.div
                key={selected}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-h-full max-w-full"
              >
                {allPhotos[selected].src.startsWith("gradient") ? (
                  <div
                    className="h-80 w-80 rounded-xl"
                    style={{
                      background:
                        GRADIENTS[allPhotos[selected].src] || "#94a3b8",
                    }}
                  />
                ) : (
                  <img
                    src={allPhotos[selected].src}
                    alt={allPhotos[selected].name}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain"
                  />
                )}
              </motion.div>
              <button
                onClick={() => navigatePhoto(1)}
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-3 text-center text-xs text-white/40">
              {selected + 1} / {allPhotos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
