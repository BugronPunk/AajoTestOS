"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useOsStore, type AppId, type Viewport } from "@/lib/os/store";
import { play } from "@/lib/os/audio";

/**
 * One shared viewport reading for the whole shell.
 *
 * Components used to read `window.innerWidth` ad hoc, including from inside
 * store reducers, which meant nothing responded to a resize. A single listener
 * feeds every consumer here, so there is one resize handler for the whole app
 * rather than one per component.
 */

const SERVER_VIEWPORT: Viewport = { width: 1280, height: 800 };

let current: Viewport = SERVER_VIEWPORT;
const listeners = new Set<() => void>();
let bound = false;

function readViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

function handleResize() {
  const next = readViewport();
  // A new object every resize event would render every subscriber again even when
  // nothing actually changed, so the snapshot is only replaced on a real change.
  if (next.width === current.width && next.height === current.height) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (!bound && typeof window !== "undefined") {
    current = readViewport();
    window.addEventListener("resize", handleResize, { passive: true });
    bound = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Viewport {
  return current;
}

function getServerSnapshot(): Viewport {
  return SERVER_VIEWPORT;
}

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Reads the viewport without subscribing. For event handlers. */
export function currentViewport(): Viewport {
  return typeof window === "undefined" ? SERVER_VIEWPORT : readViewport();
}

/** Opens an app, supplying the viewport the store needs to place the window. */
export function useOpenApp(): (appId: AppId) => void {
  const openApp = useOsStore((s) => s.openApp);
  return useCallback(
    (appId: AppId) => {
      play("windowOpen");
      openApp(appId, currentViewport());
    },
    [openApp],
  );
}

/** Always creates an additional window, even if the app is already open. */
export function useOpenNewWindow(): (appId: AppId) => void {
  const openNewWindow = useOsStore((s) => s.openNewWindow);
  return useCallback(
    (appId: AppId) => {
      play("windowOpen");
      openNewWindow(appId, currentViewport());
    },
    [openNewWindow],
  );
}
