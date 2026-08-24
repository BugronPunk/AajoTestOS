"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";

export function BootScreen() {
  const { t } = useI18n();
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-10 overflow-hidden bg-white/50 backdrop-blur-2xl dark:bg-black/50">
      {/* Ambient floating orbs for depth */}
      <motion.div
        className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--accent-spot, #0ea5e9)" }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-80 w-80 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent-spot, #0ea5e9)" }}
        animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Logo with layered glow */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
      >
        {/* Pulsing outer ring */}
        <motion.div
          className="absolute -inset-6 rounded-[2rem]"
          style={{
            background:
              "radial-gradient(circle, var(--accent-soft, rgba(14,165,233,0.2)) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Rotating border ring */}
        <motion.div
          className="absolute -inset-3 rounded-[1.75rem]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, var(--accent-spot, #0ea5e9) 90deg, transparent 180deg, var(--accent-spot, #0ea5e9) 270deg, transparent 360deg)`,
            opacity: 0.35,
            maskImage: "linear-gradient(transparent, black, transparent)",
            WebkitMaskImage: "linear-gradient(transparent, black, transparent)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Logo tile */}
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-[1.5rem] shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-spot, #0ea5e9), color-mix(in srgb, var(--accent-spot, #0ea5e9) 55%, white))",
          }}
        >
          <span className="text-4xl font-extralight tracking-tight text-white drop-shadow">
            A
          </span>
          {/* Inner highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-br from-white/30 to-transparent" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          {t("app.name")}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-2 text-sm font-light text-slate-500 dark:text-slate-400"
        >
          {t("boot.starting")}
        </motion.p>
      </motion.div>

      {/* Progress bar with shimmer */}
      <div className="relative h-1 w-48 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/50">
        <motion.div
          className="relative h-full rounded-full"
          style={{ background: "var(--accent-spot, #0ea5e9)" }}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.1, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-8 text-[11px] font-light tracking-wide text-slate-400 dark:text-slate-500"
      >
        {t("boot.preparing")}
      </motion.p>
    </div>
  );
}
