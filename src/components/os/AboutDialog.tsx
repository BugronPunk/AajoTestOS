"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { X, Cpu, HardDrive, Wifi, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export function AboutDialog({ open, onClose, username }: AboutDialogProps) {
  const { t } = useI18n();
  const [uptime, setUptime] = useState("0s");

  useEffect(() => {
    if (!open) return;
    const start = Date.now();
    const update = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setUptime(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-[9500] flex items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-[420px] overflow-hidden rounded-3xl border border-white/50 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90"
          >
            {/* Header with gradient */}
            <div
              className="relative flex flex-col items-center px-8 pb-6 pt-10"
              style={{
                background:
                  "linear-gradient(180deg, var(--accent-soft, rgba(14,165,233,0.12)) 0%, transparent 100%)",
              }}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Logo */}
              <div
                className="mb-4 flex h-20 w-20 items-center justify-center rounded-[1.5rem] shadow-xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-spot, #0ea5e9), color-mix(in srgb, var(--accent-spot, #0ea5e9) 55%, white))",
                }}
              >
                <span className="text-4xl font-extralight text-white">A</span>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                {t("app.name")}
              </h2>
              <p className="mt-1 text-sm font-light text-slate-500 dark:text-slate-400">
                Version 1.0 · Build 2024.08
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {t("app.tagline")}
              </p>
            </div>

            {/* System info */}
            <div className="space-y-3 px-8 py-6">
              <InfoRow
                icon={<Cpu className="h-4 w-4 text-slate-400" />}
                label="Processor"
                value="AajoTest Virtual Core"
              />
              <InfoRow
                icon={<HardDrive className="h-4 w-4 text-slate-400" />}
                label="Storage"
                value="JSON File System"
              />
              <InfoRow
                icon={<Wifi className="h-4 w-4 text-slate-400" />}
                label="Network"
                value="Socket.io Realtime"
              />
              <InfoRow
                icon={<Clock className="h-4 w-4 text-slate-400" />}
                label="Session uptime"
                value={uptime}
              />
              <div className="h-px bg-slate-200/70 dark:bg-slate-700/70" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Signed in as</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  @{username}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200/70 px-8 py-4 text-center dark:border-slate-700/70">
              <p className="text-[11px] font-light text-slate-400">
                Built with Next.js 16 · React 19 · TypeScript
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        {icon}
      </span>
      <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}
