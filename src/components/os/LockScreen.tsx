"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n/context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { PublicUser } from "@/lib/types";

interface LockScreenProps {
  user: PublicUser;
  onUnlock: () => void;
}

export function LockScreen({ user, onUnlock }: LockScreenProps) {
  const { t, locale } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showClock, setShowClock] = useState(true);

  const now = new Date();
  const time = now.toLocaleTimeString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
  const date = now.toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US",
    { weekday: "long", month: "long", day: "numeric" },
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: user.username,
          password,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ? t(data.error) : t("login.error"));
        return;
      }
      onUnlock();
    } catch {
      setError(t("login.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onClick={() => setShowClock(false)}
    >
      {/* Ambient background */}
      <motion.div
        className="pointer-events-none absolute -left-20 top-1/4 h-80 w-80 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--accent-spot, #0ea5e9)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-16 bottom-1/4 h-96 w-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--accent-spot, #0ea5e9)" }}
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      <AnimatePresence mode="wait">
        {showClock ? (
          <motion.div
            key="clock"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center"
          >
            <motion.span
              className="text-8xl font-extralight tracking-tighter text-slate-800/90 dark:text-slate-100/90"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {time}
            </motion.span>
            <p className="mt-2 text-lg font-light text-slate-600/80 dark:text-slate-300/80">
              {date}
            </p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 1 }}
              className="mt-8 text-xs font-light text-slate-400"
            >
              {t("lock.unlock")}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.1,
                type: "spring",
                stiffness: 200,
                damping: 18,
              }}
            >
              <Avatar className="h-24 w-24 ring-4 ring-white/30 shadow-2xl dark:ring-white/10">
                <AvatarFallback
                  className="text-2xl font-semibold text-white"
                  style={{ background: user.avatarColor }}
                >
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100"
            >
              {user.displayName}
            </motion.h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              @{user.username}
            </p>

            <form onSubmit={submit} className="mt-6 flex items-center gap-2">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.password")}
                  className="h-11 w-64 rounded-full border-slate-200/80 bg-white/80 pl-10 pr-4 text-center dark:border-slate-700 dark:bg-slate-800/60"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !password}
                size="icon"
                className="h-11 w-11 rounded-full shadow-md"
                style={{
                  background: "var(--accent-spot, #0ea5e9)",
                  color: "white",
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-sm text-rose-500"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
