"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Search,
  StickyNote,
  Bomb,
  MessageCircle,
  FolderClosed,
  Settings as SettingsIcon,
  Lock,
  Sun,
  Moon,
  LogOut,
  CornerDownLeft,
  TerminalSquare,
  Calculator,
  Music,
  Calendar,
  Clock,
  Image as ImageIcon,
  Paintbrush,
  CloudSun,
  Activity,
  Gamepad2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useOsStore, type AppId } from "@/lib/os/store";
import { useOpenApp } from "@/lib/os/useViewport";
import { toast } from "sonner";

type ItemKind = "app" | "action";

interface SpotlightItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  kind: ItemKind;
  run: () => void;
}

interface SpotlightProps {
  onLock?: () => void;
  onLogout?: () => void;
}

const APP_DEFS: Array<{
  appId: AppId;
  labelKey: string;
  icon: React.ReactNode;
}> = [
  {
    appId: "notes",
    labelKey: "dock.notes",
    icon: <StickyNote className="h-4 w-4" />,
  },
  {
    appId: "minesweeper",
    labelKey: "dock.minesweeper",
    icon: <Bomb className="h-4 w-4" />,
  },
  {
    appId: "chat",
    labelKey: "dock.chat",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    appId: "files",
    labelKey: "dock.files",
    icon: <FolderClosed className="h-4 w-4" />,
  },
  {
    appId: "terminal",
    labelKey: "dock.terminal",
    icon: <TerminalSquare className="h-4 w-4" />,
  },
  {
    appId: "calculator",
    labelKey: "dock.calculator",
    icon: <Calculator className="h-4 w-4" />,
  },
  {
    appId: "music",
    labelKey: "dock.music",
    icon: <Music className="h-4 w-4" />,
  },
  {
    appId: "calendar",
    labelKey: "dock.calendar",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    appId: "clock",
    labelKey: "dock.clock",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    appId: "photos",
    labelKey: "dock.photos",
    icon: <ImageIcon className="h-4 w-4" />,
  },
  {
    appId: "paint",
    labelKey: "dock.paint",
    icon: <Paintbrush className="h-4 w-4" />,
  },
  {
    appId: "weather",
    labelKey: "dock.weather",
    icon: <CloudSun className="h-4 w-4" />,
  },
  {
    appId: "monitor",
    labelKey: "dock.monitor",
    icon: <Activity className="h-4 w-4" />,
  },
  {
    appId: "snake",
    labelKey: "dock.snake",
    icon: <Gamepad2 className="h-4 w-4" />,
  },
  {
    appId: "settings",
    labelKey: "dock.settings",
    icon: <SettingsIcon className="h-4 w-4" />,
  },
];

/**
 * Thin wrapper that owns nothing but the open flag.
 *
 * The query and the highlighted row live in the panel below, which is mounted
 * only while Spotlight is open. Closing it unmounts the panel, so the next open
 * starts blank on its own. Previously the state sat here and had to be wiped by
 * an effect, which is a render the user could briefly see.
 */
export function Spotlight({ onLock, onLogout }: SpotlightProps) {
  const open = useOsStore((s) => s.spotlightOpen);
  return (
    <AnimatePresence>
      {open && <SpotlightPanel onLock={onLock} onLogout={onLogout} />}
    </AnimatePresence>
  );
}

function SpotlightPanel({ onLock, onLogout }: SpotlightProps) {
  const { t } = useI18n();
  const setSpotlight = useOsStore((s) => s.setSpotlight);
  const openApp = useOpenApp();
  const { setTheme, theme } = useTheme();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const appItems = useMemo<SpotlightItem[]>(
    () =>
      APP_DEFS.map((def) => ({
        id: "app-" + def.appId,
        label: t(def.labelKey),
        icon: def.icon,
        kind: "app",
        run: () => openApp(def.appId),
      })),
    [t, openApp],
  );

  const actionItems = useMemo<SpotlightItem[]>(
    () => [
      {
        id: "action-settings",
        label: t("spotlight.openSettings"),
        icon: <SettingsIcon className="h-4 w-4" />,
        kind: "action",
        run: () => openApp("settings"),
      },
      {
        id: "action-lock",
        label: t("spotlight.lockScreen"),
        icon: <Lock className="h-4 w-4" />,
        kind: "action",
        run: () => {
          onLock?.();
        },
      },
      {
        id: "action-logout",
        label: t("spotlight.logOut"),
        icon: <LogOut className="h-4 w-4" />,
        kind: "action",
        run: () => {
          onLogout?.();
        },
      },
      {
        id: "action-theme",
        label: t("spotlight.toggleTheme"),
        icon:
          theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          ),
        kind: "action",
        run: () => {
          const next = theme === "dark" ? "light" : "dark";
          setTheme(next);
          toast.success(t("settings.theme") + ": " + t("settings." + next));
        },
      },
    ],
    [t, openApp, onLock, onLogout, theme, setTheme],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [...appItems, ...actionItems];
    if (!q) return all;
    return all.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, appItems, actionItems]);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  // Derived rather than corrected by an effect: when the result list shrinks
  // below the stored index, the clamp happens in the same render instead of one
  // render later with an out of range highlight on screen.
  const selectedIndex =
    filtered.length === 0 ? 0 : Math.min(selected, filtered.length - 1);

  // Scroll selected row into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${selectedIndex}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const close = () => setSpotlight(false);

  const runItem = (item: SpotlightItem) => {
    item.run();
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setSelected((s) => (s + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      setSelected((s) => (s - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) runItem(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className="absolute inset-0 z-[9300] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <motion.div
        className="absolute inset-0 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
        role="dialog"
        aria-label={t("spotlight.title")}
      >
        <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/5">
          <Search className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("spotlight.placeholder")}
            className="flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            aria-label={t("spotlight.placeholder")}
          />
          <kbd className="hidden shrink-0 rounded-md border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[58vh] overflow-y-auto p-2"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-slate-400">
              {t("spotlight.placeholder")}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const showHeader =
                idx === 0 || filtered[idx - 1].kind !== item.kind;
              const isSelected = idx === selectedIndex;
              return (
                <Fragment key={item.id}>
                  {showHeader && (
                    <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {item.kind === "app"
                        ? t("spotlight.apps")
                        : t("spotlight.actions")}
                    </div>
                  )}
                  <button
                    type="button"
                    data-idx={idx}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => runItem(item)}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] text-slate-700 transition dark:text-slate-200"
                    style={
                      isSelected
                        ? {
                            background:
                              "var(--accent-soft, rgba(14,165,233,0.16))",
                          }
                        : undefined
                    }
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: "var(--accent-spot, #0ea5e9)" }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {isSelected && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>
                </Fragment>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
