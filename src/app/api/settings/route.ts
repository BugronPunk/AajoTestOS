import { withAuth, ok, fail } from "@/lib/api/handlers";
import { updateUser, toPublicUser, type UserPatch } from "@/lib/models/user";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { WALLPAPER_IDS, ACCENT_IDS } from "@/lib/os/theme";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const PATCH = withAuth(async (user, request) => {
  const body = await request.json().catch(() => ({}));
  const patch: UserPatch = {};

  if (typeof body.displayName === "string") {
    const name = body.displayName.trim().slice(0, 40);
    if (name.length < 1) return fail("settings.error.displayName");
    patch.displayName = name;
  }
  if (typeof body.bio === "string") patch.bio = body.bio.slice(0, 240);

  // Each of these used to be written through unchecked, so any string at all
  // could be stored and then rendered straight back into a style attribute.
  if (typeof body.wallpaper === "string") {
    if (!WALLPAPER_IDS.includes(body.wallpaper)) {
      return fail("settings.error.wallpaper");
    }
    patch.wallpaper = body.wallpaper;
  }
  if (typeof body.accent === "string") {
    if (!ACCENT_IDS.includes(body.accent)) return fail("settings.error.accent");
    patch.accent = body.accent;
  }
  if (typeof body.theme === "string") {
    if (!["light", "dark"].includes(body.theme)) {
      return fail("settings.error.theme");
    }
    patch.theme = body.theme as "light" | "dark";
  }
  if (typeof body.language === "string") {
    if (!LOCALES.includes(body.language as Locale)) {
      return fail("settings.error.language");
    }
    patch.language = body.language as Locale;
  }
  if (typeof body.avatarColor === "string") {
    if (!HEX_COLOR.test(body.avatarColor)) {
      return fail("settings.error.avatarColor");
    }
    patch.avatarColor = body.avatarColor;
  }

  const updated = await updateUser(user.id, patch);
  if (!updated) return fail("common.error.server", 500);
  return ok({ user: toPublicUser(updated) });
});

export const dynamic = "force-dynamic";
