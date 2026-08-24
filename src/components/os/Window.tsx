"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Square } from "lucide-react";
import {
  useOsStore,
  type WindowInstance,
  type Rect,
  MENU_HEIGHT,
  DOCK_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT,
} from "@/lib/os/store";
import { useViewport, currentViewport } from "@/lib/os/useViewport";
import { useI18n } from "@/lib/i18n/context";
import { play } from "@/lib/os/audio";
import { cn } from "@/lib/utils";

interface WindowProps {
  win: WindowInstance;
  children: ReactNode;
  icon?: ReactNode;
}

type SnapZone = "left" | "right" | "top" | "tl" | "tr" | "bl" | "br" | null;
type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const SNAP_THRESHOLD = 24;

interface Gesture {
  mode: "drag" | "resize";
  dir: ResizeDir | null;
  startX: number;
  startY: number;
  origin: Rect;
  latest: Rect;
}

function zoneForPointer(
  x: number,
  y: number,
  viewport: { width: number; height: number },
): SnapZone {
  const nearTop = y <= MENU_HEIGHT + SNAP_THRESHOLD;
  const nearLeft = x <= SNAP_THRESHOLD;
  const nearRight = x >= viewport.width - SNAP_THRESHOLD;
  const nearBottom = y >= viewport.height - SNAP_THRESHOLD - DOCK_HEIGHT;

  if (nearTop && nearLeft) return "tl";
  if (nearTop && nearRight) return "tr";
  if (nearBottom && nearLeft) return "bl";
  if (nearBottom && nearRight) return "br";
  if (nearTop) return "top";
  if (nearLeft) return "left";
  if (nearRight) return "right";
  return null;
}

