"use client";

import { useI18n } from "@/lib/i18n/context";
import { useOsStore } from "@/lib/os/store";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, Bluetooth, Plane, Sun, Volume2, VolumeX, X } from "lucide-react";
import { useSoundEnabled, setSoundEnabled } from "@/lib/os/audio";
import { useEffect, useState } from "react";

export function ControlCenter() {
  const { t } = useI18n();
  const open = useOsStore((s) => s.controlCenterOpen);
  const setOpen = useOsStore((s) => s.setControlCenter);
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [airplane, setAirplane] = useState(false);
  const [brightness, setBrightness] = useState(85);
  const [volume, setVolume] = useState(60);
  // Off by default. Reads through to localStorage so the choice sticks per
  // browser without needing an account setting.
  const soundOn = useSoundEnabled();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-[9100] bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-3 top-11 z-[9200] w-72 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("menu.system")}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ToggleTile
                active={wifi}
                onClick={() => setWifi((v) => !v)}
                icon={<Wifi className="h-4 w-4" />}
                label={t("control.wifi")}
              />
              <ToggleTile
                active={bluetooth}
                onClick={() => setBluetooth((v) => !v)}
                icon={<Bluetooth className="h-4 w-4" />}
                label={t("control.bluetooth")}
              />
              <ToggleTile
                active={soundOn}
                onClick={() => setSoundEnabled(!soundOn)}
                icon={
                  soundOn ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )
                }
                label={t("control.sound")}
              />
            </div>
            <button
              onClick={() => setAirplane((v) => !v)}
              className={`mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                airplane
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  : "bg-slate-100/80 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                {t("control.airplane")}
              </span>
              <span
                className={`h-4 w-7 rounded-full p-0.5 transition ${
                  airplane ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition ${
                    airplane ? "translate-x-3" : ""
                  }`}
                />
              </span>
            </button>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <Sun className="h-3.5 w-3.5" />
                  {t("control.brightness")}
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <Volume2 className="h-3.5 w-3.5" />
                  {t("control.volume")}
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-400">
              {t("app.name")} · v1.0
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ToggleTile({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition ${
        active
          ? "text-white shadow-sm"
          : "bg-slate-100/80 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
      }`}
      style={active ? { background: "var(--accent-spot, #0ea5e9)" } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
