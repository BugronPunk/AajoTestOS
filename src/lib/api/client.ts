"use client";

/**
 * Thin fetch wrapper shared by every app window.
 *
 * The API answers failures with a translation key, never a sentence, so the
 * caller renders `t(result.error)` and the message comes out in whichever of
 * the three locales the reader is using.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(
  input: string,
  init?: RequestInit,
  fallbackError = "common.error.server",
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, { cache: "no-store", ...init });
  } catch {
    return { ok: false, error: "common.error.network" };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const errorCode =
    body && typeof body === "object" && "error" in body
      ? String((body as { error: unknown }).error)
      : null;

  if (!res.ok || errorCode) {
    return { ok: false, error: errorCode ?? fallbackError };
  }
  return { ok: true, data: body as T };
}

export function apiGet<T>(url: string, fallback?: string) {
  return request<T>(url, undefined, fallback);
}

export function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
  fallback?: string,
) {
  return request<T>(
    url,
    {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
    fallback,
  );
}

/** Stored media is served by id, never inlined as base64. */
export function mediaUrl(mediaId: string): string {
  return `/api/media/${encodeURIComponent(mediaId)}`;
}

/** Reads a File into a data URL for upload. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
