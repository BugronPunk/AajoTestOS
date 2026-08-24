"use client";

import { useSyncExternalStore } from "react";

/**
 * One clock for the whole shell.
 *
 * The menu bar, the desktop widget, the notification centre, the About dialog,
 * Clock and Weather each ran their own `setInterval` and each stored the time in
 * component state, so six timers were waking React up independently. There is
 * now a single timer, and a component only renders again when the value it
 * actually displays changes.
 *
 * The server snapshot is 0 rather than a real time. Rendering a clock during
 * SSR guarantees a hydration mismatch, because the server and the browser can
 * never agree on "now". Callers treat 0 as "not resolved yet".
 */

let nowMs = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  nowMs = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    nowMs = Date.now();
    timer = setInterval(tick, 1000);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Milliseconds since the epoch, rounded down to `granularityMs`.
 *
 * Rounding is what keeps this cheap: a component asking for minute resolution
 * gets a value that only changes once a minute, so the shared one second timer
 * does not render it 59 times for nothing. Returns 0 before hydration.
 */
export function useClockMs(granularityMs = 1000): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(nowMs / granularityMs) * granularityMs,
    () => 0,
  );
}

/** Convenience wrapper returning a Date, or null before hydration. */
export function useClock(granularityMs = 1000): Date | null {
  const ms = useClockMs(granularityMs);
  return ms === 0 ? null : new Date(ms);
}
