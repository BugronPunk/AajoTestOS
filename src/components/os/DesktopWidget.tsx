"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { useClock } from "@/lib/os/useClock";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets } from "lucide-react";

const DAYS = [
  "clock.sunday",
  "clock.monday",
  "clock.tuesday",
  "clock.wednesday",
  "clock.thursday",
  "clock.friday",
  "clock.saturday",
];

const MONTHS = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  fr: [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ],
  zh: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
};

// Simulated weather states that cycle for a calm, living desktop.
const WEATHER_STATES = [
  {
    icon: Sun,
    temp: 22,
    label: { en: "Sunny", fr: "Ensoleillé", zh: "晴" },
    color: "#f59e0b",
  },
  {
    icon: Cloud,
    temp: 18,
    label: { en: "Cloudy", fr: "Nuageux", zh: "多云" },
    color: "#94a3b8",
  },
  {
    icon: CloudRain,
    temp: 15,
    label: { en: "Rainy", fr: "Pluvieux", zh: "雨" },
    color: "#0ea5e9",
  },
  {
    icon: CloudSnow,
    temp: -2,
    label: { en: "Snowy", fr: "Neigeux", zh: "雪" },
    color: "#cbd5e1",
  },
  {
    icon: Wind,
    temp: 12,
    label: { en: "Windy", fr: "Venteux", zh: "风" },
    color: "#64748b",
  },
] as const;

export function DesktopWidget() {
  const { t, locale } = useI18n();
  const now = useClock(60_000);

  if (!now) return null;

  // Derived from the hour so it stays stable through a session instead of
  // living in state that only ever gets written once.
  const weatherIdx = now.getHours() % WEATHER_STATES.length;

  const time = now.toLocaleTimeString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
  const months = MONTHS[locale];
  const weekday = t(DAYS[now.getDay()]);
  const weather = WEATHER_STATES[weatherIdx];
  const WeatherIcon = weather.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
      className="pointer-events-none absolute left-8 top-16 z-[1] hidden lg:block"
    >
      {/* Clock */}
      <div className="flex flex-col">
        <motion.span
          key={time}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          className="text-7xl font-extralight tracking-tighter text-slate-800/90 dark:text-slate-100/90 drop-shadow-sm"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {time}
        </motion.span>
        <p className="mt-1 text-lg font-light text-slate-600/80 dark:text-slate-300/80">
          {weekday}, {months[now.getMonth()]} {now.getDate()}
        </p>
      </div>

      {/* Weather widget card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-6 flex items-center gap-4 rounded-2xl border border-white/40 bg-white/40 px-5 py-3.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/30"
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: weather.color + "20" }}
        >
          <WeatherIcon className="h-6 w-6" style={{ color: weather.color }} />
        </motion.div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-light text-slate-800 dark:text-slate-100">
              {weather.temp}°
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {weather.label[locale]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              {weatherIdx === 2 ? "78%" : "45%"}
            </span>
            <span>AajoTest City</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
