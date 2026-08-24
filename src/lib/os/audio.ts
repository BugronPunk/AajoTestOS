"use client";

import { useSyncExternalStore } from "react";

/**
 * UI sound and haptics.
 *
 * Six cues, all synthesised with WebAudio rather than shipped as samples, so the
 * whole layer costs nothing in the bundle budget and nothing in network
 * requests. They are deliberately short and quiet: this is an OS that is meant
 * to feel calm, so sound confirms an action and then gets out of the way.
 *
 * Muted by default. A page that makes noise nobody asked for is a page people
 * close, and the browser will not let audio start before a gesture anyway.
 */

export type SoundName =
  | "windowOpen"
  | "windowClose"
  | "snap"
  | "notification"
  | "messageSent"
  | "error";

interface Voice {
  /** Frequency ramp in hertz, from the first value to the last. */
  sweep: [number, number];
  durationMs: number;
  type: OscillatorType;
  gain: number;
}

const VOICES: Record<SoundName, Voice> = {
  // Rising, soft: something arrived.
  windowOpen: { sweep: [420, 660], durationMs: 110, type: "sine", gain: 0.05 },
  // The same shape inverted: something left.
  windowClose: { sweep: [560, 340], durationMs: 90, type: "sine", gain: 0.04 },
  // The one cue that genuinely helps, because it confirms a spatial commit the
  // eye is still catching up with.
  snap: { sweep: [700, 700], durationMs: 45, type: "triangle", gain: 0.05 },
  notification: {
    sweep: [740, 880],
    durationMs: 140,
    type: "sine",
    gain: 0.045,
  },
  messageSent: { sweep: [620, 780], durationMs: 70, type: "sine", gain: 0.035 },
  error: { sweep: [260, 190], durationMs: 180, type: "triangle", gain: 0.05 },
};

const HAPTICS: Partial<Record<SoundName, number>> = {
  snap: 8,
  error: 20,
};

const STORAGE_KEY = "aajostest_sound";

let enabled = false;
let hydrated = false;
const listeners = new Set<() => void>();
let context: AudioContext | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  // Browsers suspend the context until a user gesture; every call site here is
  // downstream of one.
  if (context.state === "suspended") void context.resume();
  return context;
}

export function isSoundEnabled(): boolean {
  hydrate();
  return enabled;
}

export function setSoundEnabled(next: boolean) {
  hydrate();
  enabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    /* private mode: the preference simply does not persist */
  }
  notify();
  if (next) play("snap");
}

export function play(name: SoundName) {
  hydrate();
  if (!enabled) return;

  const buzz = HAPTICS[name];
  if (buzz && typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(buzz);
  }

  const ctx = audioContext();
  if (!ctx) return;

  const voice = VOICES[name];
  const now = ctx.currentTime;
  const seconds = voice.durationMs / 1000;

  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();

  oscillator.type = voice.type;
  oscillator.frequency.setValueAtTime(voice.sweep[0], now);
  if (voice.sweep[0] !== voice.sweep[1]) {
    oscillator.frequency.exponentialRampToValueAtTime(
      voice.sweep[1],
      now + seconds,
    );
  }

  // A short attack and an exponential tail. A raw square edge on either end
  // produces an audible click.
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(voice.gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

  oscillator.connect(amp).connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + seconds + 0.02);
  oscillator.onended = () => {
    oscillator.disconnect();
    amp.disconnect();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isSoundEnabled(),
    () => false,
  );
}
