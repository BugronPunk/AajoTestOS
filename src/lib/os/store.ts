"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type AppId =
  | "notes"
  | "minesweeper"
  | "chat"
  | "settings"
  | "files"
  | "terminal"
  | "calculator"
  | "music"
  | "calendar"
  | "clock"
  | "photos"
  | "paint"
  | "weather"
  | "monitor"
  | "snake";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface WindowInstance extends Rect {
  id: string;
  appId: AppId;
  titleKey: string;
  z: number;
  minimized: boolean;
  maximized: boolean;
  /** Geometry to return to when a maximize or snap is undone. */
  restore: Rect | null;
}

export const MENU_HEIGHT = 36;
export const DOCK_HEIGHT = 80;
export const MIN_WIDTH = 320;
export const MIN_HEIGHT = 240;

interface OsState {
  windows: WindowInstance[];
  activeId: string | null;
  zCounter: number;
  controlCenterOpen: boolean;
  spotlightOpen: boolean;
  notificationCenterOpen: boolean;

  openApp: (appId: AppId, viewport: Viewport) => void;
  openNewWindow: (appId: AppId, viewport: Viewport) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string, viewport: Viewport) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  setGeometry: (id: string, rect: Rect) => void;
  snapWindow: (
    id: string,
    zone: "left" | "right" | "top" | "tl" | "tr" | "bl" | "br",
    viewport: Viewport,
  ) => void;
  clampToViewport: (viewport: Viewport) => void;
  setControlCenter: (open: boolean) => void;
  setSpotlight: (open: boolean) => void;
  setNotificationCenter: (open: boolean) => void;
  reset: () => void;
}

const APP_DEFAULTS: Record<
  AppId,
  { titleKey: string; width: number; height: number }
> = {
  notes: { titleKey: "dock.notes", width: 760, height: 540 },
  minesweeper: { titleKey: "dock.minesweeper", width: 720, height: 640 },
  chat: { titleKey: "dock.chat", width: 880, height: 600 },
  settings: { titleKey: "dock.settings", width: 680, height: 560 },
  files: { titleKey: "dock.files", width: 720, height: 520 },
  terminal: { titleKey: "dock.terminal", width: 680, height: 440 },
  calculator: { titleKey: "dock.calculator", width: 340, height: 520 },
  music: { titleKey: "dock.music", width: 420, height: 560 },
  calendar: { titleKey: "dock.calendar", width: 720, height: 540 },
  clock: { titleKey: "dock.clock", width: 480, height: 520 },
  photos: { titleKey: "dock.photos", width: 780, height: 560 },
  paint: { titleKey: "dock.paint", width: 720, height: 560 },
  weather: { titleKey: "dock.weather", width: 460, height: 580 },
  monitor: { titleKey: "dock.monitor", width: 640, height: 520 },
  snake: { titleKey: "dock.snake", width: 500, height: 580 },
};

let windowSequence = 0;
function nextWindowId(): string {
  windowSequence += 1;
  return `win_${Date.now().toString(36)}_${windowSequence}`;
}

/** Usable desktop area, excluding the menu bar and the dock. */
function workArea(viewport: Viewport) {
  return {
    x: 12,
    y: MENU_HEIGHT,
    width: Math.max(MIN_WIDTH, viewport.width - 24),
    height: Math.max(MIN_HEIGHT, viewport.height - MENU_HEIGHT - DOCK_HEIGHT),
  };
}

function rectOf(win: WindowInstance): Rect {
  return { x: win.x, y: win.y, width: win.width, height: win.height };
}

const INITIAL = {
  windows: [] as WindowInstance[],
  activeId: null as string | null,
  zCounter: 10,
  controlCenterOpen: false,
  spotlightOpen: false,
  notificationCenterOpen: false,
};

function createWindow(
  appId: AppId,
  viewport: Viewport,
  offsetIndex: number,
  z: number,
): WindowInstance {
  const defaults = APP_DEFAULTS[appId];
  const area = workArea(viewport);
  const width = Math.min(defaults.width, area.width);
  const height = Math.min(defaults.height, area.height);
  // Cascade so a second window of the same app is visibly its own window.
  const offset = (offsetIndex % 6) * 28;
  return {
    id: nextWindowId(),
    appId,
    titleKey: defaults.titleKey,
    width,
    height,
    x: Math.max(area.x, Math.floor((viewport.width - width) / 2) + offset),
    y: Math.max(area.y, Math.floor((viewport.height - height) / 3) + offset),
    z,
    minimized: false,
    maximized: false,
    restore: null,
  };
}

