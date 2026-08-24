import { cookies } from "next/headers";
import { getSession } from "@/lib/models/session";
import { findUserById, toPublicUser } from "@/lib/models/user";
import { OsShell } from "@/components/os/OsShell";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/dictionaries";
import type { PublicUser } from "@/lib/types";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aajostest_session")?.value;
  let initialUser: PublicUser | null = null;
  let initialLocale: Locale = DEFAULT_LOCALE;
  let initialTheme: "light" | "dark" = "light";
  let initialWallpaper = "aurora";
  let initialAccent = "sky";

  if (token) {
    const session = await getSession(token);
    if (session) {
      const user = await findUserById(session.userId);
      if (user) {
        initialUser = toPublicUser(user);
        initialLocale = user.language;
        initialTheme = user.theme;
        initialWallpaper = user.wallpaper;
        initialAccent = user.accent;
      }
    }
  }

  return (
    <OsShell
      initialUser={initialUser}
      initialLocale={initialLocale}
      initialTheme={initialTheme}
      initialWallpaper={initialWallpaper}
      initialAccent={initialAccent}
    />
  );
}
