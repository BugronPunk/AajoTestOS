"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps a ref pointed at the most recent value of `value`.
 *
 * The assignment happens in an effect rather than during render. Writing to a
 * ref while rendering is not safe under concurrent rendering: React may render
 * a component without committing it, which would leave the ref holding a value
 * the user never saw. Every consumer of these refs reads them from timers,
 * socket handlers or event handlers, all of which run after commit, so an
 * effect is both correct and sufficient here.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
