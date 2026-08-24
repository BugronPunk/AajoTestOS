"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useClock } from "@/lib/os/useClock";
import { apiGet } from "@/lib/api/client";
import { useOsStore } from "@/lib/os/store";
import { useOpenApp } from "@/lib/os/useViewport";
import type { AppId } from "@/lib/os/store";
import {
  Wifi,
  Volume2,
  Sun,
  BatteryMedium,
  Bell,
  Search,
  Cog,
  Power,
  Lock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdownMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { PublicUser } from "@/lib/types";

interface MenuBarProps {
  user: PublicUser;
  onLogout: () => void;
  onLock: () => void;
  onAbout: () => void;
}

const DAYS = [
  "clock.sunday",
  "clock.monday",
  "clock.tuesday",
  "clock.wednesday",
  "clock.thursday",
  "clock.friday",
  "clock.saturday",
];

export function MenuBar({ user, onLogout, onLock, onAbout }: MenuBarProps) {
  const { t, locale } = useI18n();
  const openApp = useOpenApp();
  const setControlCenter = useOsStore((s) => s.setControlCenter);
  const setSpotlight = useOsStore((s) => s.setSpotlight);
  const setNotificationCenter = useOsStore((s) => s.setNotificationCenter);
  // Minute resolution: the bar shows hours and minutes, so it renders again
  // once a minute rather than three times a minute.
  const now = useClock(60_000);
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async (): Promise<number | null> => {
    const result = await apiGet<{
      conversations?: Array<{ unread?: number }>;
    }>("/api/chat/conversations");
    if (!result.ok) return null;
    return (result.data.conversations ?? []).reduce(
      (sum, c) => sum + (c.unread ?? 0),
      0,
    );
  }, []);

  useEffect(() => {
    // Fetched once on mount. The 30 second poll that used to sit here duplicated
    // what the chat socket already pushes, so it was pure background traffic.
    let cancelled = false;
    void (async () => {
      const total = await fetchUnread();
      if (!cancelled && total !== null) setUnread(total);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUnread]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    onLogout();
  };

  const time = now
    ? now.toLocaleTimeString(
        locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      )
    : "";
  const date = now
    ? `${t(DAYS[now.getDay()])} ${now.toLocaleDateString(
        locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
        { month: "short", day: "numeric" },
      )}`
    : "";

  return (
    <header className="absolute left-0 right-0 top-0 z-[9000] flex h-9 items-center justify-between px-3 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-white/35 dark:bg-black/30" />
      <div className="relative flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-800 transition hover:bg-black/5 dark:text-slate-100 dark:hover:bg-white/10">
              <span
                className="flex h-4 w-4 items-center justify-center rounded text-[10px] text-white"
                style={{ background: "var(--accent-spot, #0ea5e9)" }}
              >
                A
              </span>
              <span className="hidden sm:inline">{t("app.name")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 rounded-xl">
            <DropdownMenuItem onClick={onAbout} className="font-medium">
              {t("menu.about")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openApp("settings")}>
              <Cog className="mr-2 h-4 w-4" />
              {t("menu.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setControlCenter(true);
              }}
            >
              <Sun className="mr-2 h-4 w-4" />
              {t("control.brightness")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLock}>
              <Lock className="mr-2 h-4 w-4" />
              {t("menu.lock")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-rose-600 focus:text-rose-600"
            >
              <Power className="mr-2 h-4 w-4" />
              {t("menu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => openApp("notes")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.notes")}
        </button>
        <button
          onClick={() => openApp("minesweeper")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.minesweeper")}
        </button>
        <button
          onClick={() => openApp("chat")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.chat")}
        </button>
        <button
          onClick={() => openApp("terminal")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.terminal")}
        </button>
        <button
          onClick={() => openApp("calculator")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.calculator")}
        </button>
        <button
          onClick={() => openApp("music")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.music")}
        </button>
        <button
          onClick={() => openApp("calendar")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.calendar")}
        </button>
        <button
          onClick={() => openApp("clock")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.clock")}
        </button>
        <button
          onClick={() => openApp("photos")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.photos")}
        </button>
        <button
          onClick={() => openApp("paint")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.paint")}
        </button>
        <button
          onClick={() => openApp("weather")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.weather")}
        </button>
        <button
          onClick={() => openApp("monitor")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.monitor")}
        </button>
        <button
          onClick={() => openApp("snake")}
          className="hidden h-7 items-center rounded-lg px-2 text-[13px] font-medium text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 md:flex"
        >
          {t("dock.snake")}
        </button>
      </div>

      <div className="relative flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={() => setSpotlight(true)}
          aria-label={t("spotlight.title")}
          title={t("spotlight.title") + " (Cmd+K)"}
        >
          <Search className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setNotificationCenter(true)}
          className="relative flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
          aria-label={t("notifications.title")}
          title={t("notifications.title")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
              style={{ background: "var(--accent-spot, #0ea5e9)" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button
          className="hidden h-7 items-center gap-1 rounded-lg px-2 text-[13px] text-slate-700 transition hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10 sm:flex"
          onClick={() => setControlCenter(true)}
        >
          <Wifi className="h-4 w-4" />
          <Volume2 className="h-4 w-4" />
          <BatteryMedium className="h-4 w-4" />
        </button>
        <div className="hidden h-7 flex-col items-end justify-center px-2 text-[12px] leading-tight text-slate-700 dark:text-slate-200 sm:flex">
          <span className="font-medium">{time}</span>
        </div>
        <div className="hidden h-7 items-center rounded-lg px-2 text-[12px] text-slate-600 dark:text-slate-300 lg:flex">
          {date}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/5 transition hover:ring-black/10 dark:ring-white/10">
              <Avatar className="h-6 w-6">
                <AvatarFallback
                  className="text-[11px] font-semibold text-white"
                  style={{ background: user.avatarColor }}
                >
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs font-normal text-slate-500">
                @{user.username}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openApp("settings")}>
              <Cog className="mr-2 h-4 w-4" />
              {t("menu.settings")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                toast.info(
                  t("language." + locale) + " · " + locale.toUpperCase(),
                )
              }
            >
              <Globe className="mr-2 h-4 w-4" />
              {t("settings.language")}: {t("language." + locale)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLock}>
              <Lock className="mr-2 h-4 w-4" />
              {t("menu.lock")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-rose-600 focus:text-rose-600"
            >
              <Power className="mr-2 h-4 w-4" />
              {t("menu.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