export function Window({ win, children, icon }: WindowProps) {
  const { t } = useI18n();
  const viewport = useViewport();

  const focusWindow = useOsStore((s) => s.focusWindow);
  const closeWindow = useOsStore((s) => s.closeWindow);
  const minimizeWindow = useOsStore((s) => s.minimizeWindow);
  const toggleMaximize = useOsStore((s) => s.toggleMaximize);
  const setGeometry = useOsStore((s) => s.setGeometry);
  const snapWindow = useOsStore((s) => s.snapWindow);
  const activeId = useOsStore((s) => s.activeId);

  const elementRef = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const frameRef = useRef<number | null>(null);
  const [snapZone, setSnapZone] = useState<SnapZone>(null);

  const isActive = activeId === win.id;

  /**
   * Applies the in progress geometry straight to the element.
   *
   * Dragging used to write to the Zustand store on every pointermove, which
   * rendered every window again and the entire app tree inside them, so a drag
   * could not hold 60 FPS. Movement is now a compositor transform and the store
   * is written exactly once, on release.
   */
  const paint = useCallback(() => {
    frameRef.current = null;
    const gesture = gestureRef.current;
    const el = elementRef.current;
    if (!gesture || !el) return;
    const { latest, origin } = gesture;
    el.style.transform = `translate3d(${latest.x - origin.x}px, ${latest.y - origin.y}px, 0)`;
    if (gesture.mode === "resize") {
      el.style.width = `${latest.width}px`;
      el.style.height = `${latest.height}px`;
    }
  }, []);

  const schedulePaint = useCallback(() => {
    // Coalesced to one write per frame. Pointer events can outpace the display.
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(paint);
    }
  }, [paint]);

  // Listeners are attached only while a gesture is in flight, and are torn down
  // by the gesture itself. Nothing about dragging touches React state.
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => () => detachRef.current?.(), []);

  const attachGestureListeners = useCallback(() => {
    const onMove = (e: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      const { origin } = gesture;

      if (gesture.mode === "drag") {
        gesture.latest = {
          ...origin,
          x: origin.x + dx,
          // The title bar stays reachable below the menu bar.
          y: Math.max(MENU_HEIGHT, origin.y + dy),
        };
        setSnapZone(zoneForPointer(e.clientX, e.clientY, currentViewport()));
      } else {
        const dir = gesture.dir!;
        let { x, y, width, height } = origin;

        if (dir.includes("e")) width = Math.max(MIN_WIDTH, origin.width + dx);
        if (dir.includes("s"))
          height = Math.max(MIN_HEIGHT, origin.height + dy);
        if (dir.includes("w")) {
          const clamped = Math.min(dx, origin.width - MIN_WIDTH);
          width = origin.width - clamped;
          x = origin.x + clamped;
        }
        if (dir.includes("n")) {
          const clamped = Math.min(dy, origin.height - MIN_HEIGHT);
          height = origin.height - clamped;
          y = origin.y + clamped;
        }
        gesture.latest = { x, y, width, height };
      }
      schedulePaint();
    };

    const onUp = (e: PointerEvent) => {
      detach();
      const gesture = gestureRef.current;
      gestureRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const el = elementRef.current;
      if (el) {
        // The store is about to own the geometry again, so the temporary
        // transform is cleared to avoid double counting the offset.
        el.style.transform = "";
        el.style.width = "";
        el.style.height = "";
      }
      setSnapZone(null);
      if (!gesture) return;

      if (gesture.mode === "drag") {
        const zone = zoneForPointer(e.clientX, e.clientY, currentViewport());
        if (zone) {
          snapWindow(win.id, zone, currentViewport());
          play("snap");
          return;
        }
      }
      setGeometry(win.id, gesture.latest);
    };

    function detach() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      detachRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    detachRef.current = detach;
  }, [win.id, schedulePaint, setGeometry, snapWindow]);

  const beginGesture = (
    e: React.PointerEvent,
    mode: "drag" | "resize",
    dir: ResizeDir | null,
  ) => {
    if (win.maximized && mode === "drag") return;
    if (
      mode === "drag" &&
      (e.target as HTMLElement).closest("[data-window-control]")
    ) {
      return;
    }
    if (mode === "resize") {
      e.stopPropagation();
      e.preventDefault();
    }
    const origin: Rect = {
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
    };
    gestureRef.current = {
      mode,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origin,
      latest: origin,
    };
    focusWindow(win.id);
    setSnapZone(null);
    attachGestureListeners();
  };

  if (win.minimized) return null;

  const half = {
    width: Math.floor((viewport.width - 32) / 2),
    height: Math.floor((viewport.height - MENU_HEIGHT - DOCK_HEIGHT - 20) / 2),
  };

  const previewStyle = (): React.CSSProperties => {
    const left = 12;
    const right = 12 + half.width + 8;
    const top = MENU_HEIGHT;
    const bottom = MENU_HEIGHT + half.height + 8;
    const fullHeight = viewport.height - MENU_HEIGHT - DOCK_HEIGHT;

    switch (snapZone) {
      case "top":
        return {
          left,
          top,
          width: viewport.width - 24,
          height: fullHeight,
        };
      case "left":
        return { left, top, width: half.width, height: fullHeight };
      case "right":
        return { left: right, top, width: half.width, height: fullHeight };
      case "tl":
        return { left, top, width: half.width, height: half.height };
      case "tr":
        return { left: right, top, width: half.width, height: half.height };
      case "bl":
        return { left, top: bottom, width: half.width, height: half.height };
      case "br":
        return {
          left: right,
          top: bottom,
          width: half.width,
          height: half.height,
        };
      default:
        return {};
    }
  };

  return (
    <>
      <AnimatePresence>
        {snapZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute z-[5000] rounded-xl border-2 border-white/60 bg-white/30 backdrop-blur-md dark:border-white/30 dark:bg-white/10"
            style={previewStyle()}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={elementRef}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 8 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 26,
          opacity: { duration: 0.12 },
        }}
        className={cn(
          "os-window absolute flex flex-col overflow-hidden rounded-xl border shadow-2xl transition-shadow",
          isActive
            ? "border-black/10 bg-white/90 shadow-slate-400/40 dark:border-white/15 dark:bg-slate-900/90 dark:shadow-black/50"
            : "border-black/5 bg-white/80 dark:border-white/10 dark:bg-slate-900/80",
        )}
        style={{
          left: win.x,
          top: win.y,
          width: win.width,
          height: win.height,
          zIndex: win.z,
          backdropFilter: "blur(20px)",
        }}
        onPointerDown={() => !isActive && focusWindow(win.id)}
      >
        <div
          className="flex h-9 shrink-0 cursor-grab items-center justify-between border-b border-slate-200/70 bg-white/60 px-3 active:cursor-grabbing dark:border-slate-700/70 dark:bg-slate-800/60"
          onPointerDown={(e) => beginGesture(e, "drag", null)}
          onDoubleClick={() => {
            play("snap");
            toggleMaximize(win.id, currentViewport());
          }}
        >
          <div className="flex items-center gap-2">
            <div className="group flex items-center gap-2">
              <button
                data-window-control
                onClick={() => {
                  play("windowClose");
                  closeWindow(win.id);
                }}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-400 transition hover:bg-rose-500"
                title={t("window.close")}
              >
                <X className="h-2.5 w-2.5 text-rose-700 opacity-0 transition group-hover:opacity-100" />
              </button>
              <button
                data-window-control
                onClick={() => minimizeWindow(win.id)}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 transition hover:bg-amber-500"
                title={t("window.minimize")}
              >
                <Minus className="h-2.5 w-2.5 text-amber-800 opacity-0 transition group-hover:opacity-100" />
              </button>
              <button
                data-window-control
                onClick={() => {
                  play("snap");
                  toggleMaximize(win.id, currentViewport());
                }}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 transition hover:bg-emerald-500"
                title={t("window.maximize")}
              >
                <Square className="h-2 w-2 text-emerald-800 opacity-0 transition group-hover:opacity-100" />
              </button>
            </div>
            <div className="ml-2 flex items-center gap-1.5">
              {icon && <span className="text-slate-400">{icon}</span>}
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                {t(win.titleKey)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden bg-white/40 dark:bg-slate-950/30">
          {children}
        </div>

        {!win.maximized && (
          <>
            <div
              className="absolute left-0 right-0 top-0 h-1 cursor-n-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "n")}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "s")}
            />
            <div
              className="absolute bottom-0 left-0 top-0 w-1 cursor-w-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "w")}
            />
            <div
              className="absolute bottom-0 right-0 top-0 w-1 cursor-e-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "e")}
            />
            <div
              className="absolute left-0 top-0 h-3 w-3 cursor-nw-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "nw")}
            />
            <div
              className="absolute right-0 top-0 h-3 w-3 cursor-ne-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "ne")}
            />
            <div
              className="absolute bottom-0 left-0 h-3 w-3 cursor-sw-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "sw")}
            />
            <div
              className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
              onPointerDown={(e) => beginGesture(e, "resize", "se")}
            />
          </>
        )}
      </motion.div>
    </>
  );
}
