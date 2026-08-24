"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useOsStore, type AppId } from "@/lib/os/store";
import { useOpenApp } from "@/lib/os/useViewport";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote,
  Bomb,
  MessageCircle,
  Settings as SettingsIcon,
  FolderClosed,
  TerminalSquare,
  Calculator as CalculatorIcon,
  Music as MusicIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Image as ImageIcon,
  Paintbrush as PaintIcon,
  CloudSun as WeatherIcon,
  Activity as MonitorIcon,
  Gamepad2 as SnakeIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  appId: AppId;
  icon: typeof StickyNote;
  gradient: string;
  labelKey: string;
}

const DOCK_ITEMS: DockItem[] = [
  {
    appId: "notes",
    icon: StickyNote,
    gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    labelKey: "dock.notes",
  },
  {
    appId: "minesweeper",
    icon: Bomb,
    gradient: "linear-gradient(135deg, #ef4444, #f87171)",
    labelKey: "dock.minesweeper",
  },
  {
    appId: "chat",
    icon: MessageCircle,
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
    labelKey: "dock.chat",
  },
  {
    appId: "files",
    icon: FolderClosed,
    gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    labelKey: "dock.files",
  },
  {
    appId: "terminal",
    icon: TerminalSquare,
    gradient: "linear-gradient(135deg, #0f172a, #334155)",
    labelKey: "dock.terminal",
  },
  {
    appId: "calculator",
    icon: CalculatorIcon,
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4)",
    labelKey: "dock.calculator",
  },
  {
    appId: "music",
    icon: MusicIcon,
    gradient: "linear-gradient(135deg, #ec4899, #f9a8d4)",
    labelKey: "dock.music",
  },
  {
    appId: "calendar",
    icon: CalendarIcon,
    gradient: "linear-gradient(135deg, #dc2626, #fca5a5)",
    labelKey: "dock.calendar",
  },
  {
    appId: "clock",
    icon: ClockIcon,
    gradient: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
    labelKey: "dock.clock",
  },
  {
    appId: "photos",
    icon: ImageIcon,
    gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    labelKey: "dock.photos",
  },
  {
    appId: "paint",
    icon: PaintIcon,
    gradient: "linear-gradient(135deg, #be185d, #f472b6)",
    labelKey: "dock.paint",
  },
  {
    appId: "weather",
    icon: WeatherIcon,
    gradient: "linear-gradient(135deg, #0284c7, #38bdf8)",
    labelKey: "dock.weather",
  },
  {
    appId: "monitor",
    icon: MonitorIcon,
    gradient: "linear-gradient(135deg, #059669, #34d399)",
    labelKey: "dock.monitor",
  },
  {
    appId: "snake",
    icon: SnakeIcon,
    gradient: "linear-gradient(135deg, #7c2d12, #f97316)",
    labelKey: "dock.snake",
  },
  {
    appId: "settings",
    icon: SettingsIcon,
    gradient: "linear-gradient(135deg, #64748b, #94a3b8)",
    labelKey: "dock.settings",
  },
];

export function Dock() {
  const { t } = useI18n();
  const openApp = useOpenApp();
  const windows = useOsStore((s) => s.windows);
  const focusWindow = useOsStore((s) => s.focusWindow);
  const minimizeWindow = useOsStore((s) => s.minimizeWindow);
  const activeId = useOsStore((s) => s.activeId);
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = (item: DockItem) => {
    const existing = windows.find((w) => w.appId === item.appId);
    if (existing) {
      if (existing.minimized) {
        focusWindow(existing.id);
      } else if (existing.id === activeId) {
        minimizeWindow(existing.id);
      } else {
        focusWindow(existing.id);
      }
    } else {
      openApp(item.appId);
    }
  };

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-[8000] -translate-x-1/2">
      <div className="pointer-events-auto flex items-end gap-1.5">
        {/* Collapse toggle */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setCollapsed((c) => !c)}
          className="mb-1 flex h-8 w-6 items-center justify-center rounded-lg border border-white/50 bg-white/55 text-slate-500 shadow-lg backdrop-blur-2xl transition hover:bg-white/70 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-400"
          title={collapsed ? "Expand dock" : "Collapse dock"}
        >
          {collapsed ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </motion.button>

        {/* Dock container */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="flex max-w-[calc(100vw-100px)] items-end gap-1.5 overflow-x-auto rounded-2xl border border-white/50 bg-white/55 px-2.5 py-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/55"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(148,163,184,0.4) transparent",
                }}
              >
                {DOCK_ITEMS.map((item, idx) => {
                  const appWindows = windows.filter(
                    (w) => w.appId === item.appId,
                  );
                  const isOpen = appWindows.length > 0;
                  const isMinimized = appWindows.some((w) => w.minimized);
                  const isActive = appWindows.some(
                    (w) => w.id === activeId && !w.minimized,
                  );
                  const Icon = item.icon;
                  const showDivider = idx === DOCK_ITEMS.length - 1;

                  return (
                    <div key={item.appId} className="flex shrink-0 items-end">
                      {showDivider && (
                        <div className="mx-1 h-10 w-px self-center bg-slate-300/50 dark:bg-slate-600/50" />
                      )}
                      <button
                        onClick={() => handleClick(item)}
                        className="group relative flex flex-col items-center"
                        title={t(item.labelKey)}
                      >
                        {/* Tooltip */}
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          whileHover={{ opacity: 1, y: 0 }}
                          className="pointer-events-none absolute -top-10 whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-100/90 dark:text-slate-900"
                        >
                          {t(item.labelKey)}
                        </motion.span>

                        {/* Icon tile */}
                        <motion.span
                          whileHover={{ scale: 1.18, y: -6 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 17,
                          }}
                          className={cn(
                            "relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md",
                            isActive &&
                              "ring-2 ring-white/60 ring-offset-1 ring-offset-transparent dark:ring-white/30",
                          )}
                          style={{ background: item.gradient }}
                        >
                          <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent" />
                          <Icon className="relative h-5 w-5" />
                        </motion.span>

                        {/* Running indicator */}
                        <span className="mt-1 flex h-1 w-1 items-center justify-center">
                          {isOpen && (
                            <motion.span
                              layoutId={"dot-" + item.appId}
                              className={cn(
                                "h-1 w-1 rounded-full",
                                isMinimized && !isActive
                                  ? "animate-pulse bg-amber-400"
                                  : "bg-slate-400 dark:bg-slate-500",
                              )}
                              style={
                                isActive
                                  ? {
                                      background: "var(--accent-spot, #0ea5e9)",
                                      width: "6px",
                                      height: "6px",
                                    }
                                  : undefined
                              }
                            />
                          )}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed indicator (shows running app count) */}
        {collapsed && windows.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg border border-white/50 bg-white/55 text-[10px] font-bold text-slate-600 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-300"
          >
            {windows.length}
          </motion.div>
        )}
      </div>
    </div>
  );
}
