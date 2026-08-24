"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useClock } from "@/lib/os/useClock";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  RotateCcw,
  Flag,
  Plus,
  Trash2,
  Clock as ClockIcon,
} from "lucide-react";

interface ClockAppProps {
  userId: string;
}

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

const WORLD_CITIES = [
  { city: "Tokyo", tz: "Asia/Tokyo", en: "Tokyo", fr: "Tokyo", zh: "东京" },
  {
    city: "London",
    tz: "Europe/London",
    en: "London",
    fr: "Londres",
    zh: "伦敦",
  },
  {
    city: "New York",
    tz: "America/New_York",
    en: "New York",
    fr: "New York",
    zh: "纽约",
  },
  { city: "Paris", tz: "Europe/Paris", en: "Paris", fr: "Paris", zh: "巴黎" },
  {
    city: "Sydney",
    tz: "Australia/Sydney",
    en: "Sydney",
    fr: "Sydney",
    zh: "悉尼",
  },
  {
    city: "Shanghai",
    tz: "Asia/Shanghai",
    en: "Shanghai",
    fr: "Shanghai",
    zh: "上海",
  },
];

function getCityName(c: (typeof WORLD_CITIES)[0], locale: string): string {
  return c[locale as "en" | "fr" | "zh"] || c.en;
}

