import {
  read,
  transaction,
  nextId,
  writeMedia,
  readMedia,
  ALLOWED_MEDIA_MIMES,
  type MediaRecord,
} from "@/lib/store/engine";

export type { MediaRecord };

export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

const DATA_URL = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i;

export interface DecodedUpload {
  mime: string;
  bytes: Buffer;
}

/**
 * Validates a data URL and returns real decoded bytes.
 *
 * The old upload route estimated size from string length and never checked the
 * media type, so any string beginning with "data:" was accepted and stored.
 */
export function decodeDataUrl(dataUrl: string): {
  upload?: DecodedUpload;
  error?: string;
} {
  const match = DATA_URL.exec(dataUrl);
  if (!match) return { error: "upload.error.invalid" };

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MEDIA_MIMES.includes(mime)) {
    return { error: "upload.error.type" };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2], "base64");
  } catch {
    return { error: "upload.error.invalid" };
  }
  if (bytes.length === 0) return { error: "upload.error.invalid" };
  // Measured after decoding, so the limit reflects real disk cost.
  if (bytes.length > MAX_MEDIA_BYTES) return { error: "upload.error.tooLarge" };

  return { upload: { mime, bytes } };
}

export function kindForMime(mime: string): MediaRecord["kind"] {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export async function saveMedia(
  userId: string,
  name: string,
  dataUrl: string,
): Promise<{ media?: MediaRecord; error?: string }> {
  const { upload, error } = decodeDataUrl(dataUrl);
  if (!upload) return { error };

  const record: MediaRecord = {
    id: nextId("med"),
    userId,
    name: name.slice(0, 120) || "file",
    kind: kindForMime(upload.mime),
    mime: upload.mime,
    size: upload.bytes.length,
    createdAt: new Date().toISOString(),
  };

  // Bytes land on disk before the row is recorded, so a row never points at a
  // file that does not exist.
  await writeMedia(userId, record.id, upload.mime, upload.bytes);
  await transaction(["media"], ({ media }) => {
    media.push(record);
  });
  return { media: record };
}

export async function findMedia(mediaId: string): Promise<MediaRecord | null> {
  const media = await read("media");
  return media.find((m) => m.id === mediaId) ?? null;
}

export async function listMediaForUser(userId: string): Promise<MediaRecord[]> {
  const media = await read("media");
  return media
    .filter((m) => m.userId === userId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function loadMediaBytes(
  record: MediaRecord,
): Promise<Buffer | null> {
  return readMedia(record.userId, record.id, record.mime);
}