export const useOsStore = create<OsState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      openApp: (appId, viewport) => {
        const existing = get().windows.find((w) => w.appId === appId);
        if (existing) {
          get().focusWindow(existing.id);
          return;
        }
        get().openNewWindow(appId, viewport);
      },

      // Windows used to be capped at one per app, so two Notes side by side was
      // impossible. Any number can now be opened.
      openNewWindow: (appId, viewport) =>
        set((s) => {
          const z = s.zCounter + 1;
          const win = createWindow(appId, viewport, s.windows.length, z);
          return {
            windows: [...s.windows, win],
            zCounter: z,
            activeId: win.id,
          };
        }),

      closeWindow: (id) =>
        set((s) => {
          const windows = s.windows.filter((w) => w.id !== id);
          // Focus falls to the topmost remaining window rather than nothing.
          const next = [...windows]
            .filter((w) => !w.minimized)
            .sort((a, b) => b.z - a.z)[0];
          return {
            windows,
            activeId: s.activeId === id ? (next?.id ?? null) : s.activeId,
          };
        }),

      focusWindow: (id) =>
        set((s) => {
          const z = s.zCounter + 1;
          return {
            zCounter: z,
            activeId: id,
            windows: s.windows.map((w) =>
              w.id === id ? { ...w, z, minimized: false } : w,
            ),
          };
        }),

      minimizeWindow: (id) =>
        set((s) => {
          const windows = s.windows.map((w) =>
            w.id === id ? { ...w, minimized: true } : w,
          );
          const next = windows
            .filter((w) => !w.minimized)
            .sort((a, b) => b.z - a.z)[0];
          return {
            windows,
            activeId: s.activeId === id ? (next?.id ?? null) : s.activeId,
          };
        }),

      // Viewport is passed in rather than read from `window` inside the
      // reducer, so the store stays pure and testable.
      toggleMaximize: (id, viewport) =>
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            if (w.maximized && w.restore) {
              return { ...w, ...w.restore, maximized: false, restore: null };
            }
            const area = workArea(viewport);
            return {
              ...w,
              maximized: true,
              restore: w.restore ?? rectOf(w),
              ...area,
            };
          }),
        })),

      moveWindow: (id, x, y) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
        })),

      setGeometry: (id, rect) =>
        set((s) => ({
          windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)),
        })),

      snapWindow: (id, zone, viewport) =>
        set((s) => ({
          windows: s.windows.map((w) => {
            if (w.id !== id) return w;
            const area = workArea(viewport);
            const halfW = Math.floor((area.width - 8) / 2);
            const halfH = Math.floor((area.height - 8) / 2);

            let rect: Rect;
            if (zone === "top") {
              rect = area;
            } else if (zone === "left" || zone === "right") {
              rect = {
                x: zone === "left" ? area.x : area.x + halfW + 8,
                y: area.y,
                width: halfW,
                height: area.height,
              };
            } else {
              const left = zone === "tl" || zone === "bl";
              const top = zone === "tl" || zone === "tr";
              rect = {
                x: left ? area.x : area.x + halfW + 8,
                y: top ? area.y : area.y + halfH + 8,
                width: halfW,
                height: halfH,
              };
            }
            return {
              ...w,
              ...rect,
              maximized: zone === "top",
              // Only captured on the first snap. Overwriting it every time made
              // the original size unrecoverable after two snaps in a row.
              restore: w.restore ?? rectOf(w),
            };
          }),
        })),

      /** Pulls windows back on screen after the viewport shrinks. */
      clampToViewport: (viewport) =>
        set((s) => {
          const area = workArea(viewport);
          return {
            windows: s.windows.map((w) => {
              const width = Math.min(w.width, area.width);
              const height = Math.min(w.height, area.height);
              return {
                ...w,
                width,
                height,
                x: Math.min(Math.max(w.x, -width + 120), viewport.width - 120),
                y: Math.min(
                  Math.max(w.y, area.y),
                  viewport.height - DOCK_HEIGHT,
                ),
              };
            }),
          };
        }),

      setControlCenter: (open) => set({ controlCenterOpen: open }),
      setSpotlight: (open) => set({ spotlightOpen: open }),
      setNotificationCenter: (open) => set({ notificationCenterOpen: open }),

      /**
       * Clears the desktop. Signing out used to leave every window in place, so
       * the next account to sign in on the same browser inherited them.
       */
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "aajostest_desktop",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Only the desktop layout is restored. Transient overlays such as
      // Spotlight must never come back open after a refresh.
      partialize: (s) => ({
        windows: s.windows,
        activeId: s.activeId,
        zCounter: s.zCounter,
      }),
    },
  ),
);
