"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { I18nProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionaries";
import type { PublicUser } from "@/lib/types";
import { accentColor, wallpaperGradient } from "@/lib/os/theme";
import { useOsStore } from "@/lib/os/store";
import {
  currentViewport,
  useOpenNewWindow,
  useViewport,
} from "@/lib/os/useViewport";
import { closeSocket } from "@/lib/os/useSocket";
import { BootScreen } from "@/components/os/BootScreen";
import { LoginScreen } from "@/components/os/LoginScreen";
import { Desktop } from "@/components/os/Desktop";
import { LockScreen } from "@/components/os/LockScreen";

interface OsShellProps {
  initialUser: PublicUser | null;
  initialLocale: Locale;
  initialTheme: "light" | "dark";
  initialWallpaper: string;
  initialAccent: string;
}

const BOOT_MS = 2400;
const BOOT_FLAG = "aajostest_booted";

/**
 * The boot animation used to run for 2.4 seconds on every single page load,
 * including a refresh mid task. It now plays once per browser tab.
 */
function hasBootedThisSession(): boolean {
  try {
    return sessionStorage.getItem(BOOT_FLAG) === "1";
  } catch {
    return false;
  }
}

export function OsShell({
  initialUser,
  initialLocale,
  initialTheme,
  initialWallpaper,
  initialAccent,
}: OsShellProps) {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(initialUser);
  const [locked, setLocked] = useState(false);
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [wallpaper, setWallpaper] = useState(initialWallpaper);
  const [accent, setAccent] = useState(initialAccent);
  const { setTheme, theme } = useTheme();
  const viewport = useViewport();
  const openNewWindow = useOpenNewWindow();

  useEffect(() => {
    // Zero delay when this tab has already booted. Reading sessionStorage during
    // render would disagree with the server render and break hydration, so the
    // decision is made on a timer instead.
    const delay = hasBootedThisSession() ? 0 : BOOT_MS;
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(BOOT_FLAG, "1");
      } catch {
        /* private mode: the animation simply plays again next time */
      }
      setBooted(true);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  // Depends on the theme value, not the user object. Depending on the object
  // meant every unrelated profile edit fired this again and fought the toggle.
  const userTheme = user?.theme ?? initialTheme;
  useEffect(() => {
    setTheme(userTheme);
  }, [userTheme, setTheme]);

  // Keeps windows reachable when the viewport shrinks.
  useEffect(() => {
    useOsStore.getState().clampToViewport(viewport);
  }, [viewport]);

  const handleAuthSuccess = useCallback(
    (incoming: PublicUser, incomingLocale: Locale) => {
      // A previous account's desktop must not survive into this session.
      useOsStore.getState().reset();
      setUser(incoming);
      setLocale(incomingLocale);
      setWallpaper(incoming.wallpaper);
      setAccent(incoming.accent);
    },
    [],
  );

  const handleLogout = useCallback(() => {
    // Windows and the live socket both used to outlive the session, so the next
    // person to sign in inherited open windows and a connection still bound to
    // the previous account.
    useOsStore.getState().reset();
    closeSocket();
    setUser(null);
    setLocked(false);
    setLocale("en");
    setWallpaper("aurora");
    setAccent("sky");
  }, []);

  const handleLock = useCallback(() => setLocked(true), []);
  const handleUnlock = useCallback(() => setLocked(false), []);

  const handleUpdateUser = useCallback((patch: Partial<PublicUser>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    if (patch.language) setLocale(patch.language);
    if (patch.wallpaper) setWallpaper(patch.wallpaper);
    if (patch.accent) setAccent(patch.accent);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    if (!user) {
      setTheme(next);
      return;
    }
    // The effect above applies the theme once state lands, so this only records
    // the preference rather than setting the theme a second time.
    setUser((prev) => (prev ? { ...prev, theme: next } : prev));
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }, [theme, setTheme, user]);

  const accentCss = useMemo(() => accentColor(accent), [accent]);
  const wallpaperCss = useMemo(() => wallpaperGradient(wallpaper), [wallpaper]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--accent-spot",
      accentCss.color,
    );
    document.documentElement.style.setProperty("--accent-soft", accentCss.soft);
  }, [accentCss]);

  // Cmd+K Spotlight, Cmd+N new window, Cmd+W close, Cmd+M minimize,
  // Cmd+Enter maximize, Cmd+Tab cycle windows.
  useEffect(() => {
    if (!user || locked) return;
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const state = useOsStore.getState();
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        state.setSpotlight(!state.spotlightOpen);
      } else if (key === "n") {
        // A second window of the focused app, the way a desktop OS does it.
        e.preventDefault();
        const active = state.windows.find((w) => w.id === state.activeId);
        if (active) openNewWindow(active.appId);
      } else if (key === "w") {
        e.preventDefault();
        if (state.activeId) state.closeWindow(state.activeId);
      } else if (key === "m") {
        e.preventDefault();
        if (state.activeId) state.minimizeWindow(state.activeId);
      } else if (key === "enter") {
        e.preventDefault();
        if (state.activeId) {
          state.toggleMaximize(state.activeId, currentViewport());
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        const open = state.windows.filter((w) => !w.minimized);
        if (open.length < 2) return;
        const currentIdx = open.findIndex((w) => w.id === state.activeId);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + open.length) % open.length
          : (currentIdx + 1) % open.length;
        state.focusWindow(open[nextIdx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [user, locked, openNewWindow]);

  const isDark = theme === "dark";

  return (
    <I18nProvider locale={locale}>
      <div
        className="relative h-screen w-screen overflow-hidden"
        style={{ background: wallpaperCss }}
      >
        {!booted ? (
          <BootScreen />
        ) : !user ? (
          <LoginScreen
            onAuthSuccess={handleAuthSuccess}
            locale={locale}
            isDark={isDark}
          />
        ) : locked ? (
          <LockScreen user={user} onUnlock={handleUnlock} />
        ) : (
          <Desktop
            user={user}
            isDark={isDark}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
            onLock={handleLock}
            onUpdateUser={handleUpdateUser}
          />
        )}
      </div>
    </I18nProvider>
  );
}
