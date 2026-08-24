"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { useOsStore } from "@/lib/os/store";
import { useOpenApp } from "@/lib/os/useViewport";
import {
  StickyNote,
  Bomb,
  MessageCircle,
  Settings as SettingsIcon,
  Search,
  Sun,
  Moon,
  Bell,
  FolderClosed,
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
import type { Locale } from "@/lib/i18n/dictionaries";

interface DesktopContextMenuProps {
  onToggleTheme: () => void;
  isDark: boolean;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  dividerAfter?: boolean;
}

export function DesktopContextMenu({
  onToggleTheme,
  isDark,
}: DesktopContextMenuProps) {
  const { t } = useI18n();
  const openApp = useOpenApp();
  const setSpotlight = useOsStore((s) => s.setSpotlight);
  const setNotificationCenter = useOsStore((s) => s.setNotificationCenter);
  const setControlCenter = useOsStore((s) => s.setControlCenter);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't show the desktop context menu when right clicking inside
      // any window, dialog, header, nav, or interactive control. This lets
      // apps like Minesweeper use right click for their own purposes.
      if (
        target.closest(".os-window") ||
        target.closest("header") ||
        target.closest("nav") ||
        target.closest("[role=dialog]") ||
        target.closest("[role=tablist]") ||
        target.closest("[role=menu]") ||
        target.closest("canvas") ||
        target.closest("button")
      ) {
        return;
      }
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 240);
      const y = Math.min(e.clientY, window.innerHeight - 360);
      setMenu({ x, y });
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  const items: MenuItem[] = [
    {
      label: t("dock.notes"),
      icon: <StickyNote className="h-4 w-4" />,
      action: () => openApp("notes"),
    },
    {
      label: t("dock.minesweeper"),
      icon: <Bomb className="h-4 w-4" />,
      action: () => openApp("minesweeper"),
    },
    {
      label: t("dock.chat"),
      icon: <MessageCircle className="h-4 w-4" />,
      action: () => openApp("chat"),
    },
    {
      label: t("dock.files"),
      icon: <FolderClosed className="h-4 w-4" />,
      action: () => openApp("files"),
    },
    {
      label: t("dock.terminal"),
      icon: <TerminalSquare className="h-4 w-4" />,
      action: () => openApp("terminal"),
    },
    {
      label: t("dock.calculator"),
      icon: <Calculator className="h-4 w-4" />,
      action: () => openApp("calculator"),
    },
    {
      label: t("dock.music"),
      icon: <Music className="h-4 w-4" />,
      action: () => openApp("music"),
    },
    {
      label: t("dock.calendar"),
      icon: <Calendar className="h-4 w-4" />,
      action: () => openApp("calendar"),
    },
    {
      label: t("dock.clock"),
      icon: <Clock className="h-4 w-4" />,
      action: () => openApp("clock"),
    },
    {
      label: t("dock.photos"),
      icon: <ImageIcon className="h-4 w-4" />,
      action: () => openApp("photos"),
    },
    {
      label: t("dock.paint"),
      icon: <Paintbrush className="h-4 w-4" />,
      action: () => openApp("paint"),
    },
    {
      label: t("dock.weather"),
      icon: <CloudSun className="h-4 w-4" />,
      action: () => openApp("weather"),
    },
    {
      label: t("dock.monitor"),
      icon: <Activity className="h-4 w-4" />,
      action: () => openApp("monitor"),
    },
    {
      label: t("dock.snake"),
      icon: <Gamepad2 className="h-4 w-4" />,
      action: () => openApp("snake"),
      dividerAfter: true,
    },
    {
      label: t("spotlight.title"),
      icon: <Search className="h-4 w-4" />,
      action: () => setSpotlight(true),
    },
    {
      label: t("notifications.title"),
      icon: <Bell className="h-4 w-4" />,
      action: () => setNotificationCenter(true),
      dividerAfter: true,
    },
    {
      label: isDark ? t("settings.light") : t("settings.dark"),
      icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      action: onToggleTheme,
    },
    {
      label: t("menu.settings"),
      icon: <SettingsIcon className="h-4 w-4" />,
      action: () => openApp("settings"),
    },
  ];

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="fixed z-[9999] w-52 overflow-hidden rounded-xl border border-white/50 bg-white/80 py-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
          style={{ left: menu.x, top: menu.y }}
        >
          {items.map((item, idx) => (
            <div key={idx}>
              <button
                onClick={() => {
                  item.action();
                  setMenu(null);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <span className="text-slate-400">{item.icon}</span>
                {item.label}
              </button>
              {item.dividerAfter && (
                <div className="my-1 h-px bg-slate-200/70 dark:bg-slate-700/70" />
              )}
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
