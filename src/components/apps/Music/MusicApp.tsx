"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  Music as MusicIcon,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scrollArea";

interface MusicAppProps {
  userId: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  color: string;
}

const PLAYLIST: Track[] = [
  {
    id: "t1",
    title: "Aurora Dawn",
    artist: "Ambient Worlds",
    duration: 215,
    color: "#0ea5e9",
  },
  {
    id: "t2",
    title: "Calm Horizon",
    artist: "Serene Sounds",
    duration: 184,
    color: "#10b981",
  },
  {
    id: "t3",
    title: "Misty Morning",
    artist: "Forest Echo",
    duration: 252,
    color: "#8b5cf6",
  },
  {
    id: "t4",
    title: "Golden Hour",
    artist: "Sunset Collective",
    duration: 198,
    color: "#f59e0b",
  },
  {
    id: "t5",
    title: "Deep Focus",
    artist: "Mindful Audio",
    duration: 324,
    color: "#f43f5e",
  },
  {
    id: "t6",
    title: "Night Rain",
    artist: "Weather Sounds",
    duration: 287,
    color: "#14b8a6",
  },
  {
    id: "t7",
    title: "Ocean Waves",
    artist: "Coastal Drift",
    duration: 301,
    color: "#6366f1",
  },
  {
    id: "t8",
    title: "City Lights",
    artist: "Urban Pulse",
    duration: 176,
    color: "#ec4899",
  },
];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + s.toString().padStart(2, "0");
}

export function MusicApp({ userId }: MusicAppProps) {
  const { t } = useI18n();
  const [currentTrack, setCurrentTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(70);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  void userId;

  const track = PLAYLIST[currentTrack];

  const playNext = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTrack((prev) => {
      if (shuffle) {
        const next = Math.floor(Math.random() * PLAYLIST.length);
        return next === prev ? (next + 1) % PLAYLIST.length : next;
      }
      return (prev + 1) % PLAYLIST.length;
    });
    setTimeout(() => setPlaying(true), 100);
  }, [shuffle]);

  const playPrev = useCallback(() => {
    setProgress(0);
    setCurrentTrack((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= track.duration) {
            if (repeat) return 0;
            playNext();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, track.duration, repeat, playNext]);

  const togglePlay = () => setPlaying((p) => !p);

  const selectTrack = (idx: number) => {
    setCurrentTrack(idx);
    setProgress(0);
    setPlaying(true);
  };

  return (
    <div className="flex h-full flex-col bg-white/70 dark:bg-slate-950/40">
      {/* Album art + info */}
      <div className="relative flex flex-col items-center px-6 pt-6 pb-4">
        <motion.div
          key={track.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative h-40 w-40 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${track.color}, ${track.color}99)`,
          }}
        >
          {/* Animated visualizer bars */}
          <div className="absolute inset-0 flex items-end justify-center gap-1 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-2 rounded-full bg-white/40"
                animate={
                  playing ? { height: [20, 60, 30, 80, 40] } : { height: 20 }
                }
                transition={{
                  duration: 0.8,
                  repeat: playing ? Infinity : 0,
                  delay: i * 0.05,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <MusicIcon className="h-4 w-4 text-white" />
          </div>
        </motion.div>

        <div className="mt-4 text-center">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {track.title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-2">
        <div className="flex items-center gap-2">
          <span
            className="w-10 text-right text-[11px] text-slate-400"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatTime(progress)}
          </span>
          <Slider
            value={[progress]}
            max={track.duration}
            step={1}
            onValueChange={(v) => setProgress(v[0])}
            className="flex-1"
          />
          <span
            className="w-10 text-[11px] text-slate-400"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatTime(track.duration)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-3">
        <button
          onClick={() => setShuffle((s) => !s)}
          className={`rounded-lg p-2 transition ${shuffle ? "text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
          style={
            shuffle ? { background: "var(--accent-spot, #0ea5e9)" } : undefined
          }
          title={t("music.shuffle")}
        >
          <Shuffle className="h-4 w-4" />
        </button>
        <button
          onClick={playPrev}
          className="rounded-lg p-2 text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          title={t("music.previous")}
        >
          <SkipBack className="h-5 w-5" />
        </button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={togglePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: "var(--accent-spot, #0ea5e9)" }}
        >
          {playing ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 translate-x-0.5" />
          )}
        </motion.button>
        <button
          onClick={playNext}
          className="rounded-lg p-2 text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          title={t("music.next")}
        >
          <SkipForward className="h-5 w-5" />
        </button>
        <button
          onClick={() => setRepeat((r) => !r)}
          className={`rounded-lg p-2 transition ${repeat ? "text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
          style={
            repeat ? { background: "var(--accent-spot, #0ea5e9)" } : undefined
          }
          title={t("music.repeat")}
        >
          <Repeat className="h-4 w-4" />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 px-6 py-1">
        <Volume2 className="h-4 w-4 text-slate-400" />
        <Slider
          value={[volume]}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(v[0])}
          className="flex-1"
        />
        <span className="w-8 text-[11px] text-slate-400">{volume}%</span>
      </div>

      {/* Playlist */}
      <div className="flex items-center justify-between border-t border-slate-200/70 px-4 py-2 dark:border-slate-800">
        <span className="text-xs font-medium text-slate-500">
          {t("music.playlist")}
        </span>
        <span className="text-[11px] text-slate-400">
          {PLAYLIST.length} tracks
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {PLAYLIST.map((tr, idx) => (
            <button
              key={tr.id}
              onClick={() => selectTrack(idx)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                idx === currentTrack
                  ? "bg-slate-100 dark:bg-slate-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-900/40"
              }`}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                style={{ background: tr.color }}
              >
                {idx === currentTrack && playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[13px] font-medium ${idx === currentTrack ? "" : "text-slate-700 dark:text-slate-200"}`}
                  style={
                    idx === currentTrack
                      ? { color: "var(--accent-spot, #0ea5e9)" }
                      : undefined
                  }
                >
                  {tr.title}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {tr.artist}
                </p>
              </div>
              <span
                className="text-[11px] text-slate-400"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatTime(tr.duration)}
              </span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
