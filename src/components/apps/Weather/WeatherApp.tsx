"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { useClock } from "@/lib/os/useClock";
import { motion } from "framer-motion";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  Sunrise,
  Sunset,
  Eye,
  Gauge,
} from "lucide-react";

interface WeatherAppProps {
  userId: string;
}

type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy" | "windy";

interface DayForecast {
  day: string;
  condition: WeatherCondition;
  high: number;
  low: number;
  icon: typeof Sun;
}

const FORECASTS: Record<
  WeatherCondition,
  { icon: typeof Sun; color: string; bg: string }
> = {
  sunny: {
    icon: Sun,
    color: "#f59e0b",
    bg: "linear-gradient(135deg, #fbbf24, #f59e0b)",
  },
  cloudy: {
    icon: Cloud,
    color: "#94a3b8",
    bg: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
  },
  rainy: {
    icon: CloudRain,
    color: "#0ea5e9",
    bg: "linear-gradient(135deg, #60a5fa, #0ea5e9)",
  },
  snowy: {
    icon: CloudSnow,
    color: "#cbd5e1",
    bg: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
  },
  windy: {
    icon: Wind,
    color: "#64748b",
    bg: "linear-gradient(135deg, #94a3b8, #64748b)",
  },
};

const WEEKDAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fr: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  zh: ["日", "一", "二", "三", "四", "五", "六"],
};

const CONDITIONS_LABELS: Record<
  WeatherCondition,
  { en: string; fr: string; zh: string }
> = {
  sunny: { en: "Sunny", fr: "Ensoleille", zh: "晴" },
  cloudy: { en: "Cloudy", fr: "Nuageux", zh: "多云" },
  rainy: { en: "Rainy", fr: "Pluvieux", zh: "雨" },
  snowy: { en: "Snowy", fr: "Neigeux", zh: "雪" },
  windy: { en: "Windy", fr: "Venteux", zh: "风" },
};

function generateForecast(): DayForecast[] {
  const conditions: WeatherCondition[] = [
    "sunny",
    "cloudy",
    "rainy",
    "windy",
    "sunny",
    "cloudy",
    "snowy",
  ];
  return Array.from({ length: 7 }).map((_, i) => {
    const cond = conditions[(i + new Date().getDay()) % conditions.length];
    return {
      day: String(i),
      condition: cond,
      high: 15 + Math.floor(Math.random() * 15),
      low: 0 + Math.floor(Math.random() * 10),
      icon: FORECASTS[cond].icon,
    };
  });
}

export function WeatherApp({ userId }: WeatherAppProps) {
  const { t, locale } = useI18n();
  const [currentTemp] = useState(18);
  const [forecast] = useState<DayForecast[]>(generateForecast);
  const now = useClock(60_000);

  void userId;
  void forecast;

  // Derived from the hour rather than mirrored into state by an effect.
  const condition: WeatherCondition = now
    ? (["sunny", "cloudy", "rainy", "snowy", "windy"][
        now.getHours() % 5
      ] as WeatherCondition)
    : "cloudy";

  const weather = FORECASTS[condition];
  const WeatherIcon = weather.icon;
  const weekdays = WEEKDAYS[locale];

  return (
    <div className="h-full overflow-y-auto bg-white/70 dark:bg-slate-950/40">
      {/* Hero section */}
      <div
        className="relative flex flex-col items-center px-6 pt-8 pb-6 text-white"
        style={{ background: weather.bg }}
      >
        <div className="flex items-center gap-1.5 text-sm font-medium opacity-90">
          <MapPin className="h-3.5 w-3.5" />
          {t("weather.location")}
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="my-4"
        >
          <WeatherIcon className="h-20 w-20 drop-shadow-lg" strokeWidth={1.5} />
        </motion.div>

        <div className="flex items-start">
          <motion.span
            key={currentTemp}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            className="text-7xl font-extralight"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {currentTemp}
          </motion.span>
          <span className="mt-2 text-3xl font-light">°</span>
        </div>

        <p className="mt-1 text-lg font-light opacity-90">
          {CONDITIONS_LABELS[condition][locale]}
        </p>
        {now && (
          <p className="mt-0.5 text-xs opacity-70">
            {now.toLocaleTimeString(
              locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
              { hour: "2-digit", minute: "2-digit" },
            )}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-200/70 dark:bg-slate-800/70">
        <StatCard
          icon={<Thermometer className="h-4 w-4" />}
          label={t("weather.feelsLike")}
          value="16°"
        />
        <StatCard
          icon={<Droplets className="h-4 w-4" />}
          label={t("weather.humidity")}
          value="68%"
        />
        <StatCard
          icon={<Wind className="h-4 w-4" />}
          label={t("weather.wind")}
          value="12 km/h"
        />
        <StatCard
          icon={<Gauge className="h-4 w-4" />}
          label="Pressure"
          value="1013 hPa"
        />
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Visibility"
          value="10 km"
        />
        <StatCard
          icon={<Sunrise className="h-4 w-4" />}
          label="Sunrise"
          value="06:24"
        />
      </div>

      {/* Forecast */}
      <div className="border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("weather.forecast")}
        </h3>
        <div className="space-y-1">
          {forecast.map((day, idx) => {
            const DayIcon = day.icon;
            const dayName =
              idx === 0
                ? t("weather.today")
                : weekdays[(new Date().getDay() + idx) % 7];
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
              >
                <span className="w-12 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {dayName}
                </span>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: FORECASTS[day.condition].color + "20" }}
                >
                  <DayIcon
                    className="h-4 w-4"
                    style={{ color: FORECASTS[day.condition].color }}
                  />
                </span>
                <span className="flex-1 text-xs text-slate-400">
                  {CONDITIONS_LABELS[day.condition][locale]}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {day.high}°
                  </span>
                  <span className="text-slate-400">{day.low}°</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sunset */}
      <div className="flex items-center justify-center gap-6 border-t border-slate-200/70 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sunrise className="h-4 w-4 text-amber-400" />
          <span>06:24</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sunset className="h-4 w-4 text-orange-400" />
          <span>20:12</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/70 px-4 py-3 dark:bg-slate-900/40">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {icon}
      </span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}