export function ClockApp({ userId }: ClockAppProps) {
  const { t, locale } = useI18n();
  // Clock face needs second resolution; everything else on the shared timer.
  const now = useClock(1000);
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [timerInput, setTimerInput] = useState(300);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [alarms, setAlarms] = useState<Alarm[]>([
    { id: "a1", time: "07:00", label: "Morning", enabled: true },
    { id: "a2", time: "22:30", label: "Bedtime", enabled: false },
  ]);
  const [newAlarmTime, setNewAlarmTime] = useState("08:00");
  const [newAlarmLabel, setNewAlarmLabel] = useState("");

  const swInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  void userId;

  useEffect(() => {
    if (stopwatchRunning) {
      const start = Date.now() - stopwatchMs;
      swInterval.current = setInterval(() => {
        setStopwatchMs(Date.now() - start);
      }, 10);
    } else if (swInterval.current) {
      clearInterval(swInterval.current);
    }
    return () => {
      if (swInterval.current) clearInterval(swInterval.current);
    };
  }, [stopwatchRunning]);

  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerInterval.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [timerRunning, timerRemaining]);

  const formatStopwatch = useCallback((ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }, []);

  const formatTimer = useCallback((sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  const toggleStopwatch = () => setStopwatchRunning((r) => !r);
  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchMs(0);
    setLaps([]);
  };
  const addLap = () => {
    if (stopwatchRunning) setLaps((prev) => [stopwatchMs, ...prev]);
  };

  const startTimer = () => {
    if (timerRemaining === 0) setTimerRemaining(timerInput);
    setTimerRunning((r) => !r);
  };
  const resetTimer = () => {
    setTimerRunning(false);
    setTimerRemaining(0);
  };

  const addAlarm = () => {
    if (!newAlarmTime) return;
    setAlarms((prev) => [
      ...prev,
      {
        id: "a" + Date.now(),
        time: newAlarmTime,
        label: newAlarmLabel || "Alarm",
        enabled: true,
      },
    ]);
    setNewAlarmLabel("");
  };
  const toggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
  };
  const deleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  if (!now) return null;

  const localTime = now.toLocaleTimeString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { hour: "2-digit", minute: "2-digit", second: "2-digit" },
  );
  const localDate = now.toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="h-full bg-white/70 dark:bg-slate-950/40">
      <Tabs defaultValue="world" className="h-full">
        <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-800">
          <div className="mb-2 flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("clock.title")}
            </h2>
          </div>
          <TabsList className="grid h-9 w-full grid-cols-4">
            <TabsTrigger value="world" className="text-[11px]">
              {t("clock.worldClock")}
            </TabsTrigger>
            <TabsTrigger value="alarms" className="text-[11px]">
              {t("clock.alarms")}
            </TabsTrigger>
            <TabsTrigger value="stopwatch" className="text-[11px]">
              {t("clock.stopwatch")}
            </TabsTrigger>
            <TabsTrigger value="timer" className="text-[11px]">
              {t("clock.timer")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* World Clock */}
        <TabsContent value="world" className="m-0 overflow-y-auto p-4">
          <div className="mb-4 text-center">
            <motion.p
              key={localTime}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="text-4xl font-extralight tabular-nums text-slate-800 dark:text-slate-100"
            >
              {localTime}
            </motion.p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {localDate}
            </p>
          </div>
          <div className="space-y-2">
            {WORLD_CITIES.map((c) => {
              const cityTime = now.toLocaleTimeString(
                locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
                { timeZone: c.tz, hour: "2-digit", minute: "2-digit" },
              );
              return (
                <div
                  key={c.city}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {getCityName(c, locale)}
                  </span>
                  <span className="text-lg font-light tabular-nums text-slate-800 dark:text-slate-100">
                    {cityTime}
                  </span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Alarms */}
        <TabsContent value="alarms" className="m-0 overflow-y-auto p-4">
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200/70 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={newAlarmTime}
                onChange={(e) => setNewAlarmTime(e.target.value)}
                className="h-9 flex-1 rounded-lg"
              />
              <Input
                value={newAlarmLabel}
                onChange={(e) => setNewAlarmLabel(e.target.value)}
                placeholder="Label"
                className="h-9 flex-1 rounded-lg"
              />
              <Button
                onClick={addAlarm}
                size="icon"
                className="h-9 w-9 rounded-lg"
                style={{
                  background: "var(--accent-spot, #0ea5e9)",
                  color: "white",
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {alarms.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <ClockIcon className="h-8 w-8 opacity-40" />
              <p className="text-xs">{t("clock.noAlarms")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alarms.map((a) => (
                <div
                  key={a.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <div className={a.enabled ? "" : "opacity-40"}>
                    <p className="text-2xl font-light tabular-nums text-slate-800 dark:text-slate-100">
                      {a.time}
                    </p>
                    <p className="text-xs text-slate-400">{a.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAlarm(a.id)}
                      className={`relative h-6 w-11 rounded-full transition ${
                        a.enabled ? "" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                      style={
                        a.enabled
                          ? { background: "var(--accent-spot, #0ea5e9)" }
                          : undefined
                      }
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                          a.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteAlarm(a.id)}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Stopwatch */}
        <TabsContent
          value="stopwatch"
          className="m-0 flex flex-col items-center p-4"
        >
          <motion.p
            key={Math.floor(stopwatchMs / 100)}
            initial={{ scale: 1.01 }}
            animate={{ scale: 1 }}
            className="my-8 text-5xl font-extralight tabular-nums text-slate-800 dark:text-slate-100"
          >
            {formatStopwatch(stopwatchMs)}
          </motion.p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={resetStopwatch}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleStopwatch}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: "var(--accent-spot, #0ea5e9)" }}
            >
              {stopwatchRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 translate-x-0.5" />
              )}
            </motion.button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={addLap}
              disabled={!stopwatchRunning}
            >
              <Flag className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-6 w-full max-w-xs space-y-1">
            {laps.map((lap, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-slate-100/50 px-3 py-1.5 text-xs dark:bg-slate-800/50"
              >
                <span className="text-slate-400">Lap {laps.length - idx}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {formatStopwatch(lap)}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Timer */}
        <TabsContent
          value="timer"
          className="m-0 flex flex-col items-center p-4"
        >
          <motion.p
            key={Math.floor(timerRemaining / 60)}
            initial={{ scale: 1.01 }}
            animate={{ scale: 1 }}
            className={`my-8 text-5xl font-extralight tabular-nums ${
              timerRemaining === 0 && timerInput > 0
                ? "text-slate-400"
                : "text-slate-800 dark:text-slate-100"
            }`}
          >
            {formatTimer(timerRemaining || timerInput)}
          </motion.p>
          <div className="mb-6 flex gap-2">
            {[60, 300, 600, 900].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setTimerInput(sec);
                  setTimerRemaining(0);
                  setTimerRunning(false);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  timerInput === sec
                    ? "text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
                style={
                  timerInput === sec
                    ? { background: "var(--accent-spot, #0ea5e9)" }
                    : undefined
                }
              >
                {sec < 60 ? sec + "s" : sec / 60 + "m"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={resetTimer}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startTimer}
              className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: "var(--accent-spot, #0ea5e9)" }}
            >
              {timerRunning ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 translate-x-0.5" />
              )}
            </motion.button>
          </div>
          <AnimatePresence>
            {timerRemaining === 0 && timerInput > 0 && !timerRunning && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-xs text-slate-400"
              >
                Ready to start
              </motion.p>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
